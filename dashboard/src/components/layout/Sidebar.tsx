import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Filter, BarChart3,
  Settings, Zap
} from 'lucide-react';

const NAV = [
  { to: '/',          label: 'Overview',    icon: <LayoutDashboard size={18} /> },
  { to: '/campaigns', label: 'Campaigns',   icon: <BarChart3 size={18} /> },
  { to: '/funnel',    label: 'Funnel',      icon: <Filter size={18} /> },
  { to: '/roas',      label: 'ROAS Trends', icon: <TrendingUp size={18} /> },
  { to: '/pipeline',  label: 'Pipeline',    icon: <Zap size={18} /> },
  { to: '/settings',  label: 'Settings',    icon: <Settings size={18} /> },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-icon">⚡</span>
        <div>
          <div className="sidebar__brand-name">AdSpend</div>
          <div className="sidebar__brand-sub">Optimizer</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' active' : ''}`
            }
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__version">v1.0.0 · BigQuery + Kafka</div>
      </div>
    </aside>
  );
}
