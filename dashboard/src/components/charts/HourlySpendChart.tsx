import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { HourlyMetric } from '../../types';
import { fmt, groupBy, sumBy } from '../../utils/formatters';

interface Props { hourly: HourlyMetric[] }

export default function HourlySpendChart({ hourly }: Props) {
  const byHour = groupBy(hourly, 'window_start');
  const data = Object.keys(byHour)
    .sort()
    .map(ts => {
      const items = byHour[ts];
      return {
        ts,
        label: format(parseISO(ts), 'HH:mm'),
        spend: parseFloat(sumBy(items, 'total_spend_usd').toFixed(2)),
        revenue: parseFloat(sumBy(items, 'total_revenue_usd').toFixed(2)),
        events: sumBy(items, 'event_count'),
      };
    });

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h3>Spend &amp; Revenue — Last 24h</h3>
        <span className="chart-card__badge live">● LIVE</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={3}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            formatter={(v: number, name: string) => [fmt.currencyFull(v), name === 'spend' ? 'Spend' : 'Revenue']}
          />
          <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2}
            fill="url(#revenueGrad)" name="revenue" />
          <Area type="monotone" dataKey="spend"   stroke="#6366f1" strokeWidth={2}
            fill="url(#spendGrad)" name="spend" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
