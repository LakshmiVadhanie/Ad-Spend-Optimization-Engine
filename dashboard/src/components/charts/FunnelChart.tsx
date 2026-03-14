import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { FunnelStage } from '../../types';
import { fmt } from '../../utils/formatters';

interface Props { funnel: FunnelStage[] }

export default function FunnelChart({ funnel }: Props) {
  // Aggregate across all campaigns
  const total = funnel.reduce(
    (acc, f) => ({
      impressions: acc.impressions + f.impressions,
      clicks: acc.clicks + f.clicks,
      conversions: acc.conversions + f.conversions,
    }),
    { impressions: 0, clicks: 0, conversions: 0 }
  );

  const maxVal = total.impressions;

  const stages = [
    {
      name: 'Impressions',
      value: total.impressions,
      pct: 1,
      color: '#6366f1',
      drop: null,
    },
    {
      name: 'Clicks',
      value: total.clicks,
      pct: total.clicks / Math.max(total.impressions, 1),
      color: '#3b82f6',
      drop: 1 - total.clicks / Math.max(total.impressions, 1),
    },
    {
      name: 'Conversions',
      value: total.conversions,
      pct: total.conversions / Math.max(total.impressions, 1),
      color: '#10b981',
      drop: 1 - total.conversions / Math.max(total.clicks, 1),
    },
  ];

  // Per-campaign table
  const campaignData = funnel.slice(0, 5).map(f => ({
    name: f.campaign_name.length > 22 ? f.campaign_name.slice(0, 22) + '…' : f.campaign_name,
    impressions: f.impressions,
    clicks: f.clicks,
    conversions: f.conversions,
    ctr: f.impression_to_click_rate,
    cvr: f.click_to_conversion_rate,
    drop_impr: f.pct_dropped_at_impression,
    drop_click: f.pct_dropped_at_click,
  }));

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h3>Funnel Drop-off</h3>
        <span className="chart-card__badge">All campaigns</span>
      </div>

      {/* Visual funnel bars */}
      <div className="funnel-visual">
        {stages.map((s, i) => (
          <div key={s.name} className="funnel-step">
            <div className="funnel-step__label">
              <span>{s.name}</span>
              <span className="funnel-step__val">{fmt.number(s.value)}</span>
            </div>
            <div className="funnel-step__track">
              <div
                className="funnel-step__bar"
                style={{
                  width: `${(s.value / maxVal) * 100}%`,
                  background: s.color,
                }}
              />
            </div>
            {s.drop !== null && (
              <div className="funnel-step__drop">
                ↓ {fmt.percent(s.drop)} dropped
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={campaignData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            angle={-25}
            textAnchor="end"
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(v: number, name: string) => [fmt.number(v), name]}
          />
          <Bar dataKey="impressions" fill="#6366f1" radius={[3, 3, 0, 0]} name="Impressions" />
          <Bar dataKey="clicks"      fill="#3b82f6" radius={[3, 3, 0, 0]} name="Clicks" />
          <Bar dataKey="conversions" fill="#10b981" radius={[3, 3, 0, 0]} name="Conversions" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
