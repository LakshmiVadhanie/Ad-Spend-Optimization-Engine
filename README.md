# Ad Spend Optimization Engine

A real-time advertising analytics platform that ingests **100K+ events/hour** via Kafka + Spark Streaming into BigQuery, with dbt transformations and a React/TypeScript dashboard tracking ROAS, CPM, CPC, and funnel drop-off.

## Architecture

```
Ad Platforms (Meta, Google, TikTok)
        ↓
  Kafka Producer (Python)
        ↓
  Kafka Topics (ad_events, impressions, conversions)
        ↓
  Spark Streaming (PySpark)
        ↓
  BigQuery (Raw → dbt → Marts)
        ↓
  React Dashboard + Power BI
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Ingestion | Apache Kafka |
| Stream Processing | Apache Spark Streaming (PySpark) |
| Data Warehouse | Google BigQuery |
| Transformations | dbt (data build tool) |
| Frontend | React + TypeScript + Recharts |
| BI Reports | Power BI (PBIX template) |
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## 📁 Project Structure

```
ad-spend-optimizer/
├── kafka/
│   ├── producer/          # Simulated ad event producer
│   └── consumer/          # Kafka consumer config
├── spark/                 # PySpark streaming jobs
├── dbt/                   # dbt models & macros
│   └── models/
│       ├── staging/       # Raw → cleaned
│       └── marts/         # Business-level aggregations
├── bigquery/              # Schema definitions & setup scripts
├── dashboard/             # React + TypeScript frontend
├── powerbi/               # Power BI template (.pbit)
├── docker/                # Dockerfiles
├── .github/workflows/     # CI/CD pipelines
└── docs/                  # Architecture diagrams
```

##  Key Metrics Tracked

- **ROAS** (Return on Ad Spend) by platform & campaign
- **CPC / CPM / CTR** aggregated hourly/daily
- **Funnel Drop-off** (impression → click → conversion)
- **Budget Utilization** vs. target
- **Streaming Latency** (end-to-end pipeline health)
