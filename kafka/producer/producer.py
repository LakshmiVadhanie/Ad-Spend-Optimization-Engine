"""
Ad Spend Event Producer
Simulates 100K+ events/hour from Meta, Google, TikTok ad platforms.
Publishes to Kafka topics: ad_events, impressions, conversions
"""

import json
import time
import random
import uuid
import logging
from datetime import datetime, timezone
from typing import Any

from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient, NewTopic

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ─── Config ─────────────────────────────────────────────────────────────────
BOOTSTRAP_SERVERS = "localhost:9092"
TOPICS = ["ad_events", "impressions", "conversions"]
EVENTS_PER_SECOND = 28  # ~100K/hour

# ─── Dimension Tables (in-memory) ────────────────────────────────────────────
PLATFORMS = ["meta", "google", "tiktok", "snapchat", "pinterest"]
CAMPAIGNS = [
    {"id": "camp_001", "name": "Q1 Brand Awareness", "platform": "meta",    "budget": 50000},
    {"id": "camp_002", "name": "Retargeting Spring",  "platform": "google",  "budget": 30000},
    {"id": "camp_003", "name": "New User Acquisition","platform": "tiktok",  "budget": 20000},
    {"id": "camp_004", "name": "Lookalike Expansion", "platform": "meta",    "budget": 40000},
    {"id": "camp_005", "name": "Search Brand Terms",  "platform": "google",  "budget": 15000},
]
AD_FORMATS  = ["video", "image", "carousel", "story", "search"]
COUNTRIES   = ["US", "UK", "CA", "AU", "DE", "FR", "IN"]
DEVICES     = ["mobile", "desktop", "tablet"]
FUNNEL_STAGES = ["impression", "click", "add_to_cart", "checkout", "conversion"]


def create_topics(bootstrap_servers: str, topics: list[str]) -> None:
    admin = AdminClient({"bootstrap.servers": bootstrap_servers})
    new_topics = [NewTopic(t, num_partitions=3, replication_factor=1) for t in topics]
    futures = admin.create_topics(new_topics)
    for topic, future in futures.items():
        try:
            future.result()
            logger.info(f"Topic '{topic}' created.")
        except Exception as e:
            logger.warning(f"Topic '{topic}' may already exist: {e}")


def make_impression_event(campaign: dict) -> dict[str, Any]:
    cpm = round(random.uniform(1.5, 12.0), 4)
    impressions = random.randint(1, 5)
    return {
        "event_id":      str(uuid.uuid4()),
        "event_type":    "impression",
        "timestamp":     datetime.now(timezone.utc).isoformat(),
        "campaign_id":   campaign["id"],
        "campaign_name": campaign["name"],
        "platform":      campaign["platform"],
        "ad_format":     random.choice(AD_FORMATS),
        "country":       random.choice(COUNTRIES),
        "device":        random.choice(DEVICES),
        "impressions":   impressions,
        "spend_usd":     round(impressions * cpm / 1000, 6),
        "cpm":           cpm,
    }


def make_click_event(impression: dict) -> dict[str, Any]:
    cpc = round(random.uniform(0.10, 3.50), 4)
    return {
        **impression,
        "event_id":   str(uuid.uuid4()),
        "event_type": "click",
        "clicks":     1,
        "cpc":        cpc,
        "spend_usd":  cpc,
    }


def make_conversion_event(click: dict) -> dict[str, Any]:
    revenue = round(random.uniform(5.0, 250.0), 2)
    return {
        **click,
        "event_id":      str(uuid.uuid4()),
        "event_type":    "conversion",
        "conversions":   1,
        "revenue_usd":   revenue,
        "roas":          round(revenue / max(click["spend_usd"], 0.001), 4),
        "funnel_stage":  "conversion",
    }


def delivery_callback(err, msg):
    if err:
        logger.error(f"Delivery failed: {err}")
    # else:
    #     logger.debug(f"Delivered to {msg.topic()} [{msg.partition()}] @ {msg.offset()}")


def run_producer():
    create_topics(BOOTSTRAP_SERVERS, TOPICS)

    producer = Producer({
        "bootstrap.servers": BOOTSTRAP_SERVERS,
        "linger.ms": 5,
        "batch.size": 65536,
        "compression.type": "snappy",
    })

    logger.info(f"🚀 Producer started — targeting ~{EVENTS_PER_SECOND * 3600:,} events/hour")
    total_events = 0

    try:
        while True:
            batch_start = time.time()

            for _ in range(EVENTS_PER_SECOND):
                campaign = random.choice(CAMPAIGNS)

                # Always produce impression
                impression = make_impression_event(campaign)
                producer.produce(
                    "impressions",
                    key=impression["campaign_id"],
                    value=json.dumps(impression),
                    callback=delivery_callback,
                )
                producer.produce(
                    "ad_events",
                    key=impression["event_type"],
                    value=json.dumps(impression),
                    callback=delivery_callback,
                )

                # ~8% CTR → click
                if random.random() < 0.08:
                    click = make_click_event(impression)
                    producer.produce(
                        "ad_events",
                        key=click["event_type"],
                        value=json.dumps(click),
                        callback=delivery_callback,
                    )

                    # ~3% of clicks → conversion
                    if random.random() < 0.03:
                        conversion = make_conversion_event(click)
                        producer.produce(
                            "conversions",
                            key=conversion["campaign_id"],
                            value=json.dumps(conversion),
                            callback=delivery_callback,
                        )

                total_events += 1

            producer.poll(0)

            elapsed = time.time() - batch_start
            sleep_time = max(0, 1.0 - elapsed)
            time.sleep(sleep_time)

            if total_events % 1000 == 0:
                logger.info(f"📊 Total events produced: {total_events:,}")

    except KeyboardInterrupt:
        logger.info("Shutting down producer...")
    finally:
        producer.flush()
        logger.info(f"✅ Finished. Total events: {total_events:,}")


if __name__ == "__main__":
    run_producer()
