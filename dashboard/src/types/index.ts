// ─── Campaign Types ──────────────────────────────────────────────────────────

export interface CampaignMetric {
  campaign_id: string;
  campaign_name: string;
  platform: Platform;
  event_date: string;
  country: string;
  device: string;
  ad_format: string;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_spend_usd: number;
  total_revenue_usd: number;
  ctr: number;
  cvr: number;
  roas: number;
  cpm: number;
  cpc: number;
  cpa: number;
  meets_roas_target: boolean;
}

export interface FunnelStage {
  campaign_id: string;
  campaign_name: string;
  platform: Platform;
  event_date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  impression_to_click_rate: number;
  click_to_conversion_rate: number;
  overall_conversion_rate: number;
  dropped_at_impression: number;
  dropped_at_click: number;
  pct_dropped_at_impression: number;
  pct_dropped_at_click: number;
}

export interface HourlyMetric {
  window_start: string;
  window_end: string;
  platform: Platform;
  campaign_id: string;
  campaign_name: string;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_spend_usd: number;
  total_revenue_usd: number;
  roas: number;
  ctr: number;
  cvr: number;
  event_count: number;
}

// ─── Shared / UI ─────────────────────────────────────────────────────────────

export type Platform = 'meta' | 'google' | 'tiktok' | 'snapchat' | 'pinterest' | 'all';

export type MetricKey = 'roas' | 'ctr' | 'cvr' | 'cpc' | 'cpm' | 'cpa' |
  'total_spend_usd' | 'total_revenue_usd' | 'total_impressions' |
  'total_clicks' | 'total_conversions';

export interface KPISummary {
  total_spend: number;
  total_revenue: number;
  overall_roas: number;
  avg_ctr: number;
  avg_cvr: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  top_platform: Platform;
  spend_change_pct: number;
  revenue_change_pct: number;
  roas_change_pct: number;
}

export interface PipelineStatus {
  kafka_lag: number;
  events_per_second: number;
  last_batch_ts: string;
  spark_status: 'running' | 'stopped' | 'error';
  bq_write_latency_ms: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type TimeGranularity = 'hourly' | 'daily' | 'weekly';
