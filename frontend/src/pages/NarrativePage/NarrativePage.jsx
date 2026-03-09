import { RiskOverviewTable } from '../../components/RiskOverviewTable/RiskOverviewTable';
import { GenAINarrativePanel } from '../../components/GenAINarrativePanel/GenAINarrativePanel';
import { Bot, Search, Sparkles } from 'lucide-react';
import styles from './NarrativePage.module.css';

export function NarrativePage({ inverters, selectedInverter, onSelectInverter, narrative, narrativeLoading, narrativeError, onGenerateNarrative }) {
  return (
    <div className={styles.narrativePage}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleWrapper}>
          <Bot className={styles.headerIcon} size={28} />
          <h1 className={styles.pageTitle}>AI-Powered Insights</h1>
        </div>
        <p className={styles.pageDescription}>
          Select an inverter to generate detailed maintenance summaries
        </p>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.inverterSection}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <Search className={styles.sectionIcon} size={20} />
              Inverter Selection
            </h2>
            <RiskOverviewTable
              inverters={inverters}
              onSelectInverter={onSelectInverter}
              compact={true}
            />
          </div>
        </div>

        <div className={styles.narrativeSection}>
          <div className={styles.sectionCard}>
            <h2 className={styles.sectionTitle}>
              <Bot className={styles.sectionIcon} size={20} />
              AI Maintenance Summary
            </h2>
            <GenAINarrativePanel
              selectedInverter={selectedInverter}
              narrative={narrative}
              isLoading={narrativeLoading}
              error={narrativeError}
            />
            {selectedInverter && (
              <button
                onClick={onGenerateNarrative}
                disabled={narrativeLoading}
                className={styles.generateButton}
              >
                {narrativeLoading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Generate Summary</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
/*import { RiskOverviewTable } from '../../components/RiskOverviewTable/RiskOverviewTable';
import { GenAINarrativePanel } from '../../components/GenAINarrativePanel/GenAINarrativePanel';
import styles from './NarrativePage.module.css';

export function NarrativePage({ inverters, selectedInverter, onSelectInverter, narrative, narrativeLoading, narrativeError, onGenerateNarrative }) {
  return (
    <div className={styles.narrativePage}>
      <h1>AI Narrative</h1>
      <RiskOverviewTable
        inverters={inverters}
        onSelectInverter={onSelectInverter}
        compact={true}
      />
      <GenAINarrativePanel
        selectedInverter={selectedInverter}
        narrative={narrative}
        isLoading={narrativeLoading}
        error={narrativeError}
      />
      {selectedInverter && (
        <button onClick={onGenerateNarrative} disabled={narrativeLoading}>
          {narrativeLoading ? 'Generating...' : 'Generate Summary'}
        </button>
      )}
    </div>
  );
}*/