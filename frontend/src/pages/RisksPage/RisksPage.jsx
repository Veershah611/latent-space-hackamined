import { RiskOverviewTable } from '../../components/RiskOverviewTable/RiskOverviewTable';
import { AlertTriangle } from 'lucide-react';
import styles from './Riskspage.module.css';

export function RisksPage({ inverters, onSelectInverter }) {
  return (
    <div className={styles.risksPage}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleWrapper}>
          <AlertTriangle className={styles.headerIcon} size={28} />
          <h1 className={styles.pageTitle}>Predicted Risks Analysis</h1>
        </div>
        <p className={styles.pageDescription}>
          Comprehensive view of all inverter risk assessments
        </p>
      </div>

      <div className={styles.tableContainer}>
        <RiskOverviewTable
          inverters={inverters}
          onSelectInverter={onSelectInverter}
          expanded={true}
        />
      </div>
    </div>
  );
}
/*import { RiskOverviewTable } from '../../components/RiskOverviewTable/RiskOverviewTable';
import styles from './RisksPage.module.css';

export function RisksPage({ inverters, onSelectInverter }) {
  return (
    <div className={styles.risksPage}>
      <h1>Predicted Risks</h1>
      <RiskOverviewTable
        inverters={inverters}
        onSelectInverter={onSelectInverter}
        expanded={true}
      />
    </div>
  );
}*/