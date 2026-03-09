import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import styles from './TrendVisualisations.module.css';

/**
 * Trend visualisations — Time-series charts of key telemetry signals
 * and risk score evolution per inverter
 */
export function TrendVisualisations({
  selectedInverter,
  telemetryData = [],
  riskScoreHistory = [],
}) {
  if (!selectedInverter) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Trend Visualisations</h2>
        <div className={styles.placeholder}>
          Select an inverter from the Risk Overview table to view trends
        </div>
      </div>
    );
  }

  const chartData = telemetryData.length > 0 ? telemetryData : riskScoreHistory;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        Trends — {selectedInverter.inverter_id}
      </h2>
      <div className={styles.chartWrapper}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                tickFormatter={(v) =>
                  typeof v === 'string' ? v.slice(0, 10) : v
                }
              />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
                formatter={(value) => [Number(value).toFixed(2)]}
                labelFormatter={(label) =>
                  typeof label === 'string' ? label.slice(0, 16) : label
                }
              />
              <Legend wrapperStyle={{ color: 'var(--text-primary)' }} />
              {chartData[0]?.dc_voltage != null && (
                <Line
                  type="monotone"
                  dataKey="dc_voltage"
                  stroke="#3b82f6"
                  name="DC Voltage"
                  dot={false}
                  strokeWidth={2}
                />
              )}
              {chartData[0]?.ac_power != null && (
                <Line
                  type="monotone"
                  dataKey="ac_power"
                  stroke="#10b981"
                  name="AC Power"
                  dot={false}
                  strokeWidth={2}
                />
              )}
              {chartData[0]?.temperature != null && (
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f59e0b"
                  name="Temperature"
                  dot={false}
                  strokeWidth={2}
                />
              )}
              {chartData[0]?.risk_score != null && (
                <Line
                  type="monotone"
                  dataKey="risk_score"
                  stroke="#ef4444"
                  name="Risk Score"
                  dot={false}
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={styles.placeholder}>
            No trend data available for this inverter
          </div>
        )}
      </div>
    </div>
  );
}
