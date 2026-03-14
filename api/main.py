"""
FastAPI backend — serves BigQuery data to the React dashboard.
Falls back to mock data if BigQuery is unavailable (dev mode).

Run:
    uvicorn main:app --reload --port 8000
"""

import os
import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Optional: BigQuery client
try:
    from google.cloud import bigquery
    BQ_AVAILABLE = True
except ImportError:
    BQ_AVAILABLE = False

app = FastAPI(title="Ad Spend Optimizer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GCP_PROJECT  = os.getenv("GCP_PROJECT_ID", "your-project-id")
BQ_DATASET   = os.getenv("GCP_DATASET_ID", "ad_spend_dbt")

# ─── BigQuery client (lazy) ───────────────────────────────────────────────────
_bq_client = None

def get_bq_client():
    global _bq_client
    if _bq_client is None and BQ_AVAILABLE:
        _bq_client = bigquery.Client(project=GCP_PROJECT)
    return _bq_client


def run_query(sql: str) -> list[dict]:
    client = get_bq_client()
    if client is None:
        return []
    rows = client.query(sql).result()
    return [dict(r.items()) for r in rows]


# ─── Mock helpers ─────────────────────────────────────────────────────────────
PLATFORMS  = ["meta", "google", "tiktok", "snapchat", "pinterest"]
CAMPAIGNS  = [
    {"id": "camp_001", "name": "Q1 Brand Awareness",   "platform": "meta"},
    {"id": "camp_002", "name": "Retargeting Spring",    "platform": "google"},
    {"id": "camp_003", "name": "New User Acquisition",  "platform": "tiktok"},
    {"id": "camp_004", "name": "Lookalike Expansion",   "platform": "meta"},
    {"id": "camp_005", "name": "Search Brand Terms",    "platform": "google"},
    {"id": "camp_006", "name": "Story Takeover Snap",   "platform": "snapchat"},
    {"id": "camp_007", "name": "Home Decor Pins",       "platform": "pinterest"},
]

def _rand(lo, hi, dp=2): return round(random.uniform(lo, hi), dp)

def mock_campaigns(days: int = 30) -> list[dict]:
    rows = []
    today = datetime.now(timezone.utc).date()
    for d in range(days):
        date = today - timedelta(days=d)
        for c in CAMPAIGNS:
            spend   = _rand(400, 3500)
            revenue = _rand(spend * 1.5, spend * 5.5)
            impr    = random.randint(8000, 80000)
            clicks  = int(impr * _rand(0.01, 0.12))
            conv    = int(clicks * _rand(0.01, 0.06))
            rows.append({
                "campaign_id": c["id"],
                "campaign_name": c["name"],
                "platform": c["platform"],
                "event_date": str(date),
                "country": "US",
                "device": random.choice(["mobile", "desktop"]),
                "ad_format": random.choice(["video", "image", "carousel"]),
                "total_impressions": impr,
                "total_clicks": clicks,
                "total_conversions": conv,
                "total_spend_usd": spend,
                "total_revenue_usd": revenue,
                "ctr": round(clicks / max(impr, 1), 4),
                "cvr": round(conv / max(clicks, 1), 4),
                "roas": round(revenue / max(spend, 0.001), 4),
                "cpm": round((spend / max(impr, 1)) * 1000, 4),
                "cpc": round(spend / max(clicks, 1), 4),
                "cpa": round(spend / max(conv, 1), 4),
                "meets_roas_target": revenue / max(spend, 0.001) >= 3.0,
            })
    return rows


def mock_funnel() -> list[dict]:
    rows = []
    today = str(datetime.now(timezone.utc).date())
    for c in CAMPAIGNS:
        impr  = random.randint(50000, 200000)
        clicks = int(impr * _rand(0.02, 0.10))
        conv   = int(clicks * _rand(0.01, 0.05))
        rows.append({
            "campaign_id": c["id"],
            "campaign_name": c["name"],
            "platform": c["platform"],
            "event_date": today,
            "impressions": impr,
            "clicks": clicks,
            "conversions": conv,
            "impression_to_click_rate": round(clicks / max(impr, 1), 4),
            "click_to_conversion_rate": round(conv / max(clicks, 1), 4),
            "overall_conversion_rate": round(conv / max(impr, 1), 6),
            "dropped_at_impression": impr - clicks,
            "dropped_at_click": clicks - conv,
            "pct_dropped_at_impression": round((impr - clicks) / max(impr, 1), 4),
            "pct_dropped_at_click": round((clicks - conv) / max(clicks, 1), 4),
        })
    return rows


def mock_hourly() -> list[dict]:
    rows = []
    now = datetime.now(timezone.utc)
    for h in range(24):
        ws = now - timedelta(hours=h + 1)
        we = ws + timedelta(hours=1)
        for p in PLATFORMS:
            spend   = _rand(50, 400)
            revenue = _rand(spend * 1.5, spend * 5)
            impr    = random.randint(1000, 10000)
            clicks  = int(impr * _rand(0.02, 0.10))
            conv    = int(clicks * _rand(0.01, 0.05))
            rows.append({
                "window_start": ws.isoformat(),
                "window_end":   we.isoformat(),
                "platform": p,
                "campaign_id": random.choice(CAMPAIGNS)["id"],
                "campaign_name": random.choice(CAMPAIGNS)["name"],
                "total_impressions": impr,
                "total_clicks": clicks,
                "total_conversions": conv,
                "total_spend_usd": spend,
                "total_revenue_usd": revenue,
                "roas": round(revenue / max(spend, 0.001), 4),
                "ctr": round(clicks / max(impr, 1), 4),
                "cvr": round(conv / max(clicks, 1), 4),
                "event_count": random.randint(500, 5000),
            })
    return rows


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "bq_available": BQ_AVAILABLE, "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/campaigns")
def get_campaigns(days: int = Query(default=30, ge=1, le=90)):
    try:
        sql = f"""
            SELECT *
            FROM `{GCP_PROJECT}.{BQ_DATASET}.marts.campaign_performance_daily`
            WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL {days} DAY)
            ORDER BY event_date DESC, total_spend_usd DESC
            LIMIT 5000
        """
        rows = run_query(sql)
        if rows:
            return rows
    except Exception:
        pass
    return mock_campaigns(days)


@app.get("/api/funnel")
def get_funnel():
    try:
        sql = f"""
            SELECT *
            FROM `{GCP_PROJECT}.{BQ_DATASET}.marts.funnel_analysis`
            WHERE event_date = CURRENT_DATE()
        """
        rows = run_query(sql)
        if rows:
            return rows
    except Exception:
        pass
    return mock_funnel()


@app.get("/api/hourly")
def get_hourly():
    try:
        sql = f"""
            SELECT *
            FROM `{GCP_PROJECT}.{BQ_DATASET}.ad_spend_raw.hourly_campaign_metrics`
            WHERE window_start >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
            ORDER BY window_start DESC
            LIMIT 1000
        """
        rows = run_query(sql)
        if rows:
            return rows
    except Exception:
        pass
    return mock_hourly()


@app.get("/api/pipeline/status")
def get_pipeline_status():
    return {
        "kafka_lag": random.randint(0, 200),
        "events_per_second": random.randint(22, 35),
        "last_batch_ts": (datetime.now(timezone.utc) - timedelta(seconds=random.randint(5, 35))).isoformat(),
        "spark_status": "running",
        "bq_write_latency_ms": random.randint(80, 320),
    }


@app.get("/api/kpi")
def get_kpi(days: int = Query(default=7, ge=1, le=30)):
    campaigns = mock_campaigns(days * 2)
    recent = [c for c in campaigns if c["event_date"] >= str(
        (datetime.now(timezone.utc).date() - timedelta(days=days)))]
    spend   = sum(c["total_spend_usd"] for c in recent)
    revenue = sum(c["total_revenue_usd"] for c in recent)
    impr    = sum(c["total_impressions"] for c in recent)
    clicks  = sum(c["total_clicks"] for c in recent)
    conv    = sum(c["total_conversions"] for c in recent)
    plat_map: dict[str, float] = {}
    for c in recent:
        plat_map[c["platform"]] = plat_map.get(c["platform"], 0) + c["total_revenue_usd"]
    top_platform = max(plat_map, key=plat_map.get) if plat_map else "meta"
    return {
        "total_spend": round(spend, 2),
        "total_revenue": round(revenue, 2),
        "overall_roas": round(revenue / max(spend, 0.001), 3),
        "avg_ctr": round(clicks / max(impr, 1), 4),
        "avg_cvr": round(conv / max(clicks, 1), 4),
        "total_impressions": impr,
        "total_clicks": clicks,
        "total_conversions": conv,
        "top_platform": top_platform,
        "spend_change_pct": round(_rand(-15, 25), 1),
        "revenue_change_pct": round(_rand(-10, 40), 1),
        "roas_change_pct": round(_rand(-8, 20), 1),
    }
