import { useCampaigns, useFunnel, usePlatformFilter } from '../../hooks/useData';
import FunnelChart from '../charts/FunnelChart';
import { fmt, PLATFORM_COLORS } from '../../utils/formatters';
import { RefreshCw, Filter } from 'lucide-react';
import { format } from 'date-fns';
import type { FunnelStage } from '../../types';

export default function FunnelPage() {
  const { data: funnel, loading, lastUpdated, refresh } = useFunnel();
  const { data: campaigns } = useCampaigns();
  const { platform, setPlatform } = usePlatformFilter(campaigns);

  const PLATFORMS = ['all', 'meta', 'google', 'tiktok', 'snapchat', 'pinterest'];

  // Filter funnel data by selected platform
  const filteredFunnel = funnel
    ? platform === 'all'
      ? funnel
      : funnel.filter(f => f.platform === platform)
    : null;

  if (loading && !funnel) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading funnel data…</p>
      </div>
    );
  }

  // Compute aggregate stats
  const totals = filteredFunnel?.reduce(
    (acc, f) => ({
      impressions: acc.impressions + f.impressions,
      clicks: acc.clicks + f.clicks,
      conversions: acc.conversions + f.conversions,
    }),
    { impressions: 0, clicks: 0, conversions: 0 }
  ) ?? { impressions: 0, clicks: 0, conversions: 0 };

  const overallCTR = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  const overallCVR = totals.clicks > 0 ? totals.conversions / totals.clicks : 0;
  const overallConvRate = totals.impressions > 0 ? totals.conversions / totals.impressions : 0;

  return (
    <div className="page">
      {/* Header */}
      <div className="page__header">
        <div>
          <h1 className="page__title">Funnel Analysis</h1>
          <p className="page__sub">
            {lastUpdated ? `Updated ${format(lastUpdated, 'HH:mm:ss')}` : 'Loading…'}
          </p>
        </div>
        <div className="page__actions">
          <div className="platform-tabs">
            {PLATFORMS.map(p => (
              <button
                key={p}
                className={`platform-tab ${platform === p ? 'active' : ''}`}
                onClick={() => setPlatform(p)}
              >
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn-icon" onClick={refresh} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Funnel summary KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Total Impressions</span>
            <span className="kpi-card__icon"><Filter size={18} /></span>
          </div>
          <div className="kpi-card__value">{fmt.number(totals.impressions)}</div>
          <div className="kpi-card__sub">Top of funnel</div>
        </div>

        <div className="kpi-card" style={{ '--accent': '#3b82f6' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Total Clicks</span>
          </div>
          <div className="kpi-card__value">{fmt.number(totals.clicks)}</div>
          <div className="kpi-card__sub">CTR: {fmt.percent(overallCTR)}</div>
        </div>

        <div className="kpi-card" style={{ '--accent': '#10b981' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Total Conversions</span>
          </div>
          <div className="kpi-card__value">{fmt.number(totals.conversions)}</div>
          <div className="kpi-card__sub">CVR: {fmt.percent(overallCVR)}</div>
        </div>

        <div className="kpi-card" style={{ '--accent': '#f59e0b' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Overall Conv. Rate</span>
          </div>
          <div className="kpi-card__value">{fmt.percent(overallConvRate, 3)}</div>
          <div className="kpi-card__sub">Impression → Conversion</div>
        </div>
      </div>

      {/* Main funnel chart */}
      {filteredFunnel && (
        <div className="charts-grid">
          <div className="chart-col-full">
            <FunnelChart funnel={filteredFunnel} />
          </div>
        </div>
      )}

      {/* Per-campaign breakdown table */}
      {filteredFunnel && filteredFunnel.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Platform</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>Conversions</th>
                  <th>CTR</th>
                  <th>CVR</th>
                  <th>Drop @ Impression</th>
                  <th>Drop @ Click</th>
                </tr>
              </thead>
              <tbody>
                {filteredFunnel.map((f: FunnelStage) => (
                  <tr key={f.campaign_id}>
                    <td>
                      <div className="campaign-name">{f.campaign_name}</div>
                      <div className="campaign-id muted">{f.campaign_id}</div>
                    </td>
                    <td>
                      <span
                        className="platform-badge"
                        style={{
                          background: (PLATFORM_COLORS[f.platform] ?? '#666') + '22',
                          color: PLATFORM_COLORS[f.platform] ?? '#666',
                        }}
                      >
                        {f.platform}
                      </span>
                    </td>
                    <td>{fmt.number(f.impressions)}</td>
                    <td>{fmt.number(f.clicks)}</td>
                    <td>{fmt.number(f.conversions)}</td>
                    <td>{fmt.percent(f.impression_to_click_rate)}</td>
                    <td>{fmt.percent(f.click_to_conversion_rate)}</td>
                    <td className="text-amber">{fmt.percent(f.pct_dropped_at_impression)}</td>
                    <td className="text-amber">{fmt.percent(f.pct_dropped_at_click)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
