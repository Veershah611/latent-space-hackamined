import { DiagnosticsPage } from '../DiagnosticsPage/DiagnosticsPage';
import { RiskOverviewTable } from '../../components/RiskOverviewTable/RiskOverviewTable';
import { LayoutGrid } from 'lucide-react';
import styles from './DashboardHome.module.css';

export function DashboardHome({
  inverters,
  selectedInverter,
  csvContext,
  onSelectInverter
}) {
  return (
    <div className={styles.dashboardHome}>
      <div className={styles.sectionHeader}>
        <div style={{ textAlign: "center", width: "100%" }}>
          <h1 className={styles.sectionTitle}>
            {selectedInverter ? `Diagnostics: ${selectedInverter.inverter_id}` : "Fleet Overview"}
          </h1>
          <p className={styles.sectionSubtitle}>
            {selectedInverter
              ? `Detailed failure analysis for inverter ${selectedInverter.inverter_id}`
              : "Monitoring full fleet performance and predictive failure risks"}
          </p>
        </div>
        {selectedInverter && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "12px" }}>
            <button
              onClick={() => onSelectInverter(null)}
              style={{
                background: "#1a1a26",
                color: "#4cc9f0",
                border: "1px solid #1e1e2e",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <LayoutGrid size={16} />
              Back to Fleet
            </button>
          </div>
        )}
      </div>

      {selectedInverter ? (
        <DiagnosticsPage
          inverters={inverters}
          selectedInverter={selectedInverter}
          csvContext={csvContext}
          onSelectInverter={onSelectInverter}
        />
      ) : inverters.length > 0 ? (
        <div style={{ animation: "fadeIn 0.5s ease-out" }}>
          <RiskOverviewTable
            inverters={inverters}
            onSelectInverter={onSelectInverter}
          />
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#666" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📊</div>
          <div style={{ fontSize: "16px", marginBottom: "8px" }}>No Data Loaded</div>
          <div style={{ fontSize: "14px" }}>Please upload a dataset in the Risk Analyzer tab to run the AI diagnostics.</div>
        </div>
      )}
    </div>
  );
}