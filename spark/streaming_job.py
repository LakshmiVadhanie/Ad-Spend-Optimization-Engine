"""
Spark Structured Streaming Job
Consumes ad_events, impressions, conversions from Kafka
→ Applies micro-batch transformations
→ Writes aggregated data to BigQuery (raw + hourly rollups)

Run:
    spark-submit \
      --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.4.0,\
                 com.google.cloud.spark:spark-bigquery-with-dependencies_2.12:0.34.0 \
      streaming_job.py
"""

import os
import logging
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType,
    IntegerType, TimestampType
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Config ──────────────────────────────────────────────────────────────────
KAFKA_SERVERS  = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
GCP_PROJECT    = os.getenv("GCP_PROJECT_ID", "your-project-id")
BQ_DATASET     = os.getenv("GCP_DATASET_ID", "ad_spend_raw")
CREDENTIALS    = os.getenv("GCP_CREDENTIALS_PATH", "./secrets/gcp-service-account.json")
CHECKPOINT_DIR = os.getenv("SPARK_CHECKPOINT_DIR", "/tmp/spark-checkpoints")

# ─── Schemas ─────────────────────────────────────────────────────────────────
AD_EVENT_SCHEMA = StructType([
    StructField("event_id",      StringType(),    True),
    StructField("event_type",    StringType(),    True),
    StructField("timestamp",     StringType(),    True),
    StructField("campaign_id",   StringType(),    True),
    StructField("campaign_name", StringType(),    True),
    StructField("platform",      StringType(),    True),
    StructField("ad_format",     StringType(),    True),
    StructField("country",       StringType(),    True),
    StructField("device",        StringType(),    True),
    StructField("impressions",   IntegerType(),   True),
    StructField("clicks",        IntegerType(),   True),
    StructField("conversions",   IntegerType(),   True),
    StructField("spend_usd",     DoubleType(),    True),
    StructField("revenue_usd",   DoubleType(),    True),
    StructField("cpm",           DoubleType(),    True),
    StructField("cpc",           DoubleType(),    True),
    StructField("roas",          DoubleType(),    True),
])


def create_spark_session() -> SparkSession:
    return (
        SparkSession.builder
        .appName("AdSpendOptimizer")
        .config("spark.sql.adaptive.enabled", "true")
        .config("spark.sql.streaming.checkpointLocation", CHECKPOINT_DIR)
        .config("spark.hadoop.google.cloud.auth.service.account.enable", "true")
        .config("spark.hadoop.google.cloud.auth.service.account.json.keyfile", CREDENTIALS)
        .config("parentProject", GCP_PROJECT)
        .getOrCreate()
    )


def read_kafka_stream(spark: SparkSession, topics: str):
    return (
        spark.readStream
        .format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_SERVERS)
        .option("subscribe", topics)
        .option("startingOffsets", "latest")
        .option("maxOffsetsPerTrigger", 10000)
        .option("kafka.group.id", "spark-ad-spend-consumer")
        .load()
    )


def parse_events(raw_df):
    return (
        raw_df
        .select(
            F.col("key").cast("string").alias("kafka_key"),
            F.from_json(F.col("value").cast("string"), AD_EVENT_SCHEMA).alias("data"),
            F.col("timestamp").alias("kafka_timestamp"),
            F.col("topic"),
            F.col("partition"),
            F.col("offset"),
        )
        .select(
            "kafka_key", "kafka_timestamp", "topic", "partition", "offset",
            "data.*"
        )
        .withColumn("event_ts", F.to_timestamp(F.col("timestamp")))
        .withColumn("ingested_at", F.current_timestamp())
        .withColumn("date_partition", F.to_date(F.col("event_ts")))
    )


def write_raw_to_bq(parsed_df, table: str):
    """Write raw events to BigQuery (append only)."""
    return (
        parsed_df.writeStream
        .format("bigquery")
        .option("table", f"{GCP_PROJECT}:{BQ_DATASET}.{table}")
        .option("temporaryGcsBucket", f"{GCP_PROJECT}-spark-temp")
        .option("checkpointLocation", f"{CHECKPOINT_DIR}/{table}")
        .outputMode("append")
        .trigger(processingTime="30 seconds")
        .start()
    )


def compute_hourly_aggregates(parsed_df):
    """
    5-minute micro-batch rollups for near-real-time ROAS visibility.
    Groups by platform + campaign + 1-hour window.
    """
    return (
        parsed_df
        .withWatermark("event_ts", "10 minutes")
        .groupBy(
            F.window("event_ts", "1 hour", "5 minutes"),
            "platform",
            "campaign_id",
            "campaign_name",
            "country",
            "device",
        )
        .agg(
            F.sum("impressions").alias("total_impressions"),
            F.sum("clicks").alias("total_clicks"),
            F.sum("conversions").alias("total_conversions"),
            F.sum("spend_usd").alias("total_spend_usd"),
            F.sum("revenue_usd").alias("total_revenue_usd"),
            F.avg("cpm").alias("avg_cpm"),
            F.avg("cpc").alias("avg_cpc"),
            # ROAS = revenue / spend
            F.when(F.sum("spend_usd") > 0,
                   F.sum("revenue_usd") / F.sum("spend_usd")
            ).otherwise(0.0).alias("roas"),
            # CTR = clicks / impressions
            F.when(F.sum("impressions") > 0,
                   F.sum("clicks") / F.sum("impressions")
            ).otherwise(0.0).alias("ctr"),
            # CVR = conversions / clicks
            F.when(F.sum("clicks") > 0,
                   F.sum("conversions") / F.sum("clicks")
            ).otherwise(0.0).alias("cvr"),
            F.count("*").alias("event_count"),
        )
        .select(
            F.col("window.start").alias("window_start"),
            F.col("window.end").alias("window_end"),
            "*"
        )
        .drop("window")
    )


def write_aggregates_to_bq(agg_df, table: str):
    return (
        agg_df.writeStream
        .format("bigquery")
        .option("table", f"{GCP_PROJECT}:{BQ_DATASET}.{table}")
        .option("temporaryGcsBucket", f"{GCP_PROJECT}-spark-temp")
        .option("checkpointLocation", f"{CHECKPOINT_DIR}/{table}")
        .outputMode("append")
        .trigger(processingTime="5 minutes")
        .start()
    )


def compute_funnel_metrics(parsed_df):
    """Track funnel stages per campaign to surface drop-off."""
    return (
        parsed_df
        .withWatermark("event_ts", "15 minutes")
        .groupBy(
            F.window("event_ts", "1 hour"),
            "campaign_id",
            "platform",
            "event_type",
        )
        .agg(F.count("event_id").alias("event_count"))
        .select(
            F.col("window.start").alias("window_start"),
            "campaign_id", "platform", "event_type", "event_count"
        )
    )


def main():
    spark = create_spark_session()
    spark.sparkContext.setLogLevel("WARN")
    logger.info("✅ Spark session created")

    # Read all ad event topics
    raw_stream = read_kafka_stream(spark, "ad_events,impressions,conversions")
    parsed_df  = parse_events(raw_stream)

    # ── Stream 1: Raw events → BQ ────────────────────────────
    raw_query = write_raw_to_bq(parsed_df, "raw_ad_events")
    logger.info("📥 Raw events stream started")

    # ── Stream 2: Hourly aggregates → BQ ─────────────────────
    hourly_df    = compute_hourly_aggregates(parsed_df)
    hourly_query = write_aggregates_to_bq(hourly_df, "hourly_campaign_metrics")
    logger.info("📊 Hourly aggregates stream started")

    # ── Stream 3: Funnel metrics → BQ ────────────────────────
    funnel_df    = compute_funnel_metrics(parsed_df)
    funnel_query = write_aggregates_to_bq(funnel_df, "funnel_stage_counts")
    logger.info("🔁 Funnel metrics stream started")

    # Console monitoring (dev only)
    if os.getenv("SPARK_DEBUG", "false").lower() == "true":
        debug_query = (
            hourly_df.writeStream
            .format("console")
            .outputMode("append")
            .option("truncate", False)
            .trigger(processingTime="30 seconds")
            .start()
        )

    logger.info("🚀 All streaming queries running. Awaiting termination...")
    spark.streams.awaitAnyTermination()


if __name__ == "__main__":
    main()
