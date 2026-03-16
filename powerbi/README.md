# 📊 Power BI Reports

This directory contains the Power BI template for the Ad Spend Optimizer.

## Setup Instructions

### 1. Connect to BigQuery

1. Open Power BI Desktop
2. **Get Data** → **Google BigQuery**
3. Enter your GCP Project ID: `your-project-id`
4. Authenticate with your Google account
5. Select the `ad_spend_dbt` dataset

### 2. Import Tables

Connect to these dbt mart tables:

| Table | Description |
|-------|------------|
| `campaign_performance_daily` | Daily ROAS, CTR, CVR, CPC, CPA by campaign |
| `funnel_analysis` | Funnel drop-off rates (impression → click → conversion) |

And the Spark-written raw table:

| Table | Description |
|-------|------------|
| `hourly_campaign_metrics` | Hourly aggregated metrics for real-time monitoring |

### 3. Suggested Reports

#### Report 1: ROAS Performance
- **Visuals**: Line chart (ROAS by platform over time), KPI cards, bar chart by campaign
- **Filters**: Platform, Date Range, Campaign
- **Target Line**: 3.0x ROAS benchmark

#### Report 2: Funnel Analysis
- **Visuals**: Funnel chart (impression → click → conversion), drop-off waterfall
- **Filters**: Platform, Campaign
- **Key Metrics**: CTR, CVR, overall conversion rate

#### Report 3: Budget Utilization
- **Visuals**: Gauge chart (spend vs budget), pie chart by platform, trend line
- **Filters**: Date Range, Platform

### 4. Scheduled Refresh

Configure scheduled refresh in Power BI Service:
- **Frequency**: Every 30 minutes (matches Spark streaming batch interval)
- **Gateway**: On-premises data gateway for BigQuery connectivity

## File Structure

```
powerbi/
├── README.md              ← You are here
└── ad_spend_report.pbit   ← Power BI template (create from Desktop)
```

> **Note**: `.pbit` files are not tracked in Git by default due to size.
> Export your template via **File → Save As → Power BI Template (.pbit)**.
