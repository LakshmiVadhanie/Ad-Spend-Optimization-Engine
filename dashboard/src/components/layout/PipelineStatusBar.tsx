import { format, parseISO } from 'date-fns';
import type { PipelineStatus } from '../../types';
import { Activity, Zap, Clock, Database } from 'lucide-react';

interface Props { status: PipelineStatus }

export default function PipelineStatusBar({ status }: Props) {
  const isHealthy = status.spark_status === 'running' && status.kafka_lag < 500;

  return (
    <div className={`pipeline-bar ${isHealthy ? 'healthy' : 'degraded'}`}>
      <div className="pipeline-bar__indicator">
        <span className={`pulse-dot ${isHealthy ? 'green' : 'red'}`} />
        <span>Pipeline {isHealthy ? 'Healthy' : 'Degraded'}</span>
      </div>

      <div className="pipeline-bar__stats">
        <span className="pipe-stat">
          <Zap size={12} />
          {status.events_per_second} events/s
        </span>
        <span className="pipe-stat">
          <Activity size={12} />
          Kafka lag: {status.kafka_lag.toLocaleString()} msgs
        </span>
        <span className="pipe-stat">
          <Database size={12} />
          BQ latency: {status.bq_write_latency_ms}ms
        </span>
        <span className="pipe-stat">
          <Clock size={12} />
          Last batch: {format(parseISO(status.last_batch_ts), 'HH:mm:ss')}
        </span>
      </div>

      <div className="pipeline-bar__spark">
        Spark: <span className={`spark-badge ${status.spark_status}`}>{status.spark_status}</span>
      </div>
    </div>
  );
}
