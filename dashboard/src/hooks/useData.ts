import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchCampaigns, fetchFunnel, fetchHourly, fetchPipeline,
  generateMockKPI,
} from '../utils/api';
import type {
  CampaignMetric, FunnelStage, HourlyMetric,
  KPISummary, PipelineStatus,
} from '../types';

const REFRESH_MS = Number(import.meta.env.VITE_REFRESH_INTERVAL_MS ?? 30000);

interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

function usePolledData<T>(
  fetcher: () => Promise<T>,
  intervalMs = REFRESH_MS,
): UseDataResult<T> {
  const [data, setData]             = useState<T | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await fetcher();
      setData(result);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load, intervalMs]);

  return { data, loading, error, refresh: load, lastUpdated };
}

export function useCampaigns() {
  return usePolledData(fetchCampaigns);
}

export function useFunnel() {
  return usePolledData(fetchFunnel);
}

export function useHourly() {
  return usePolledData(fetchHourly, 60_000);
}

export function usePipeline() {
  return usePolledData(fetchPipeline, 10_000);
}

export function useKPI(campaigns: CampaignMetric[] | null): KPISummary | null {
  if (!campaigns) return null;
  return generateMockKPI(campaigns);
}

// ─── Platform filter hook ─────────────────────────────────────────────────────
export function usePlatformFilter(campaigns: CampaignMetric[] | null) {
  const [platform, setPlatform] = useState<string>('all');

  const filtered = campaigns
    ? platform === 'all'
      ? campaigns
      : campaigns.filter(c => c.platform === platform)
    : [];

  return { platform, setPlatform, filtered };
}
