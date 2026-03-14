import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { CampaignMetric } from '../../types';
import { PLATFORM_COLORS, PLATFORM_LABELS, fmt, groupBy, sumBy } from '../../utils/formatters';

interface Props { campaigns: CampaignMetric[] }

export default function SpendByPlatform({ campaigns }: Props) {
  const byPlatform = groupBy(campaigns, 'platform');
  const data = Object.entries(byPlatform)
    .map(([platform, items]) => ({
      platform,
      name: PLATFORM_LABELS[platform] ?? platform,
      spend: sumBy(items, 'total_spend_usd'),
      revenue: sumBy(items, 'total_revenue_usd'),
      roas: parseFloat((sumBy(items, 'total_revenue_usd') / Math.max(sumBy(items, 'total_spend_usd'), 1)).toFixed(2)),
    }))
    .sort((a, b) => b.spend - a.spend);

  const totalSpend = data.reduce((s, d) => s + d.spend, 0);

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h3>Spend by Platform</h3>
        <span className="chart-card__badge">Last 30d</span>
      </div>

      <div className="platform-split">
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="spend"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {data.map(entry => (
                <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] ?? '#666'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(v: number) => [fmt.currency(v), 'Spend']}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="platform-list">
          {data.map(d => (
            <div key={d.platform} className="platform-row">
              <span
                className="platform-dot"
                style={{ background: PLATFORM_COLORS[d.platform] ?? '#666' }}
              />
              <span className="platform-name">{d.name}</span>
              <span className="platform-spend">{fmt.currency(d.spend)}</span>
              <span className="platform-pct">{((d.spend / totalSpend) * 100).toFixed(1)}%</span>
              <span className={`platform-roas ${d.roas >= 3 ? 'good' : 'warn'}`}>
                {fmt.roas(d.roas)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
