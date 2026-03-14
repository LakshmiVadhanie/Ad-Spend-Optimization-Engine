"""
BigQuery Schema Setup Script
Creates datasets and tables for the Ad Spend Optimizer pipeline.

Run:
    python bigquery/setup_schema.py
"""

import os
import sys

try:
    from google.cloud import bigquery
    from google.api_core.exceptions import Conflict
except ImportError:
    print("❌  google-cloud-bigquery not installed. Run: pip install google-cloud-bigquery")
    sys.exit(1)

PROJECT_ID     = os.getenv("GCP_PROJECT_ID", "your-project-id")
CREDENTIALS    = os.getenv("GCP_CREDENTIALS_PATH", "./secrets/gcp-service-account.json")
RAW_DATASET    = "ad_spend_raw"
DBT_DATASET    = "ad_spend_dbt"
LOCATION       = "US"

client = bigquery.Client(project=PROJECT_ID)


def create_dataset(dataset_id: str):
    dataset_ref = bigquery.Dataset(f"{PROJECT_ID}.{dataset_id}")
    dataset_ref.location = LOCATION
    try:
        client.create_dataset(dataset_ref, timeout=30)
        print(f"✅  Dataset '{dataset_id}' created.")
    except Conflict:
        print(f"ℹ️   Dataset '{dataset_id}' already exists.")


RAW_EVENTS_SCHEMA = [
    bigquery.SchemaField("event_id",       "STRING",    "REQUIRED"),
    bigquery.SchemaField("event_type",     "STRING",    "REQUIRED"),
    bigquery.SchemaField("timestamp",      "STRING",    "NULLABLE"),
    bigquery.SchemaField("ingested_at",    "TIMESTAMP", "NULLABLE"),
    bigquery.SchemaField("date_partition", "DATE",      "NULLABLE"),
    bigquery.SchemaField("campaign_id",    "STRING",    "NULLABLE"),
    bigquery.SchemaField("campaign_name",  "STRING",    "NULLABLE"),
    bigquery.SchemaField("platform",       "STRING",    "NULLABLE"),
    bigquery.SchemaField("ad_format",      "STRING",    "NULLABLE"),
    bigquery.SchemaField("country",        "STRING",    "NULLABLE"),
    bigquery.SchemaField("device",         "STRING",    "NULLABLE"),
    bigquery.SchemaField("impressions",    "INTEGER",   "NULLABLE"),
    bigquery.SchemaField("clicks",         "INTEGER",   "NULLABLE"),
    bigquery.SchemaField("conversions",    "INTEGER",   "NULLABLE"),
    bigquery.SchemaField("spend_usd",      "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("revenue_usd",    "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("cpm",            "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("cpc",            "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("roas",           "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("kafka_key",      "STRING",    "NULLABLE"),
    bigquery.SchemaField("topic",          "STRING",    "NULLABLE"),
    bigquery.SchemaField("partition",      "INTEGER",   "NULLABLE"),
    bigquery.SchemaField("offset",         "INTEGER",   "NULLABLE"),
]

HOURLY_METRICS_SCHEMA = [
    bigquery.SchemaField("window_start",       "TIMESTAMP", "REQUIRED"),
    bigquery.SchemaField("window_end",         "TIMESTAMP", "REQUIRED"),
    bigquery.SchemaField("platform",           "STRING",    "NULLABLE"),
    bigquery.SchemaField("campaign_id",        "STRING",    "NULLABLE"),
    bigquery.SchemaField("campaign_name",      "STRING",    "NULLABLE"),
    bigquery.SchemaField("country",            "STRING",    "NULLABLE"),
    bigquery.SchemaField("device",             "STRING",    "NULLABLE"),
    bigquery.SchemaField("total_impressions",  "INTEGER",   "NULLABLE"),
    bigquery.SchemaField("total_clicks",       "INTEGER",   "NULLABLE"),
    bigquery.SchemaField("total_conversions",  "INTEGER",   "NULLABLE"),
    bigquery.SchemaField("total_spend_usd",    "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("total_revenue_usd",  "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("avg_cpm",            "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("avg_cpc",            "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("roas",               "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("ctr",                "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("cvr",                "FLOAT64",   "NULLABLE"),
    bigquery.SchemaField("event_count",        "INTEGER",   "NULLABLE"),
]

FUNNEL_SCHEMA = [
    bigquery.SchemaField("window_start",  "TIMESTAMP", "REQUIRED"),
    bigquery.SchemaField("campaign_id",   "STRING",    "NULLABLE"),
    bigquery.SchemaField("platform",      "STRING",    "NULLABLE"),
    bigquery.SchemaField("event_type",    "STRING",    "NULLABLE"),
    bigquery.SchemaField("event_count",   "INTEGER",   "NULLABLE"),
]


def create_table(dataset_id: str, table_id: str, schema: list,
                 partition_field: str | None = None):
    table_ref = f"{PROJECT_ID}.{dataset_id}.{table_id}"
    table = bigquery.Table(table_ref, schema=schema)

    if partition_field:
        table.time_partitioning = bigquery.TimePartitioning(
            type_=bigquery.TimePartitioningType.DAY,
            field=partition_field,
        )
        table.clustering_fields = ["platform", "campaign_id"]

    try:
        client.create_table(table, exists_ok=True)
        print(f"✅  Table '{table_id}' ready in '{dataset_id}'.")
    except Exception as e:
        print(f"❌  Error creating '{table_id}': {e}")


def main():
    print(f"\n🔧  Setting up BigQuery schemas for project: {PROJECT_ID}\n")

    # Datasets
    create_dataset(RAW_DATASET)
    create_dataset(DBT_DATASET)

    # Raw tables (written by Spark)
    create_table(RAW_DATASET, "raw_ad_events",          RAW_EVENTS_SCHEMA,     "ingested_at")
    create_table(RAW_DATASET, "hourly_campaign_metrics", HOURLY_METRICS_SCHEMA, "window_start")
    create_table(RAW_DATASET, "funnel_stage_counts",    FUNNEL_SCHEMA,         "window_start")

    print("\n✨  BigQuery setup complete!\n")
    print("Next steps:")
    print("  1. Run: cd dbt && dbt run")
    print("  2. Run: python kafka/producer/producer.py")
    print("  3. Run: spark-submit spark/streaming_job.py")


if __name__ == "__main__":
    main()
