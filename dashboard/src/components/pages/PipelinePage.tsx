import { useState, useEffect, useRef } from 'react';
import { usePipeline } from '../../hooks/useData';
import { fetchPipeline } from '../../utils/api';
import { RefreshCw, Activity, Zap, Database, Server } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import PipelineStatusBar from '../layout/PipelineStatusBar';

interface HistoryPoint {
  ts: string;
  events_per_second: number;
  kafka_lag: number;
  bq_write_latency_ms: number;
}

export default function PipelinePage() {
  const { data: pipeline, refresh } = usePipeline();
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Collect pipeline metrics history
  useEffect(() => {
    const collect = async () => {
      try {
        const status = await fetchPipeline();
        setHistory(prev => {
          const next = [...prev, {
            ts: new Date().toISOString(),
            events_per_second: status.events_per_second,
            kafka_lag: status.kafka_lag,
            bq_write_latency_ms: status.bq_write_latency_ms,
          }];
          return next.slice(-30); // Keep last 30 samples
        });
      } catch { /* ignore */ }
    };

    collect();
    intervalRef.current = setInterval(collect, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const latest = pipeline;
  const isHealthy = latest ? latest.spark_status === 'running' && latest.kafka_lag < 500 : false;

  // Compute averages from history
  const avgEvents = history.length > 0
    ? Math.round(history.reduce((s, h) => s + h.events_per_second, 0) / history.length)
    : 0;
  const avgLatency = history.length > 0
    ? Math.round(history.reduce((s, h) => s + h.bq_write_latency_ms, 0) / history.length)
    : 0;
  const maxLag = history.length > 0
    ? Math.max(...history.map(h => h.kafka_lag))
    : 0;
  const estimatedEventsPerHour = avgEvents * 3600;

  return (
    <div className="page">
      {/* Header */}
      <div className="page__header">
        <div>
          <h1 className="page__title">Pipeline Health</h1>
          <p className="page__sub">Real-time infrastructure monitoring</p>
        </div>
        <button className="btn-icon" onClick={refresh} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Status bar */}
      {latest && <PipelineStatusBar status={latest} />}

      {/* Pipeline KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--accent': '#10b981' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Throughput</span>
            <span className="kpi-card__icon"><Zap size={18} /></span>
          </div>
          <div className="kpi-card__value">{latest?.events_per_second ?? '—'} <span style={{ fontSize: 14, fontWeight: 400 }}>events/s</span></div>
          <div className="kpi-card__sub">~{(estimatedEventsPerHour / 1000).toFixed(0)}K events/hour</div>
        </div>

        <div className="kpi-card" style={{ '--accent': latest && latest.kafka_lag > 200 ? '#f59e0b' : '#3b82f6' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Kafka Consumer Lag</span>
            <span className="kpi-card__icon"><Activity size={18} /></span>
          </div>
          <div className="kpi-card__value">{latest?.kafka_lag.toLocaleString() ?? '—'} <span style={{ fontSize: 14, fontWeight: 400 }}>msgs</span></div>
          <div className="kpi-card__sub">Max observed: {maxLag.toLocaleString()}</div>
        </div>

        <div className="kpi-card" style={{ '--accent': '#8b5cf6' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">BQ Write Latency</span>
            <span className="kpi-card__icon"><Database size={18} /></span>
          </div>
          <div className="kpi-card__value">{latest?.bq_write_latency_ms ?? '—'} <span style={{ fontSize: 14, fontWeight: 400 }}>ms</span></div>
          <div className="kpi-card__sub">Avg: {avgLatency}ms</div>
        </div>

        <div className="kpi-card" style={{ '--accent': isHealthy ? '#10b981' : '#ef4444' } as React.CSSProperties}>
          <div className="kpi-card__header">
            <span className="kpi-card__label">Spark Status</span>
            <span className="kpi-card__icon"><Server size={18} /></span>
          </div>
          <div className="kpi-card__value" style={{ textTransform: 'uppercase' }}>
            {latest?.spark_status ?? '—'}
          </div>
          <div className="kpi-card__sub">
            Last batch: {latest ? format(parseISO(latest.last_batch_ts), 'HH:mm:ss') : '—'}
          </div>
        </div>
      </div>

      {/* Service Status Cards */}
      <div className="charts-grid">
        <div className="chart-col-full">
          <div className="chart-card">
            <div className="chart-card__header">
              <h3>Service Components</h3>
              <span className={`chart-card__badge ${isHealthy ? 'live' : ''}`}>
                {isHealthy ? '● ALL HEALTHY' : '⚠ DEGRADED'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
              {/* Kafka */}
              <div style={{
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                padding: 18, border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span className={`pulse-dot ${isHealthy ? 'green' : 'red'}`} />
                  <span style={{ fontWeight: 600 }}>Apache Kafka</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Topics</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>ad_events, impressions, conversions</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Partitions</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>3 per topic</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Compression</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>snappy</span>
                  </div>
                </div>
              </div>

              {/* Spark */}
              <div style={{
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                padding: 18, border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span className={`pulse-dot ${latest?.spark_status === 'running' ? 'green' : 'red'}`} />
                  <span style={{ fontWeight: 600 }}>Spark Streaming</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Active Streams</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>3</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Batch Interval</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>30s / 5m</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Watermark</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>10–15 min</span>
                  </div>
                </div>
              </div>

              {/* BigQuery */}
              <div style={{
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                padding: 18, border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span className={`pulse-dot green`} />
                  <span style={{ fontWeight: 600 }}>BigQuery</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tables</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>raw_events, hourly, funnel</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Write Latency</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{avgLatency}ms avg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Partitioning</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>DAY</span>
                  </div>
                </div>
              </div>

              {/* dbt */}
              <div style={{
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                padding: 18, border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span className={`pulse-dot green`} />
                  <span style={{ fontWeight: 600 }}>dbt Models</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Staging</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>stg_ad_events (view)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Marts</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>campaign_perf, funnel</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Lookback</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>30 days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics history */}
        {history.length > 1 && (
          <div className="chart-col-full">
            <div className="chart-card">
              <div className="chart-card__header">
                <h3>Recent Throughput Samples</h3>
                <span className="chart-card__badge live">● LIVE</span>
              </div>
              <div style={{
                display: 'flex', gap: 4, alignItems: 'flex-end',
                height: 80, padding: '0 4px',
              }}>
                {history.map((h, i) => (
                  <div
                    key={i}
                    title={`${h.events_per_second} events/s at ${format(parseISO(h.ts), 'HH:mm:ss')}`}
                    style={{
                      flex: 1,
                      height: `${(h.events_per_second / 40) * 100}%`,
                      minHeight: 4,
                      background: h.events_per_second > 25
                        ? 'var(--accent-green)'
                        : h.events_per_second > 15
                          ? 'var(--accent-amber)'
                          : 'var(--accent-red)',
                      borderRadius: '3px 3px 0 0',
                      opacity: 0.7 + (i / history.length) * 0.3,
                      transition: 'height 0.3s ease',
                    }}
                  />
                ))}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 10, color: 'var(--text-muted)', marginTop: 6,
              }}>
                <span>{history.length > 0 ? format(parseISO(history[0].ts), 'HH:mm:ss') : ''}</span>
                <span>now</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
