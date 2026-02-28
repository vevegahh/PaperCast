import { motion } from 'framer-motion';

interface LoadingScreenProps {
  stage: string | null;
  error: string | null;
  onRetry: () => void;
}

const STEPS = [
  { key: 'reading', label: 'Reading your content', icon: '\uD83D\uDCD6', stage: null },
  { key: 'llm', label: 'Writing podcast script', icon: '\u270D\uFE0F', stage: 'llm' },
  { key: 'wavespeed', label: 'Generating cover art', icon: '\uD83C\uDFA8', stage: 'wavespeed' },
  { key: 'tts', label: 'Recording narration', icon: '\uD83C\uDF99\uFE0F', stage: 'tts' },
  { key: 'merging', label: 'Mixing final episode', icon: '\uD83C\uDF9A\uFE0F', stage: 'merging' },
  { key: 'complete', label: 'Episode ready!', icon: '\u2705', stage: 'complete' },
];

function getStepState(stepIndex: number, currentStage: string | null): 'pending' | 'active' | 'complete' {
  const stageOrder = [null, 'llm', 'wavespeed', 'tts', 'merging', 'complete'];
  const currentIndex = currentStage ? stageOrder.indexOf(currentStage) : 0;

  if (stepIndex === 0 && currentIndex >= 0) return 'complete';
  if (stepIndex < currentIndex) return 'complete';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
}

export default function LoadingScreen({ stage, error, onRetry }: LoadingScreenProps) {
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[720px] mx-auto px-4"
      >
        <div className="bg-surface rounded-2xl border border-error/30 p-8 text-center">
          <div className="text-4xl mb-4">{'\u274C'}</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h2>
          <p className="text-sm text-text-muted mb-6">{error}</p>
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-gold text-black font-semibold rounded-xl hover:bg-gold-hover transition-colors"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[720px] mx-auto px-4"
    >
      <div className="bg-surface rounded-2xl border border-border p-6 md:p-8">
        <h2 className="text-xl font-bold text-text-primary mb-1">Producing your episode...</h2>
        <p className="text-sm text-text-muted mb-8">This takes about 30{'\u2013'}60 seconds</p>

        {/* Step Progress */}
        <div className="space-y-4 mb-8">
          {STEPS.map((step, i) => {
            const state = getStepState(i, stage);
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {state === 'complete' && (
                    <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {state === 'active' && (
                    <div className="w-3 h-3 rounded-full bg-gold pulse-gold" />
                  )}
                  {state === 'pending' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                  )}
                </div>
                <span className="text-lg mr-1">{step.icon}</span>
                <span className={`text-sm ${
                  state === 'complete' ? 'text-text-muted' :
                  state === 'active' ? 'text-text-primary font-medium' :
                  'text-gray-600'
                }`}>
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Waveform Animation */}
        <div className="flex items-end justify-center gap-1.5 h-10">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-gold wave-bar"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
