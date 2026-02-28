import { useState } from 'react';
import { motion } from 'framer-motion';
import type {
  PodcastStyle, StyleOption, Audience, AudienceOption,
  StoryMode, StoryModeOption, PodcastMode, GenerateRequest,
} from '../types';

const MAX_PAPER_CHARS = Number(import.meta.env.VITE_MAX_PAPER_CHARS) || 40000;
const MIN_PAPER_CHARS = 200;

const STYLE_OPTIONS: StyleOption[] = [
  { id: 'academic', icon: '\uD83C\uDF93', label: 'Academic Lecture', description: 'Formal, authoritative narration' },
  { id: 'casual', icon: '\uD83D\uDCAC', label: 'Casual Explainer', description: 'Friendly tone, analogies, beginner-friendly' },
  { id: 'interview', icon: '\uD83C\uDF99\uFE0F', label: 'Interview Format', description: 'Host interviews an expert — two distinct voices' },
  { id: 'debate', icon: '\u2694\uFE0F', label: 'Debate Format', description: 'Two hosts argue opposing sides' },
];

const AUDIENCE_OPTIONS: AudienceOption[] = [
  { id: 'child', icon: '\uD83E\uDDD2', label: 'Child' },
  { id: 'student', icon: '\uD83C\uDF93', label: 'Student' },
  { id: 'adult', icon: '\uD83E\uDDD1', label: 'Adult' },
  { id: 'professional', icon: '\uD83D\uDC54', label: 'Professional' },
];

const STORY_MODE_OPTIONS: StoryModeOption[] = [
  { id: 'mystery', icon: '\uD83D\uDD0D', label: 'Mystery', description: 'Unravel findings like a detective story' },
  { id: 'case_study', icon: '\uD83D\uDCCB', label: 'Case Study', description: 'Walk through the research step by step' },
  { id: 'debate', icon: '\u2696\uFE0F', label: 'Debate', description: 'Present competing perspectives' },
  { id: 'documentary', icon: '\uD83C\uDFAC', label: 'Documentary', description: 'Cinematic narrative storytelling' },
];

interface InputPageProps {
  onGenerate: (req: GenerateRequest) => void;
  isSubmitting: boolean;
}

export default function InputPage({ onGenerate, isSubmitting }: InputPageProps) {
  const [text, setText] = useState('');
  const [style, setStyle] = useState<PodcastStyle>('casual');
  const [audience, setAudience] = useState<Audience>('adult');
  const [storyMode, setStoryMode] = useState<StoryMode>('documentary');
  const [podcastMode, setPodcastMode] = useState<PodcastMode>('full');
  const [minMinutes, setMinMinutes] = useState(5);
  const [maxMinutes, setMaxMinutes] = useState(15);

  const charCount = text.length;
  const isValid = charCount >= MIN_PAPER_CHARS && charCount <= MAX_PAPER_CHARS;
  const isOverLimit = charCount > MAX_PAPER_CHARS;

  const handleGenerate = () => {
    if (!isValid || isSubmitting) return;
    onGenerate({
      text,
      style,
      audience,
      storyMode,
      podcastMode,
      ...(podcastMode === 'duration_range' ? { minMinutes, maxMinutes } : {}),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-[720px] mx-auto px-4"
    >
      {/* Input Card */}
      <div className="bg-surface rounded-2xl border border-border p-6 md:p-8">
        {/* Textarea */}
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your research paper, lecture notes, or article..."
            className="w-full min-h-[180px] bg-base border border-border rounded-xl p-4 text-text-primary placeholder-text-muted resize-y focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-colors text-sm leading-relaxed"
          />
          <span className={`absolute bottom-3 right-3 text-xs ${
            isOverLimit ? 'text-error' : isValid ? 'text-success' : 'text-text-muted'
          }`}>
            {charCount.toLocaleString()} / {MAX_PAPER_CHARS.toLocaleString()}
          </span>
        </div>

        {!isValid && charCount > 0 && !isOverLimit && (
          <p className="mt-2 text-xs text-gold">Minimum {MIN_PAPER_CHARS} characters required</p>
        )}
        {isOverLimit && (
          <p className="mt-2 text-xs text-error font-medium">
            Exceeds maximum of {MAX_PAPER_CHARS.toLocaleString()} characters — please shorten your text
          </p>
        )}

        {/* Audience Selector */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-text-muted mb-3">Audience</h3>
          <div className="flex gap-2 flex-wrap">
            {AUDIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAudience(opt.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  audience === opt.id
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-border bg-base text-text-muted hover:border-border/80'
                }`}
              >
                <span className="mr-1.5">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Story Mode Selector */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-text-muted mb-3">Story Mode</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STORY_MODE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setStoryMode(opt.id)}
                className={`text-left p-3 rounded-xl border transition-all duration-200 ${
                  storyMode === opt.id
                    ? 'border-gold bg-gold/5 shadow-[0_0_10px_rgba(245,158,11,0.08)]'
                    : 'border-border bg-base hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base">{opt.icon}</span>
                  <span className="font-medium text-xs text-text-primary">{opt.label}</span>
                </div>
                <p className="text-[10px] text-text-muted leading-tight">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Style Selector */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-text-muted mb-3">Podcast Style</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STYLE_OPTIONS.map((opt) => (
              <motion.button
                key={opt.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStyle(opt.id)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                  style === opt.id
                    ? 'border-gold bg-gold/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'border-border bg-base hover:border-border/80'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{opt.icon}</span>
                  <span className="font-semibold text-sm text-text-primary">{opt.label}</span>
                </div>
                <p className="text-xs text-text-muted">{opt.description}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Podcast Length */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-text-muted mb-3">Podcast Length</h3>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: 'summary' as PodcastMode, label: 'Summary', desc: '2-4 min' },
              { id: 'full' as PodcastMode, label: 'Full', desc: '8-15 min' },
              { id: 'duration_range' as PodcastMode, label: 'Custom', desc: 'Set range' },
            ]).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPodcastMode(opt.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                  podcastMode === opt.id
                    ? 'border-gold bg-gold/10 text-gold'
                    : 'border-border bg-base text-text-muted hover:border-border/80'
                }`}
              >
                {opt.label}
                <span className="ml-1.5 text-[10px] opacity-70">{opt.desc}</span>
              </button>
            ))}
          </div>

          {podcastMode === 'duration_range' && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted">Min</label>
                <input
                  type="number"
                  min={1}
                  max={maxMinutes}
                  value={minMinutes}
                  onChange={(e) => setMinMinutes(Math.max(1, Number(e.target.value)))}
                  className="w-16 px-2 py-1.5 rounded-lg bg-base border border-border text-text-primary text-sm text-center focus:outline-none focus:border-gold/50"
                />
                <span className="text-xs text-text-muted">min</span>
              </div>
              <span className="text-text-muted">&mdash;</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted">Max</label>
                <input
                  type="number"
                  min={minMinutes}
                  max={60}
                  value={maxMinutes}
                  onChange={(e) => setMaxMinutes(Math.max(minMinutes, Number(e.target.value)))}
                  className="w-16 px-2 py-1.5 rounded-lg bg-base border border-border text-text-primary text-sm text-center focus:outline-none focus:border-gold/50"
                />
                <span className="text-xs text-text-muted">min</span>
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <motion.button
          whileHover={isValid && !isSubmitting ? { scale: 1.01 } : {}}
          whileTap={isValid && !isSubmitting ? { scale: 0.99 } : {}}
          onClick={handleGenerate}
          disabled={!isValid || isSubmitting}
          className={`mt-6 w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            isValid && !isSubmitting
              ? 'bg-gold text-black hover:bg-gold-hover cursor-pointer'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Generate Episode \u2192'}
        </motion.button>
      </div>
    </motion.div>
  );
}
