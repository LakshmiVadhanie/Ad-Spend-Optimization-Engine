import { useCampaigns, useKPI, usePlatformFilter } from '../../hooks/useData';
import ROASChart from '../charts/ROASChart';
import { fmt, PLATFORM_COLORS, groupBy, sumBy } from '../../utils/formatters';
import { RefreshCw, TrendingUp, Target, Award } from 'lucide-react';
import { format } from 'date-fns';
import type { CampaignMetric } from '../../types';

export default function ROASTrends() {
  const { data: campaigns, loading, lastUpdated, refresh } = useCampaigns();
  const { platform, setPlatform, filtered } = usePlatformFilter(campaigns);
  const kpi = useKPI(campaigns);

  const PLATFORMS = ['all', 'meta', 'google', 'tiktok', 'snapchat', 'pinterest'];

  if (loading && !campaigns) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading ROAS data…</p>
      </div>
    );
  }

  // Compute per-platform ROAS
  const platformROAS = campaigns
    ? Object.entries(groupBy(campaigns, 'platform')).map(([plat, items]) => {
        const spend = sumBy(items, 'total_spend_usd');
        const revenue = sumBy(items, 'total_revenue_usd');
        return {
          platform: plat,
          spend,
          revenue,
          roas: spend > 0 ? revenue / spend : 0,
          campaigns: items.length,
          aboveTarget: (spend > 0 ? revenue / spend : 0) >= 3.0,
        };
      }).sort((a, b) => b.roas - a.roas)
    : [];

  // Top and bottom performing campaigns
  const aggregatedCampaigns = campaigns
    ? (() => {
        const map = new Map<string, CampaignMetric>();
        campaigns.forEach(c => {
          const existing = map.get(c.campaign_id);
          if (!existing) {
            map.set(c.campaign_id, { ...c });
          } else {
            existing.total_spend_usd += c.total_spend_usd;
            existing.total_revenue_usd += c.total_revenue_usd;
          }
        });
        return Array.from(map.values()).map(c => ({
          ...c,
          roas: c.total_revenue_usd / Math.max(c.total_spend_usd, 1),
        }));
      })()
    : [];

  const sortedByROAS = [...aggregatedCampaigns].sort((a, b) => b.roas - a.roas);
  const topPerformers = sortedByROAS.slice(0, 3);
  const bottomPerformers = sortedByROAS.slice(-2).reverse();

  const activePlatforms = platform === 'all'
    ? ['meta', 'google', 'tiktok', 'snapchat', 'pinterest']
    : [platform];

  return (
    <div className="page">
      {/* Header */}
      <div className="page__header">
        <div>
          <h1 className="page__title">ROAS Trends</h1>
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

      {/* ROAS KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--accent': kpi && kpi.overall_roas >= 3 ? '#10b981' : '#f59e0b' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Overall ROAS</span>
            <span className="kpi-card__icon"><Target size={18} /></span>
          </div>
          <div className="kpi-card__value">{kpi ? fmt.roas(kpi.overall_roas) : '—'}</div>
          {kpi && (
            <div className="kpi-card__sub">
              {kpi.overall_roas >= 3 ? '✓ Above 3.0x target' : '↓ Below 3.0x target'}
            </div>
          )}
        </div>

        <div className="kpi-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Total Spend</span>
          </div>
          <div className="kpi-card__value">{kpi ? fmt.currency(kpi.total_spend) : '—'}</div>
        </div>

        <div className="kpi-card" style={{ '--accent': '#10b981' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Total Revenue</span>
            <span className="kpi-card__icon"><TrendingUp size={18} /></span>
          </div>
          <div className="kpi-card__value">{kpi ? fmt.currency(kpi.total_revenue) : '—'}</div>
        </div>

        <div className="kpi-card" style={{ '--accent': '#8b5cf6' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Best Platform</span>
            <span className="kpi-card__icon"><Award size={18} /></span>
          </div>
          <div className="kpi-card__value" style={{ textTransform: 'capitalize' }}>
            {kpi?.top_platform ?? '—'}
          </div>
        </div>
      </div>

      {/* ROAS Trend Chart */}
      <div className="charts-grid">
        <div className="chart-col-full">
          {filtered.length > 0 && (
            <ROASChart campaigns={filtered} platforms={activePlatforms} />
          )}
        </div>

        {/* Platform ROAS Breakdown */}
        <div className="chart-col-full">
          <div className="chart-card">
            <div className="chart-card__header">
              <h3>ROAS by Platform</h3>
              <span className="chart-card__badge">Last 30d</span>
            </div>
            <div className="table-card" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th>Spend</th>
                    <th>Revenue</th>
                    <th>ROAS</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {platformROAS.map(p => (
                    <tr key={p.platform}>
                      <td>
                        <span
                          className="platform-badge"
                          style={{
                            background: (PLATFORM_COLORS[p.platform] ?? '#666') + '22',
                            color: PLATFORM_COLORS[p.platform] ?? '#666',
                          }}
                        >
                          {p.platform}
                        </span>
                      </td>
                      <td>{fmt.currency(p.spend)}</td>
                      <td>{fmt.currency(p.revenue)}</td>
                      <td className={p.roas >= 3 ? 'text-green' : 'text-amber'}>
                        {fmt.roas(p.roas)}
                      </td>
                      <td>
                        <span className={`status-dot ${p.aboveTarget ? 'green' : 'amber'}`}>
                          {p.aboveTarget ? 'On Target' : 'Below Target'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top & Bottom performers */}
        <div className="chart-col-half">
          <div className="chart-card">
            <div className="chart-card__header">
              <h3>🏆 Top Performers</h3>
            </div>
            {topPerformers.map(c => (
              <div key={c.campaign_id} className="platform-row" style={{ padding: '8px 0' }}>
                <span className="platform-dot" style={{ background: '#10b981' }} />
                <span className="platform-name" style={{ flex: 2 }}>{c.campaign_name}</span>
                <span className="text-green" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  {fmt.roas(c.roas)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-col-half">
          <div className="chart-card">
            <div className="chart-card__header">
              <h3>⚠️ Needs Attention</h3>
            </div>
            {bottomPerformers.map(c => (
              <div key={c.campaign_id} className="platform-row" style={{ padding: '8px 0' }}>
                <span className="platform-dot" style={{ background: '#f59e0b' }} />
                <span className="platform-name" style={{ flex: 2 }}>{c.campaign_name}</span>
                <span className="text-amber" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  {fmt.roas(c.roas)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
