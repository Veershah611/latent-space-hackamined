import { Sparkles, AlertCircle } from 'lucide-react';
import styles from './GenAINarrativePanel.module.css';

/**
 * GenAI narrative panel — Auto-generated plain-English summary
 * for the selected inverter (from POST /explain)
 */
export function GenAINarrativePanel({
  selectedInverter,
  narrative,
  isLoading,
  error,
}) {
  if (!selectedInverter) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Sparkles className={styles.aiIcon} size={20} />
          <h2 className={styles.title}>AI Maintenance Summary</h2>
        </div>
        <div className={styles.placeholderBox}>
          <p className={styles.placeholderText}>
            Select an inverter to generate an AI-powered insights summary
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Sparkles className={styles.aiIcon} size={20} />
        <h2 className={styles.title}>
          AI Summary — {selectedInverter.inverter_id}
        </h2>
      </div>
      <div className={styles.contentBox}>
        {isLoading && (
          <div className={styles.loadingBox}>
            <div className={styles.loadingPulse}></div>
            <p className={styles.loadingText}>Generating AI narrative...</p>
          </div>
        )}
        {error && (
          <div className={styles.errorBox}>
            <AlertCircle size={18} />
            <p className={styles.errorText}>{error}</p>
          </div>
        )}
        {!isLoading && !error && narrative && (
          <div className={styles.narrativeContent}>
            <p className={styles.narrativeText}>{narrative}</p>
          </div>
        )}
        {!isLoading && !error && !narrative && (
          <div className={styles.placeholderBox}>
            <p className={styles.placeholderText}>
              Click "Generate summary" to fetch AI insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
