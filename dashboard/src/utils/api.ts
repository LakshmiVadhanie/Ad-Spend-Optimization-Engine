import axios from 'axios';
import type {
  CampaignMetric, FunnelStage, HourlyMetric,
  KPISummary, PipelineStatus, Platform
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 15000,
});

// ─── Mock data generators (used when API unavailable) ─────────────────────

const PLATFORMS: Platform[] = ['meta', 'google', 'tiktok', 'snapchat', 'pinterest'];
const CAMPAIGNS = [
  { id: 'camp_001', name: 'Q1 Brand Awareness',    platform: 'meta'      as Platform },
  { id: 'camp_002', name: 'Retargeting Spring',     platform: 'google'    as Platform },
  { id: 'camp_003', name: 'New User Acquisition',   platform: 'tiktok'    as Platform },
  { id: 'camp_004', name: 'Lookalike Expansion',    platform: 'meta'      as Platform },
  { id: 'camp_005', name: 'Search Brand Terms',     platform: 'google'    as Platform },
  { id: 'camp_006', name: 'Story Takeover Snap',    platform: 'snapchat'  as Platform },
  { id: 'camp_007', name: 'Home Decor Pins',        platform: 'pinterest' as Platform },
];

const rand = (min: number, max: number, dp = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(dp));

export function generateMockCampaigns(days = 30): CampaignMetric[] {
  const rows: CampaignMetric[] = [];
  const today = new Date();
  for (let d = 0; d < days; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() - d);
    const dateStr = date.toISOString().split('T')[0];
    for (const c of CAMPAIGNS) {
      const spend   = rand(400, 3500);
      const revenue = rand(spend * 1.5, spend * 5.5);
      const impr    = Math.floor(rand(8000, 80000, 0));
      const clicks  = Math.floor(impr * rand(0.01, 0.12));
      const conv    = Math.floor(clicks * rand(0.01, 0.06));
      rows.push({
        campaign_id: c.id,
        campaign_name: c.name,
        platform: c.platform,
        event_date: dateStr,
        country: 'US',
        device: 'mobile',
        ad_format: 'video',
        total_impressions: impr,
        total_clicks: clicks,
        total_conversions: conv,
        total_spend_usd: spend,
        total_revenue_usd: revenue,
        ctr: parseFloat((clicks / impr).toFixed(4)),
        cvr: parseFloat((conv / Math.max(clicks, 1)).toFixed(4)),
        roas: parseFloat((revenue / spend).toFixed(4)),
        cpm: parseFloat(((spend / impr) * 1000).toFixed(4)),
        cpc: parseFloat((spend / Math.max(clicks, 1)).toFixed(4)),
        cpa: parseFloat((spend / Math.max(conv, 1)).toFixed(4)),
        meets_roas_target: revenue / spend >= 3.0,
      });
    }
  }
  return rows;
}

export function generateMockFunnel(): FunnelStage[] {
  return CAMPAIGNS.map(c => {
    const impr  = Math.floor(rand(50000, 200000, 0));
    const clicks = Math.floor(impr * rand(0.02, 0.10));
    const conv   = Math.floor(clicks * rand(0.01, 0.05));
    return {
      campaign_id: c.id,
      campaign_name: c.name,
      platform: c.platform,
      event_date: new Date().toISOString().split('T')[0],
      impressions: impr,
      clicks,
      conversions: conv,
      impression_to_click_rate: parseFloat((clicks / impr).toFixed(4)),
      click_to_conversion_rate: parseFloat((conv / Math.max(clicks, 1)).toFixed(4)),
      overall_conversion_rate: parseFloat((conv / impr).toFixed(6)),
      dropped_at_impression: impr - clicks,
      dropped_at_click: clicks - conv,
      pct_dropped_at_impression: parseFloat(((impr - clicks) / impr).toFixed(4)),
      pct_dropped_at_click: parseFloat(((clicks - conv) / Math.max(clicks, 1)).toFixed(4)),
    };
  });
}

export function generateMockHourly(): HourlyMetric[] {
  const rows: HourlyMetric[] = [];
  const now = new Date();
  for (let h = 23; h >= 0; h--) {
    const ws = new Date(now);
    ws.setHours(now.getHours() - h, 0, 0, 0);
    const we = new Date(ws); we.setHours(ws.getHours() + 1);
    for (const p of PLATFORMS) {
      const spend   = rand(50, 400);
      const revenue = rand(spend * 1.5, spend * 5);
      const impr    = Math.floor(rand(1000, 10000, 0));
      const clicks  = Math.floor(impr * rand(0.02, 0.10));
      const conv    = Math.floor(clicks * rand(0.01, 0.05));
      rows.push({
        window_start: ws.toISOString(),
        window_end: we.toISOString(),
        platform: p,
        campaign_id: CAMPAIGNS[Math.floor(Math.random() * CAMPAIGNS.length)].id,
        campaign_name: CAMPAIGNS[Math.floor(Math.random() * CAMPAIGNS.length)].name,
        total_impressions: impr,
        total_clicks: clicks,
        total_conversions: conv,
        total_spend_usd: spend,
        total_revenue_usd: revenue,
        roas: parseFloat((revenue / spend).toFixed(4)),
        ctr: parseFloat((clicks / impr).toFixed(4)),
        cvr: parseFloat((conv / Math.max(clicks, 1)).toFixed(4)),
        event_count: Math.floor(rand(500, 5000, 0)),
      });
    }
  }
  return rows;
}

export function generateMockKPI(campaigns: CampaignMetric[]): KPISummary {
  const recent = campaigns.filter(c => {
    const d = new Date(c.event_date);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    return d >= cutoff;
  });
  const spend   = recent.reduce((s, c) => s + c.total_spend_usd, 0);
  const revenue = recent.reduce((s, c) => s + c.total_revenue_usd, 0);
  const impr    = recent.reduce((s, c) => s + c.total_impressions, 0);
  const clicks  = recent.reduce((s, c) => s + c.total_clicks, 0);
  const conv    = recent.reduce((s, c) => s + c.total_conversions, 0);
  const platMap: Record<string, number> = {};
  recent.forEach(c => { platMap[c.platform] = (platMap[c.platform] ?? 0) + c.total_revenue_usd; });
  const topPlatform = (Object.entries(platMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'meta') as Platform;
  return {
    total_spend: parseFloat(spend.toFixed(2)),
    total_revenue: parseFloat(revenue.toFixed(2)),
    overall_roas: parseFloat((revenue / Math.max(spend, 1)).toFixed(3)),
    avg_ctr: parseFloat((clicks / Math.max(impr, 1)).toFixed(4)),
    avg_cvr: parseFloat((conv / Math.max(clicks, 1)).toFixed(4)),
    total_impressions: impr,
    total_clicks: clicks,
    total_conversions: conv,
    top_platform: topPlatform,
    spend_change_pct: rand(-15, 25),
    revenue_change_pct: rand(-10, 40),
    roas_change_pct: rand(-8, 20),
  };
}

export function generateMockPipeline(): PipelineStatus {
  return {
    kafka_lag: Math.floor(rand(0, 200, 0)),
    events_per_second: Math.floor(rand(20, 35, 0)),
    last_batch_ts: new Date(Date.now() - rand(5000, 35000, 0)).toISOString(),
    spark_status: 'running',
    bq_write_latency_ms: Math.floor(rand(80, 320, 0)),
  };
}

// ─── Real API calls (fall back to mock) ──────────────────────────────────────

export async function fetchCampaigns(): Promise<CampaignMetric[]> {
  try {
    const { data } = await api.get<CampaignMetric[]>('/api/campaigns');
    return data;
  } catch {
    return generateMockCampaigns();
  }
}

export async function fetchFunnel(): Promise<FunnelStage[]> {
  try {
    const { data } = await api.get<FunnelStage[]>('/api/funnel');
    return data;
  } catch {
    return generateMockFunnel();
  }
}

export async function fetchHourly(): Promise<HourlyMetric[]> {
  try {
    const { data } = await api.get<HourlyMetric[]>('/api/hourly');
    return data;
  } catch {
    return generateMockHourly();
  }
}

export async function fetchPipeline(): Promise<PipelineStatus> {
  try {
    const { data } = await api.get<PipelineStatus>('/api/pipeline/status');
    return data;
  } catch {
    return generateMockPipeline();
  }
}
