import { useState, useMemo } from 'react';
import { useCampaigns } from '../../hooks/useData';
import { fmt, PLATFORM_COLORS } from '../../utils/formatters';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { CampaignMetric } from '../../types';

type SortKey = keyof CampaignMetric;
type SortDir = 'asc' | 'desc';

export default function Campaigns() {
  const { data: campaigns, loading } = useCampaigns();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'total_spend_usd', dir: 'desc',
  });
  const [search, setSearch] = useState('');

  // Aggregate by campaign_id across dates
  const aggregated = useMemo(() => {
    if (!campaigns) return [];
    const map = new Map<string, CampaignMetric>();
    campaigns.forEach(c => {
      const existing = map.get(c.campaign_id);
      if (!existing) {
        map.set(c.campaign_id, { ...c });
      } else {
        existing.total_impressions  += c.total_impressions;
        existing.total_clicks       += c.total_clicks;
        existing.total_conversions  += c.total_conversions;
        existing.total_spend_usd    += c.total_spend_usd;
        existing.total_revenue_usd  += c.total_revenue_usd;
      }
    });
    // Recalculate derived
    return Array.from(map.values()).map(c => ({
      ...c,
      ctr:  c.total_clicks / Math.max(c.total_impressions, 1),
      cvr:  c.total_conversions / Math.max(c.total_clicks, 1),
      roas: c.total_revenue_usd / Math.max(c.total_spend_usd, 1),
      cpc:  c.total_spend_usd / Math.max(c.total_clicks, 1),
      cpa:  c.total_spend_usd / Math.max(c.total_conversions, 1),
    }));
  }, [campaigns]);

  const sorted = useMemo(() => {
    const filtered = aggregated.filter(c =>
      c.campaign_name.toLowerCase().includes(search.toLowerCase()) ||
      c.platform.toLowerCase().includes(search.toLowerCase())
    );
    return filtered.sort((a, b) => {
      const av = a[sort.key] as number;
      const bv = b[sort.key] as number;
      return sort.dir === 'desc' ? bv - av : av - bv;
    });
  }, [aggregated, sort, search]);

  function toggleSort(key: SortKey) {
    setSort(s => s.key === key
      ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
      : { key, dir: 'desc' }
    );
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sort.key !== k) return <ArrowUpDown size={13} className="sort-icon muted" />;
    return sort.dir === 'desc'
      ? <ArrowDown size={13} className="sort-icon active" />
      : <ArrowUp size={13} className="sort-icon active" />;
  }

  if (loading && !campaigns) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Campaigns</h1>
        <input
          className="search-input"
          placeholder="Search campaigns…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Platform</th>
              <th onClick={() => toggleSort('total_spend_usd')} className="sortable">
                Spend <SortIcon k="total_spend_usd" />
              </th>
              <th onClick={() => toggleSort('total_revenue_usd')} className="sortable">
                Revenue <SortIcon k="total_revenue_usd" />
              </th>
              <th onClick={() => toggleSort('roas')} className="sortable">
                ROAS <SortIcon k="roas" />
              </th>
              <th onClick={() => toggleSort('ctr')} className="sortable">
                CTR <SortIcon k="ctr" />
              </th>
              <th onClick={() => toggleSort('cvr')} className="sortable">
                CVR <SortIcon k="cvr" />
              </th>
              <th onClick={() => toggleSort('cpc')} className="sortable">
                CPC <SortIcon k="cpc" />
              </th>
              <th onClick={() => toggleSort('total_conversions')} className="sortable">
                Conv. <SortIcon k="total_conversions" />
              </th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.campaign_id}>
                <td>
                  <div className="campaign-name">{c.campaign_name}</div>
                  <div className="campaign-id muted">{c.campaign_id}</div>
                </td>
                <td>
                  <span
                    className="platform-badge"
                    style={{ background: PLATFORM_COLORS[c.platform] + '22', color: PLATFORM_COLORS[c.platform] }}
                  >
                    {c.platform}
                  </span>
                </td>
                <td>{fmt.currency(c.total_spend_usd)}</td>
                <td>{fmt.currency(c.total_revenue_usd)}</td>
                <td className={c.roas >= 3 ? 'text-green' : 'text-amber'}>{fmt.roas(c.roas)}</td>
                <td>{fmt.percent(c.ctr)}</td>
                <td>{fmt.percent(c.cvr)}</td>
                <td>{fmt.currencyFull(c.cpc)}</td>
                <td>{fmt.number(c.total_conversions)}</td>
                <td>
                  <span className={`status-dot ${c.meets_roas_target ? 'green' : 'amber'}`}>
                    {c.meets_roas_target ? 'On Target' : 'Below Target'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
