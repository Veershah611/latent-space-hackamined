import { useState } from 'react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { id: 'narrative', label: 'AI Narrative', icon: '📊', description: 'AI-powered maintenance insights' },
  { id: 'dashboard', label: 'Dashboard', icon: '📈', description: 'Overview & key metrics' },
  { id: 'risks', label: 'Predicted Risks', icon: '⚠️', description: 'Risk assessment table' },
  { id: 'trends', label: 'Trend Visualizations', icon: '📉', description: 'Performance trends' },
  { id: 'qa', label: 'Operator Q&A', icon: '💬', description: 'Ask questions' },
  { id: 'sandbox', label: 'Model Sandbox', icon: '🧪', description: 'Test ML inference' },
];

export function Sidebar({ activePage, onPageChange, isCollapsed, onToggle }) {
  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.logoArea}>
        <div className={styles.logo}>
          <span className={styles.sunIcon}>☀️</span>
          {!isCollapsed && <span className={styles.logoText}>SolarSight</span>}
        </div>
        <button onClick={onToggle} className={styles.toggleBtn}>
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`${styles.navItem} ${activePage === item.id ? styles.active : ''}`}
            onClick={() => onPageChange(item.id)}
            title={isCollapsed ? item.label : ''}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {!isCollapsed && (
              <div className={styles.navText}>
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.navDescription}>{item.description}</span>
              </div>
            )}
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        {!isCollapsed && (
          <div className={styles.solarStatus}>
            <span className={styles.sunStatus}>☀️ Peak Solar Hours</span>
            <span className={styles.sunTime}>10:00 - 16:00</span>
          </div>
        )}
      </div>
    </aside>
  );
}