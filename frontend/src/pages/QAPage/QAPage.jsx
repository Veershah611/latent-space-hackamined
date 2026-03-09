import { useState, useEffect } from 'react';
import { OperatorQA } from '../../components/OperatorQA/OperatorQA';
import { api } from '../../services/api';
import { MessageSquare, Sparkles } from 'lucide-react';
import styles from './QAPage.module.css';

export function QAPage({ onQuery, qaResponses }) {
  return (
    <div className={styles.qaPage}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTitleWrapper}>
          <MessageSquare className={styles.headerIcon} size={28} />
          <h1 className={styles.pageTitle}>Operator Assistant</h1>
        </div>
        <p className={styles.pageDescription}>
          Ask questions about inverter performance, risks, and maintenance
        </p>
      </div>

      <div className={styles.qaContainer}>
        <OperatorQA onQuery={onQuery} responses={qaResponses} />
      </div>

      <div className={styles.suggestions}>
        <h3 className={styles.suggestionsTitle}>Suggested Questions:</h3>
        <div className={styles.suggestionChips}>
          {/* Static General Questions */}
          <button className={styles.chip} onClick={() => onQuery("Which inverters are at high risk?")}>
            Which inverters are at high risk?
          </button>
          <button className={styles.chip} onClick={() => onQuery("What maintenance is recommended for high risk inverters?")}>
            What maintenance is recommended?
          </button>

        </div>
      </div>
    </div>
  );
}

/*import { OperatorQA } from '../../components/OperatorQA/OperatorQA';
import styles from './QAPage.module.css';

export function QAPage({ onQuery, qaResponses }) {
  return (
    <div className={styles.qaPage}>
      <h1>Operator Q&A</h1>
      <OperatorQA onQuery={onQuery} responses={qaResponses} />
    </div>
  );
}*/