/*import { useState, useCallback, useEffect } from 'react';
import { RiskOverviewTable } from '../components/RiskOverviewTable/RiskOverviewTable';
import { TrendVisualisations } from '../components/TrendVisualisations/TrendVisualisations';
import { GenAINarrativePanel } from '../components/GenAINarrativePanel/GenAINarrativePanel';
import { OperatorQA } from '../components/OperatorQA/OperatorQA';
import { api } from '../services/api';
import styles from './Dashboard.module.css';

/** Sample inverters for demo when API is not available
const SAMPLE_INVERTERS = [
  { inverter_id: 'INV-042', risk_score: 0.82, risk_label: 'HIGH', prediction_window: '7-10 days' },
  { inverter_id: 'INV-018', risk_score: 0.45, risk_label: 'MEDIUM', prediction_window: '7-10 days' },
  { inverter_id: 'INV-033', risk_score: 0.12, risk_label: 'LOW', prediction_window: '7-10 days' },
  { inverter_id: 'INV-007', risk_score: 0.91, risk_label: 'HIGH', prediction_window: '7-10 days' },
];

export function Dashboard() {
  const [inverters, setInverters] = useState([]);
  const [selectedInverter, setSelectedInverter] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState(null);
  const [qaResponses, setQAResponses] = useState([]);
  const [apiHealthy, setApiHealthy] = useState(null);

  useEffect(() => {
    api.getHealth()
      .then(() => setApiHealthy(true))
      .catch(() => setApiHealthy(false));
  }, []);

  useEffect(() => {
    if (apiHealthy === true) {
      api.getInverters().then(setInverters).catch(() => setInverters(SAMPLE_INVERTERS));
    } else if (apiHealthy === false) {
      setInverters(SAMPLE_INVERTERS);
    }
  }, [apiHealthy]);

  const handleSelectInverter = useCallback((inv) => {
    setSelectedInverter(inv);
    setNarrative(null);
    setNarrativeError(null);
  }, []);

  const handleGenerateNarrative = useCallback(async () => {
    if (!selectedInverter) return;
    setNarrativeLoading(true);
    setNarrativeError(null);
    try {
      const res = await api.explain(selectedInverter.inverter_id, {
        risk_score: selectedInverter.risk_score,
        risk_label: selectedInverter.risk_label,
        top_features: selectedInverter.top_features,
      });
      setNarrative(res.narrative);
    } catch (err) {
      setNarrativeError(err.message || 'Failed to fetch narrative');
      setNarrative(
        `[Demo] Inverter ${selectedInverter.inverter_id} shows ${selectedInverter.risk_label} risk. Primary drivers: elevated temperature trends and recent alarm activity. Recommended action: schedule thermal inspection.`
      );
    } finally {
      setNarrativeLoading(false);
    }
  }, [selectedInverter]);

  const handleQuery = useCallback(async (question) => {
    try {
      const res = await api.query(question);
      setQAResponses((prev) => [
        ...prev,
        { question, answer: res.answer || res.response || JSON.stringify(res) },
      ]);
    } catch (err) {
      setQAResponses((prev) => [
        ...prev,
        { question, answer: `Error: ${err.message}. (API may be unavailable.)` },
      ]);
    }
  }, []);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>SolarSight</h1>
        <p>AI-Driven Solar Inverter Failure Prediction & Intelligence</p>
        {apiHealthy !== null && (
          <span className={apiHealthy ? styles.healthOk : styles.healthOff}>
            API {apiHealthy ? 'connected' : 'offline — using sample data'}
          </span>
        )}
      </header>

      <div className={styles.grid}>
        <section className={styles.riskSection}>
          <RiskOverviewTable
            inverters={inverters}
            onSelectInverter={handleSelectInverter}
          />
        </section>

        <section className={styles.trendSection}>
          <TrendVisualisations
            selectedInverter={selectedInverter}
            telemetryData={[]}
            riskScoreHistory={[]}
          />
        </section>

        <section className={styles.narrativeSection}>
          <GenAINarrativePanel
            selectedInverter={selectedInverter}
            narrative={narrative}
            isLoading={narrativeLoading}
            error={narrativeError}
          />
          {selectedInverter && (
            <button
              onClick={handleGenerateNarrative}
              disabled={narrativeLoading}
              className={styles.narrativeButton}
            >
              {narrativeLoading ? 'Generating…' : 'Generate summary'}
            </button>
          )}
        </section>

        <section className={styles.qaSection}>
          <OperatorQA onQuery={handleQuery} responses={qaResponses} />
        </section>
      </div>
    </div>
  );
}*/

import { useState, useCallback, useEffect } from 'react';
import { Navbar } from '../components/Navbar/Navbar';
import { DashboardHome } from './DashboardHome/DashboardHome';
import { RisksPage } from './RisksPage/RisksPage';
import { TrendsPage } from './TrendsPage/TrendsPage';
import { QAPage } from './QAPage/QAPage';
import { SandboxPage } from './SandboxPage/SandboxPage';
import { DiagnosticsPage } from './DiagnosticsPage/DiagnosticsPage';
import { api } from '../services/api';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const [activePage, setActivePage] = useState('dashboard');

  const [inverters, setInverters] = useState([]);
  const [selectedInverter, setSelectedInverter] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState(null);
  const [qaResponses, setQAResponses] = useState([]);
  const [apiHealthy, setApiHealthy] = useState(null);
  const [csvContext, setCsvContext] = useState(null);
  const [modelParameters, setModelParameters] = useState('');

  useEffect(() => {
    api.getHealth()
      .then(() => setApiHealthy(true))
      .catch(() => setApiHealthy(false));
  }, []);

  const handleSelectInverter = useCallback((inv) => {
    setSelectedInverter(inv);
    setNarrative(null);
    setNarrativeError(null);
  }, []);

  const handleGenerateNarrative = useCallback(async () => {
    if (!selectedInverter) return;
    setNarrativeLoading(true);
    setNarrativeError(null);
    try {
      const res = await api.explain(selectedInverter.inverter_id, {
        risk_score: selectedInverter.risk_score,
        risk_label: selectedInverter.risk_label,
        top_features: selectedInverter.top_features,
      }, modelParameters);
      setNarrative(res.narrative);
    } catch (err) {
      setNarrativeError(err.message || 'Failed to fetch narrative');
      setNarrative(
        `[Demo] Inverter ${selectedInverter.inverter_id} shows ${selectedInverter.risk_label} risk. Primary drivers: elevated temperature trends and recent alarm activity. Recommended action: schedule thermal inspection.`
      );
    } finally {
      setNarrativeLoading(false);
    }
  }, [selectedInverter, csvContext, modelParameters]);

  const handleQuery = useCallback(async (question) => {
    try {
      // Create a lightweight, token-efficient summary of the entire fleet
      const fleetSummary = inverters.map(inv => ({
        id: inv.inverter_id,
        risk: inv.risk_label,
        score: inv.risk_score,
        anomalies: inv.top_features?.map(f => f.feature).join(', ') || 'None'
      }));

      const res = await api.query(
        question,
        selectedInverter?.inverter_id,
        selectedInverter?.risk_score,
        selectedInverter?.top_features,
        JSON.stringify(fleetSummary),
        modelParameters
      );
      setQAResponses((prev) => [
        ...prev,
        { question, answer: res.answer || res.response || JSON.stringify(res) },
      ]);
    } catch (err) {
      setQAResponses((prev) => [
        ...prev,
        { question, answer: `Error: ${err.message}. (API may be unavailable.)` },
      ]);
    }
  }, [selectedInverter, inverters, modelParameters]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardHome
            inverters={inverters}
            selectedInverter={selectedInverter}
            csvContext={csvContext}
            onSelectInverter={handleSelectInverter}
          />
        );
      case 'qa':
        return (
          <QAPage
            onQuery={handleQuery}
            qaResponses={qaResponses}
            csvContext={csvContext}
            modelParameters={modelParameters}
          />
        );
      case 'sandbox':
        return (
          <SandboxPage
            onResultsUpdate={(results, rawCsvText) => {
              setInverters(results);
              if (rawCsvText) {
                setCsvContext(rawCsvText);
              }
              setActivePage('dashboard');
              /* if (results.length > 0) {
                setSelectedInverter(results[0]);
              } */
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.dashboard}>
      <Navbar
        activePage={activePage}
        onPageChange={setActivePage}
        apiHealthy={apiHealthy}
      />
      <main className={styles.main}>
        <div className={styles.content}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}