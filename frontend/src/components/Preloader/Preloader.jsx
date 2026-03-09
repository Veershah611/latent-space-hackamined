import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Zap, PanelTop } from 'lucide-react';
import styles from './Preloader.module.css';

const BlurText = ({ text }) => {
  const characters = text.split('');
  return (
    <div className={styles.blurTextContainer}>
      {characters.map((char, index) => (
        <motion.span
          key={index}
          initial={{ filter: 'blur(20px)', opacity: 0, y: 20 }}
          animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: index * 0.1,
            ease: [0.2, 0.65, 0.3, 0.9],
          }}
          className={styles.char}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </div>
  );
};

export const Preloader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2500; // 2.5 seconds loading
    const interval = 50;
    const steps = duration / interval;
    const increment = 100 / steps;

    let currentProgress = 0;
    const timer = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(timer);
        setTimeout(() => {
          onComplete();
        }, 300); // Small pause at 100% before triggering exit
      }
      setProgress(currentProgress);
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      className={styles.preloaderContainer}
      initial={{ y: 0 }}
      exit={{
        y: '-100%',
        transition: {
          type: 'spring',
          stiffness: 70,
          damping: 15,
          mass: 1
        }
      }}
    >
      <div className={styles.content}>
        <div className={styles.graphicsContainer}>
          <motion.div
            className={styles.sun}
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <Sun size={80} color="var(--accent-primary, #4cc9f0)" strokeWidth={1.5} />
          </motion.div>

          <motion.div
            className={styles.panel}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <PanelTop size={100} color="var(--text-heading, #fff)" strokeWidth={1.5} />
          </motion.div>

          <motion.div
            className={styles.zap}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.8, 1.2, 0.8],
              y: [-10, 10, -10]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "circInOut"
            }}
          >
            <Zap size={48} color="var(--accent-secondary, #7b2fbe)" strokeWidth={2} fill="var(--accent-secondary, #7b2fbe)" />
          </motion.div>
        </div>

        <BlurText text="SolarSight" />

        <motion.div
          className={styles.subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          Powering the Future
        </motion.div>
      </div>

      <div className={styles.progressContainer}>
        <div className={styles.progressText}>{Math.round(progress)}%</div>
        <div className={styles.progressBarWrapper}>
          <motion.div
            className={styles.progressBar}
            style={{ width: `${progress}%` }}
            layout
          />
        </div>
      </div>
    </motion.div>
  );
};
