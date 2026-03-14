import { useCampaigns, useFunnel, useHourly, useKPI, usePipeline, usePlatformFilter } from '../../hooks/useData';
import KPICards from '../charts/KPICards';
import ROASChart from '../charts/ROASChart';
import FunnelChart from '../charts/FunnelChart';
import SpendByPlatform from '../charts/SpendByPlatform';
import HourlySpendChart from '../charts/HourlySpendChart';
import PipelineStatusBar from '../layout/PipelineStatusBar';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function Overview() {
  const { data: campaigns, loading: loadCamp, lastUpdated, refresh } = useCampaigns();
  const { data: funnel,    loading: loadFunnel }  = useFunnel();
  const { data: hourly,    loading: loadHourly }  = useHourly();
  const { data: pipeline }                        = usePipeline();
  const kpi = useKPI(campaigns);
  const { platform, setPlatform, filtered } = usePlatformFilter(campaigns);

  const PLATFORMS = ['all', 'meta', 'google', 'tiktok', 'snapchat', 'pinterest'];

  if (loadCamp && !campaigns) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading dashboard data…</p>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page__header">
        <div>
          <h1 className="page__title">Ad Spend Overview</h1>
          <p className="page__sub">
            {lastUpdated ? `Updated ${format(lastUpdated, 'HH:mm:ss')}` : 'Loading…'}
          </p>
        </div>
        <div className="page__actions">
          {/* Platform filter */}
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

      {/* Pipeline status */}
      {pipeline && <PipelineStatusBar status={pipeline} />}

      {/* KPI cards */}
      {kpi && <KPICards kpi={kpi} />}

      {/* Charts grid */}
      <div className="charts-grid">
        {hourly && !loadHourly && (
          <div className="chart-col-full">
            <HourlySpendChart hourly={hourly} />
          </div>
        )}

        <div className="chart-col-half">
          {filtered.length > 0 && (
            <ROASChart
              campaigns={filtered}
              platforms={platform === 'all' ? ['meta', 'google', 'tiktok'] : [platform]}
            />
          )}
        </div>

        <div className="chart-col-half">
          {campaigns && <SpendByPlatform campaigns={campaigns} />}
        </div>

        <div className="chart-col-full">
          {funnel && !loadFunnel && <FunnelChart funnel={funnel} />}
        </div>
      </div>
    </div>
  );
}
