import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Dashboard } from './pages/Dashboard';
import { Preloader } from './components/Preloader/Preloader';
import { WelcomeToast } from './components/WelcomeToast/WelcomeToast';
import './index.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  const handleLoadingComplete = () => {
    setIsLoading(false);
    // Show welcome message shortly after preloader slides up
    setTimeout(() => {
      setShowWelcome(true);
    }, 800);
  };

  return (
    <>
      <Dashboard />
      <WelcomeToast
        show={showWelcome}
        onClose={() => setShowWelcome(false)}
      />
      <AnimatePresence>
        {isLoading && <Preloader key="preloader" onComplete={handleLoadingComplete} />}
      </AnimatePresence>
    </>
  );
}

export default App;
