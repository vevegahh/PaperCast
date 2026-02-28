import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PodcastResult, PodcastStyle, Citation } from '../types';
import AudioPlayer from './AudioPlayer';
import CitationModal from './CitationModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const STYLE_LABELS: Record<PodcastStyle, { icon: string; label: string }> = {
  academic: { icon: '\uD83C\uDF93', label: 'Academic Lecture' },
  casual: { icon: '\uD83D\uDCAC', label: 'Casual Explainer' },
  interview: { icon: '\uD83C\uDF99\uFE0F', label: 'Interview Format' },
  debate: { icon: '\u2694\uFE0F', label: 'Debate Format' },
};

const AUDIENCE_LABELS: Record<string, string> = {
  child: '\uD83E\uDDD2 Child',
  student: '\uD83C\uDF93 Student',
  adult: '\uD83E\uDDD1 Adult',
  professional: '\uD83D\uDC54 Professional',
};

const STORY_MODE_LABELS: Record<string, string> = {
  mystery: '\uD83D\uDD0D Mystery',
  case_study: '\uD83D\uDCCB Case Study',
  debate: '\u2696\uFE0F Debate',
  documentary: '\uD83C\uDFAC Documentary',
};

interface ResultsPageProps {
  result: PodcastResult;
  onReset: () => void;
}

export default function ResultsPage({ result, onReset }: ResultsPageProps) {
  const [openSegment, setOpenSegment] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [showParagraphs, setShowParagraphs] = useState(false);
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);
  const [publishCommunityId, setPublishCommunityId] = useState('');
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'done' | 'error'>('idle');
  const [showPublish, setShowPublish] = useState(false);

  const styleInfo = STYLE_LABELS[result.style] || STYLE_LABELS.casual;

  const copyText = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // fallback: silently fail
    }
  };

  const hasCitations = result.paragraphs && result.paragraphs.length > 0;
  const hasLimitations = result.limitations && result.limitations.length > 0;
  const hasUncertainties = result.uncertainties && result.uncertainties.length > 0;

  // Fetch communities for the "Publish" dropdown
  useEffect(() => {
    fetch(`${API_BASE}/functions/communities`)
      .then(r => r.json())
      .then(data => {
        const list = data.communities || [];
        setCommunities(list);
        if (list.length > 0) setPublishCommunityId(list[0].id);
      })
      .catch(() => {});
  }, []);

  const handlePublish = async () => {
    if (!publishCommunityId) return;
    setPublishStatus('publishing');
    try {
      const res = await fetch(`${API_BASE}/functions/communities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish',
          communityId: publishCommunityId,
          paperTitle: result.title,
          episodeTitle: result.title,
          audioUrl: result.audioUrl,
          coverArtUrl: result.coverArtUrl,
          description: result.description,
          audience: result.audience,
          storyMode: result.storyMode,
          style: result.style,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPublishStatus('done');
      } else {
        setPublishStatus('error');
      }
    } catch {
      setPublishStatus('error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-5xl mx-auto px-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
        {/* Left Column — Cover Art */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface border border-border">
            {!imgError ? (
              <img
                src={result.coverArtUrl}
                alt={result.title}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-base via-surface to-base flex items-center justify-center p-6">
                <p className="text-text-muted text-center text-lg font-bold">{result.title}</p>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-medium border border-gold/20">
              {styleInfo.icon} {styleInfo.label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-text-muted">
              {'\uD83D\uDD70\uFE0F'} {result.estimated_duration}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {result.audience && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-surface border border-border text-text-muted">
                {AUDIENCE_LABELS[result.audience] || result.audience}
              </span>
            )}
            {result.storyMode && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-surface border border-border text-text-muted">
                {STORY_MODE_LABELS[result.storyMode] || result.storyMode}
              </span>
            )}
          </div>
        </motion.div>

        {/* Right Column — Player + Info */}
        <div className="lg:col-span-3 space-y-5">
          {/* Episode Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{result.title}</h1>
            <p className="text-sm text-gold italic mt-1">{result.tagline}</p>
            <p className="text-sm text-text-muted leading-relaxed mt-2">{result.description}</p>
          </motion.div>

          {/* Audio Player */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <AudioPlayer
              audioUrl={result.audioUrl}
              title={result.title}
              tagline={result.tagline}
              coverArtUrl={result.coverArtUrl}
            />
          </motion.div>

          {/* Segment Accordion */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Segments</h3>
            {result.segments.map((seg, i) => (
              <div key={i} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenSegment(openSegment === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-base/50 transition-colors"
                >
                  <span className="text-sm font-medium text-text-primary">{seg.title}</span>
                  <svg
                    className={`w-4 h-4 text-text-muted transition-transform duration-200 ${openSegment === i ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {openSegment === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <p className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">{seg.script}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>

          {/* Cited Paragraphs (expandable) */}
          {hasCitations && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              <button
                onClick={() => setShowParagraphs(!showParagraphs)}
                className="flex items-center gap-2 text-xs font-medium text-text-muted uppercase tracking-wider mb-2 hover:text-text-primary transition-colors"
              >
                <span>Cited Paragraphs ({result.paragraphs.length})</span>
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${showParagraphs ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {showParagraphs && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {result.paragraphs.map((para) => (
                      <div key={para.id} className="bg-base rounded-xl border border-border p-4">
                        <p className="text-sm text-text-muted leading-relaxed">{para.text}</p>
                        {para.citations.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {para.citations.map((cit, ci) => (
                              <button
                                key={ci}
                                onClick={() => setActiveCitation(cit)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold/10 text-gold text-[10px] font-medium border border-gold/20 hover:bg-gold/20 transition-colors cursor-pointer"
                              >
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
                                </svg>
                                {cit.section}{cit.page ? ` p.${cit.page}` : ''}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Limitations & Uncertainties */}
          {(hasLimitations || hasUncertainties) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.48 }}
              className="border border-error/20 bg-error/5 rounded-xl p-4 space-y-3"
            >
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                {'\u26A0\uFE0F'} Limitations & Uncertainties
              </h3>

              {hasLimitations && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Limitations</span>
                  <ul className="mt-1 space-y-2">
                    {result.limitations.map((lim, i) => (
                      <li key={i} className="text-sm text-text-muted leading-relaxed">
                        <span>{lim.text}</span>
                        {lim.citations.length > 0 && (
                          <span className="inline-flex gap-1 ml-1.5">
                            {lim.citations.map((cit, ci) => (
                              <button
                                key={ci}
                                onClick={() => setActiveCitation(cit)}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
                              >
                                {cit.section}
                              </button>
                            ))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasUncertainties && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Uncertainties</span>
                  <ul className="mt-1 space-y-2">
                    {result.uncertainties.map((unc, i) => (
                      <li key={i} className="text-sm text-text-muted leading-relaxed">
                        <span>{unc.text}</span>
                        {unc.citations.length > 0 && (
                          <span className="inline-flex gap-1 ml-1.5">
                            {unc.citations.map((cit, ci) => (
                              <button
                                key={ci}
                                onClick={() => setActiveCitation(cit)}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors"
                              >
                                {cit.section}
                              </button>
                            ))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {/* Key Takeaways */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="border-l-4 border-gold bg-surface rounded-r-xl p-4"
          >
            <h3 className="text-sm font-semibold text-text-primary mb-2">{'\uD83D\uDCA1'} Key Takeaways</h3>
            {result.key_takeaways.intro_line && (
              <p className="text-xs text-text-muted italic mb-2">{result.key_takeaways.intro_line}</p>
            )}
            <ul className="space-y-1.5">
              {result.key_takeaways.points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                  <span className="text-gold mt-0.5">{'\u2022'}</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Share Row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-3 flex-wrap"
          >
            <span className="text-xs text-text-muted">Share this episode:</span>
            <button
              onClick={() => copyText(result.title, 'title')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border hover:border-gold/30 text-text-muted hover:text-text-primary transition-colors"
            >
              {copiedField === 'title' ? 'Copied!' : 'Copy Title'}
            </button>
            <button
              onClick={() => copyText(result.description, 'description')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface border border-border hover:border-gold/30 text-text-muted hover:text-text-primary transition-colors"
            >
              {copiedField === 'description' ? 'Copied!' : 'Copy Description'}
            </button>
          </motion.div>

          {/* Publish to Community */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            {!showPublish && publishStatus !== 'done' && (
              <button
                onClick={() => setShowPublish(true)}
                className="w-full py-2.5 rounded-xl border border-gold/30 text-sm font-medium text-gold hover:bg-gold/5 transition-colors"
              >
                Publish to Community
              </button>
            )}
            {showPublish && publishStatus === 'idle' && (
              <div className="border border-border rounded-xl p-4 bg-base space-y-3">
                <h4 className="text-sm font-medium text-text-primary">Publish this episode</h4>
                <select
                  value={publishCommunityId}
                  onChange={(e) => setPublishCommunityId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:border-gold/50"
                >
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handlePublish}
                    className="flex-1 py-2 rounded-lg bg-gold text-black text-sm font-semibold hover:bg-gold-hover transition-colors"
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => setShowPublish(false)}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {publishStatus === 'publishing' && (
              <div className="text-center py-3 text-sm text-text-muted">Publishing...</div>
            )}
            {publishStatus === 'done' && (
              <div className="text-center py-3 text-sm text-success font-medium">
                Published! Check the Communities page.
              </div>
            )}
            {publishStatus === 'error' && (
              <div className="text-center py-3 text-sm text-error">
                Failed to publish. <button onClick={() => setPublishStatus('idle')} className="underline">Try again</button>
              </div>
            )}
          </motion.div>

          {/* Generate Another */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <button
              onClick={onReset}
              className="w-full py-3 rounded-xl border border-border text-sm font-medium text-text-muted hover:text-text-primary hover:border-gold/30 transition-colors"
            >
              {'\u2190'} Generate Another Episode
            </button>
          </motion.div>
        </div>
      </div>

      {/* Citation Modal */}
      <AnimatePresence>
        {activeCitation && (
          <CitationModal
            citation={activeCitation}
            onClose={() => setActiveCitation(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
