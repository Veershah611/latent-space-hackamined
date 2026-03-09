import { useState, useRef } from 'react';
import { api } from '../../services/api';
import { Beaker, UploadCloud, FileSpreadsheet } from 'lucide-react';
import styles from './SandboxPage.module.css';

export function SandboxPage({ onResultsUpdate }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setResults(null);
        setError(null);
      } else {
        setError('Please drop a valid .csv file.');
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handlePredictCSV = async () => {
    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await api.predictCSV(file);
      if (data && data.results) {
        setResults(data.results);

        // Read file contents as text to pass as context
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvText = e.target.result;
          if (onResultsUpdate) {
            onResultsUpdate(data.results, csvText);
          }
        };
        reader.onerror = () => {
          if (onResultsUpdate) {
            onResultsUpdate(data.results, null); // Fallback if read fails
          }
        };
        reader.readAsText(file);
      } else {
        setError('Unexpected API response format.');
      }
    } catch (err) {
      setError(err.message || 'CSV Prediction failed. Ensure backend has python-multipart installed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.sandboxPage}>
      <header className={styles.header}>
        <div className={styles.headerTitleWrapper}>
          <Beaker className={styles.headerIcon} size={28} />
          <h1 className={styles.title}>Risk Analyzer (Batch CSV)</h1>
        </div>
        <p className={styles.subtitle}>
          Upload a CSV containing your inverter telemetry data.
        </p>
      </header>

      <div className={styles.content}>
        <div className={styles.card}>
          <div
            className={styles.dropZone}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleUploadClick}
          >
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {file ? (
              <div className={styles.fileSelected}>
                <FileSpreadsheet className={styles.fileIcon} size={32} />
                <span className={styles.fileName}>{file.name}</span>
                <p className={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            ) : (
              <div className={styles.dropPrompt}>
                <UploadCloud className={styles.uploadIcon} size={48} />
                <p>Click or drag and drop a CSV file here</p>
              </div>
            )}
          </div>

          <button
            className={styles.predictBtn}
            onClick={handlePredictCSV}
            disabled={loading || !file}
          >
            {loading ? 'Running Batch Inference...' : 'Upload & Predict CSV'}
          </button>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        {results && results.length > 0 && (
          <div className={styles.resultsCard}>
            <h2 className={styles.resultTitle}>Batch Prediction Results ({results.length} rows)</h2>
            <div className={styles.tableWrapper}>
              <table className={styles.resultsTable}>
                <thead>
                  <tr>
                    <th>Inverter ID</th>
                    <th>Risk Score</th>
                    <th>Risk Label</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    <tr key={idx}>
                      <td className={styles.fwBold}>{row.inverter_id}</td>
                      <td>{row.risk_score.toFixed(4)}</td>
                      <td>
                        <span className={`${styles.riskBadge} ${styles[row.risk_label.toLowerCase()]}`}>
                          {row.risk_label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
