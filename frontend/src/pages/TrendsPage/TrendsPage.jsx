import { TrendVisualisations } from '../../components/TrendVisualisations/TrendVisualisations';
import { RiskOverviewTable } from '../../components/RiskOverviewTable/RiskOverviewTable';
import { TrendingUp } from 'lucide-react';
import styles from './TrendsPage.module.css';

export function TrendsPage({ inverters, selectedInverter, onSelectInverter }) {
  return (
    <div className={styles.trendsPage}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleWrapper}>
          <TrendingUp className={styles.headerIcon} size={28} />
          <h1 className={styles.pageTitle}>Performance Trends</h1>
        </div>
        <p className={styles.pageDescription}>
          Historical data and predictive trends for inverter performance
        </p>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.selectorCard}>
          <h2 className={styles.cardTitle}>Select Inverter</h2>
          <RiskOverviewTable
            inverters={inverters}
            onSelectInverter={onSelectInverter}
            compact={true}
          />
        </div>

        <div className={styles.trendsCard}>
          <h2 className={styles.cardTitle}>
            {selectedInverter ? (
              <>Trends: {selectedInverter.inverter_id}</>
            ) : (
              'No Inverter Selected'
            )}
          </h2>
          <TrendVisualisations
            selectedInverter={selectedInverter}
            telemetryData={[]}
            riskScoreHistory={[]}
          />
        </div>
      </div>
    </div>
  );
}
/*import { TrendVisualisations } from '../../components/TrendVisualisations/TrendVisualisations';
import { RiskOverviewTable } from '../../components/RiskOverviewTable/RiskOverviewTable';
import styles from './TrendsPage.module.css';

export function TrendsPage({ inverters, selectedInverter, onSelectInverter }) {
  return (
    <div className={styles.trendsPage}>
      <h1>Trend Visualizations</h1>
      <RiskOverviewTable
        inverters={inverters}
        onSelectInverter={onSelectInverter}
        compact={true}
      />
      <TrendVisualisations
        selectedInverter={selectedInverter}
        telemetryData={[]}
        riskScoreHistory={[]}
      />
    </div>
  );
}*/