import { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import InputPage from './components/InputPage';
import LoadingScreen from './components/LoadingScreen';
import ResultsPage from './components/ResultsPage';
import CommunitiesPage from './components/CommunitiesPage';
import { generatePodcast } from './api';
import type { Stage } from './api';
import type { GenerateRequest, PodcastResult } from './types';

type Screen = 'input' | 'loading' | 'results' | 'communities';

function App() {
  const [screen, setScreen] = useState<Screen>('input');
  const [result, setResult] = useState<PodcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const lastReqRef = useRef<GenerateRequest | null>(null);

  const handleGenerate = useCallback(async (req: GenerateRequest) => {
    lastReqRef.current = req;
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setCurrentStage(null);
    setScreen('loading');

    try {
      const data = await generatePodcast(req, (stage: Stage) => {
        setCurrentStage(stage);
      });
      // Brief pause on "complete" before transitioning
      await new Promise((r) => setTimeout(r, 600));
      setResult(data);
      setScreen('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate podcast.');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (lastReqRef.current) {
      handleGenerate(lastReqRef.current);
    } else {
      handleReset();
    }
  }, [handleGenerate]);

  const handleReset = useCallback(() => {
    setScreen('input');
    setResult(null);
    setError(null);
    setIsSubmitting(false);
    setCurrentStage(null);
  }, []);

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <header className="w-full py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-gold">{'\uD83C\uDF99\uFE0F'}</span>{' '}
            <span className="text-text-primary">Paper</span>
            <span className="text-gold">Cast</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">Your research. Your commute. Your podcast.</p>
          <nav className="flex gap-4 mt-3">
            <button
              onClick={handleReset}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                screen !== 'communities'
                  ? 'text-gold bg-gold/10'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Create
            </button>
            <button
              onClick={() => setScreen('communities')}
              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                screen === 'communities'
                  ? 'text-gold bg-gold/10'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Communities
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center py-6 md:py-10">
        <AnimatePresence mode="wait">
          {screen === 'input' && (
            <InputPage
              key="input"
              onGenerate={handleGenerate}
              isSubmitting={isSubmitting}
            />
          )}
          {screen === 'loading' && (
            <LoadingScreen
              key="loading"
              stage={currentStage}
              error={error}
              onRetry={handleRetry}
            />
          )}
          {screen === 'results' && result && (
            <ResultsPage
              key="results"
              result={result}
              onReset={handleReset}
            />
          )}
          {screen === 'communities' && (
            <CommunitiesPage key="communities" />
          )}
        </AnimatePresence>
      </main>

      <footer className="w-full py-4 px-4 text-center">
        <p className="text-xs text-text-muted">
          PaperCast {'\u2014'} Transform research into audio
        </p>
      </footer>
    </div>
  );
}

export default App;
