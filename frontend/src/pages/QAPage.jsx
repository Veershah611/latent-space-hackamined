import { useState, useCallback } from 'react';
import { OperatorQA } from '../components/OperatorQA/OperatorQA';
import { api } from '../services/api';
import styles from './QAPage.module.css';

export function QAPage() {
    const [qaResponses, setQAResponses] = useState([]);

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
        <div className={styles.qaPage}>
            <header className={styles.header}>
                <h1>SolarSight Q&A</h1>
                <p>Ask operational questions about solar inverter health and activity.</p>
            </header>

            <div className={styles.qaContainer}>
                <OperatorQA onQuery={handleQuery} responses={qaResponses} />
            </div>
        </div>
    );
}
