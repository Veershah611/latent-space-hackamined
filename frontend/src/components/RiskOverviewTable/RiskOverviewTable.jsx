/*import { RISK_LEVELS } from '../../utils/constants';
import styles from './RiskOverviewTable.module.css';

/**
 * Risk overview table — All inverters sorted by risk score,
 * color-coded by severity (Low / Medium / High)
 
export function RiskOverviewTable({ inverters = [], onSelectInverter }) {
  const getRiskStyle = (label) => {
    const level = RISK_LEVELS[label] || RISK_LEVELS.MEDIUM;
    return {
      color: level.color,
      backgroundColor: level.bgColor,
    };
  };

  const sortedInverters = [...inverters].sort(
    (a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)
  );

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''} ${expanded ? styles.expanded : ''}`}>
    <div className={styles.container}>
      <h2 className={styles.title}>Risk Overview</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Inverter ID</th>
              <th>Risk Score</th>
              <th>Risk Level</th>
              <th>Prediction Window</th>
            </tr>
          </thead>
          <tbody>
            {sortedInverters.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  No inverter data. Connect to API or load sample data.
                </td>
              </tr>
            ) : (
              sortedInverters.map((inv) => (
                <tr
                  key={inv.inverter_id}
                  onClick={() => onSelectInverter?.(inv)}
                  className={styles.row}
                >
                  <td>{inv.inverter_id}</td>
                  <td>{(inv.risk_score ?? 0).toFixed(2)}</td>
                  <td>
                    <span
                      className={styles.badge}
                      style={getRiskStyle(inv.risk_label)}
                    >
                      {inv.risk_label || '—'}
                    </span>
                  </td>
                  <td>{inv.prediction_window || '7-10 days'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}*/

import { AlertTriangle } from 'lucide-react';
import { RISK_LEVELS } from '../../utils/constants.js';
import styles from './RiskOverviewTable.module.css';

/**
 * Risk overview table — All inverters sorted by risk score,
 * color-coded by severity (Low / Medium / High)
 */
export function RiskOverviewTable({ inverters = [], onSelectInverter, compact = false, expanded = false }) {
  const sortedInverters = [...inverters].sort(
    (a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)
  );

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''} ${expanded ? styles.expanded : ''}`}>
      {!compact && <h2 className={styles.title}>Detailed Risk Assessments</h2>}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Inverter ID</th>
              <th>Risk Score</th>
              <th>Risk Level</th>
              <th>Prediction Window</th>
            </tr>
          </thead>
          <tbody>
            {sortedInverters.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No inverter data available. Please upload a CSV in the Sandbox.
                </td>
              </tr>
            ) : (
              sortedInverters.map((inv) => {
                const isHighRisk = inv.risk_label === 'HIGH';
                return (
                  <tr
                    key={inv.inverter_id}
                    onClick={() => onSelectInverter?.(inv)}
                    className={`${styles.row} ${isHighRisk ? styles.highRiskRow : ''}`}
                  >
                    <td className={styles.statusCell}>
                      {isHighRisk ? (
                        <AlertTriangle className={styles.dangerIcon} size={20} />
                      ) : (
                        <div className={styles.statusDot} style={{ backgroundColor: RISK_LEVELS[inv.risk_label]?.color || '#ccc' }} />
                      )}
                    </td>
                    <td className={styles.idCell}>{inv.inverter_id}</td>
                    <td className={styles.scoreCell}>
                      <span className={styles.scoreValue}>
                        {(inv.risk_score ?? 0).toFixed(4)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={styles.badge}
                        style={{
                          color: RISK_LEVELS[inv.risk_label]?.color,
                          backgroundColor: RISK_LEVELS[inv.risk_label]?.bgColor,
                        }}
                      >
                        {inv.risk_label || '—'}
                      </span>
                    </td>
                    <td className={styles.windowCell}>{inv.prediction_window || '7-10 days'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
