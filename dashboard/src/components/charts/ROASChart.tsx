import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { CampaignMetric } from '../../types';
import { PLATFORM_COLORS, groupBy, sumBy } from '../../utils/formatters';

interface Props {
  campaigns: CampaignMetric[];
  platforms: string[];
}

export default function ROASChart({ campaigns, platforms }: Props) {
  // Build date → platform → ROAS
  const byDate = groupBy(campaigns, 'event_date');
  const dates = Object.keys(byDate).sort();

  const data = dates.map(date => {
    const row: Record<string, unknown> = { date };
    const dayCampaigns = byDate[date] ?? [];
    platforms.forEach(p => {
      const pCamps = p === 'all' ? dayCampaigns : dayCampaigns.filter(c => c.platform === p);
      const spend   = sumBy(pCamps, 'total_spend_usd');
      const revenue = sumBy(pCamps, 'total_revenue_usd');
      row[p] = spend > 0 ? parseFloat((revenue / spend).toFixed(3)) : 0;
    });
    return row;
  });

  const activePlatforms = platforms.filter(p => p !== 'all');

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h3>ROAS Trend</h3>
        <span className="chart-card__badge">7-day rolling</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            tickFormatter={v => format(parseISO(v), 'MMM d')}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `${v}x`}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelFormatter={v => format(parseISO(String(v)), 'MMMM d, yyyy')}
            formatter={(v: number, name: string) => [`${v.toFixed(2)}x`, name.toUpperCase()]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={3} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Target 3x', fill: '#f59e0b', fontSize: 11 }} />
          {activePlatforms.map(p => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              stroke={PLATFORM_COLORS[p]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
              name={p}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
