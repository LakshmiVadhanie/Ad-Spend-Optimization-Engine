import type { KPISummary } from '../../types';
import { fmt, PLATFORM_LABELS } from '../../utils/formatters';
import {
  DollarSign, TrendingUp, MousePointerClick,
  Target, Eye, ShoppingCart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

interface Props { kpi: KPISummary }

interface CardProps {
  label: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
}

function Card({ label, value, change, icon, accent, sub }: CardProps) {
  const positive = change !== undefined && change >= 0;
  return (
    <div className="kpi-card" style={{ '--accent': accent } as React.CSSProperties}>
      <div className="kpi-card__header">
        <span className="kpi-card__label">{label}</span>
        <span className="kpi-card__icon">{icon}</span>
      </div>
      <div className="kpi-card__value">{value}</div>
      {change !== undefined && (
        <div className={`kpi-card__change ${positive ? 'pos' : 'neg'}`}>
          {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {fmt.change(change)} vs prev period
        </div>
      )}
      {sub && <div className="kpi-card__sub">{sub}</div>}
    </div>
  );
}

export default function KPICards({ kpi }: Props) {
  return (
    <div className="kpi-grid">
      <Card
        label="Total Spend"
        value={fmt.currency(kpi.total_spend)}
        change={kpi.spend_change_pct}
        icon={<DollarSign size={18} />}
        accent="#6366f1"
      />
      <Card
        label="Total Revenue"
        value={fmt.currency(kpi.total_revenue)}
        change={kpi.revenue_change_pct}
        icon={<TrendingUp size={18} />}
        accent="#10b981"
      />
      <Card
        label="Overall ROAS"
        value={fmt.roas(kpi.overall_roas)}
        change={kpi.roas_change_pct}
        icon={<Target size={18} />}
        accent={kpi.overall_roas >= 3 ? '#10b981' : '#f59e0b'}
        sub={kpi.overall_roas >= 3 ? '✓ Above 3.0x target' : '↓ Below 3.0x target'}
      />
      <Card
        label="Avg CTR"
        value={fmt.percent(kpi.avg_ctr)}
        icon={<MousePointerClick size={18} />}
        accent="#3b82f6"
      />
      <Card
        label="Impressions"
        value={fmt.number(kpi.total_impressions)}
        icon={<Eye size={18} />}
        accent="#8b5cf6"
      />
      <Card
        label="Conversions"
        value={fmt.number(kpi.total_conversions)}
        icon={<ShoppingCart size={18} />}
        accent="#f59e0b"
        sub={`CVR: ${fmt.percent(kpi.avg_cvr)}`}
      />
    </div>
  );
}
