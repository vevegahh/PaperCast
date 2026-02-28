import { motion } from 'framer-motion';
import type { Citation } from '../types';

interface CitationModalProps {
  citation: Citation;
  onClose: () => void;
}

export default function CitationModal({ citation, onClose }: CitationModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-surface border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Citation Source</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-base transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Section</span>
            <p className="text-sm text-gold font-medium mt-0.5">{citation.section}</p>
          </div>

          {citation.page && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Page</span>
              <p className="text-sm text-text-primary mt-0.5">p. {citation.page}</p>
            </div>
          )}

          {citation.snippet && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium">Source Quote</span>
              <blockquote className="mt-1 pl-3 border-l-2 border-gold/40 text-sm text-text-muted italic leading-relaxed">
                &ldquo;{citation.snippet}&rdquo;
              </blockquote>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
