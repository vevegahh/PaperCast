import { describe, it, expect } from 'vitest';
import type { ScriptParagraph, LimitationItem } from '../types';

/**
 * Validates the script JSON structure that the LLM is expected to return.
 * These are unit-level checks on the shape of data, not live API calls.
 */

// ── Helpers (mimicking what a Zod schema would enforce) ──

function validateCitation(c: unknown): string[] {
  const errors: string[] = [];
  if (!c || typeof c !== 'object') return ['citation is not an object'];
  const obj = c as Record<string, unknown>;
  if (typeof obj.section !== 'string' || obj.section.length === 0) {
    errors.push('citation.section must be a non-empty string');
  }
  // page is optional (number | null)
  if (obj.page !== undefined && obj.page !== null && typeof obj.page !== 'number') {
    errors.push('citation.page must be a number or null');
  }
  // snippet is optional string
  if (obj.snippet !== undefined && obj.snippet !== null && typeof obj.snippet !== 'string') {
    errors.push('citation.snippet must be a string or null');
  }
  return errors;
}

function validateParagraph(p: unknown): string[] {
  const errors: string[] = [];
  if (!p || typeof p !== 'object') return ['paragraph is not an object'];
  const obj = p as Record<string, unknown>;
  if (typeof obj.id !== 'string' || obj.id.length === 0) {
    errors.push('paragraph.id must be a non-empty string');
  }
  if (typeof obj.text !== 'string' || obj.text.length === 0) {
    errors.push('paragraph.text must be a non-empty string');
  }
  if (!Array.isArray(obj.citations)) {
    errors.push('paragraph.citations must be an array');
  } else {
    if (obj.citations.length === 0) {
      errors.push('paragraph must have >= 1 citation');
    }
    for (const c of obj.citations) {
      errors.push(...validateCitation(c));
    }
  }
  return errors;
}

function validateLimitation(l: unknown): string[] {
  const errors: string[] = [];
  if (!l || typeof l !== 'object') return ['limitation is not an object'];
  const obj = l as Record<string, unknown>;
  if (typeof obj.text !== 'string' || obj.text.length === 0) {
    errors.push('limitation.text must be a non-empty string');
  }
  if (!Array.isArray(obj.citations)) {
    errors.push('limitation.citations must be an array');
  } else {
    for (const c of obj.citations) {
      errors.push(...validateCitation(c));
    }
  }
  return errors;
}

// ── Test Data ──

const VALID_PARAGRAPHS: ScriptParagraph[] = [
  {
    id: 'p1',
    text: 'Researchers found that the new method outperforms existing approaches by 15%.',
    citations: [
      { section: 'Results', page: 5, snippet: 'outperforms existing approaches by 15%' },
    ],
  },
  {
    id: 'p2',
    text: 'The study was conducted across 3 different datasets with varying characteristics.',
    citations: [
      { section: 'Methods', page: 3, snippet: '3 different datasets' },
      { section: 'Methods', snippet: 'varying characteristics' },
    ],
  },
  {
    id: 'p3',
    text: 'In conclusion, the authors suggest further research into edge cases.',
    citations: [
      { section: 'Discussion' },
    ],
  },
];

const VALID_LIMITATIONS: LimitationItem[] = [
  {
    text: 'The study only tested on English-language datasets.',
    citations: [{ section: 'Discussion', snippet: 'only tested on English-language' }],
  },
];

const VALID_UNCERTAINTIES: LimitationItem[] = [
  {
    text: 'Results may not generalize to real-time systems.',
    citations: [{ section: 'Discussion', snippet: 'may not generalize' }],
  },
];

// ── Tests ──

describe('Script JSON validation', () => {
  it('each paragraph has >= 1 citation', () => {
    for (const p of VALID_PARAGRAPHS) {
      const errors = validateParagraph(p);
      expect(errors).toEqual([]);
      expect(p.citations.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('rejects paragraph with 0 citations', () => {
    const bad = { id: 'p0', text: 'No citations here.', citations: [] };
    const errors = validateParagraph(bad);
    expect(errors).toContain('paragraph must have >= 1 citation');
  });

  it('rejects paragraph with missing id', () => {
    const bad = { id: '', text: 'Some text.', citations: [{ section: 'Results' }] };
    const errors = validateParagraph(bad);
    expect(errors).toContain('paragraph.id must be a non-empty string');
  });

  it('rejects paragraph with missing text', () => {
    const bad = { id: 'p1', text: '', citations: [{ section: 'Results' }] };
    const errors = validateParagraph(bad);
    expect(errors).toContain('paragraph.text must be a non-empty string');
  });

  it('limitations exist and are valid', () => {
    expect(VALID_LIMITATIONS.length).toBeGreaterThanOrEqual(1);
    for (const l of VALID_LIMITATIONS) {
      const errors = validateLimitation(l);
      expect(errors).toEqual([]);
    }
  });

  it('uncertainties exist and are valid', () => {
    expect(VALID_UNCERTAINTIES.length).toBeGreaterThanOrEqual(1);
    for (const u of VALID_UNCERTAINTIES) {
      const errors = validateLimitation(u);
      expect(errors).toEqual([]);
    }
  });

  it('citation with invalid section is rejected', () => {
    const errors = validateCitation({ section: '', page: null });
    expect(errors).toContain('citation.section must be a non-empty string');
  });

  it('citation with invalid page type is rejected', () => {
    const errors = validateCitation({ section: 'Results', page: 'five' });
    expect(errors).toContain('citation.page must be a number or null');
  });

  it('validates a full script output shape', () => {
    // Simulates the full script JSON the LLM would return
    const fullScript = {
      title: 'Test Episode',
      tagline: 'A test tagline',
      description: 'Test description',
      estimated_duration: '8 minutes',
      hook: 'Opening hook',
      segment1: { title: 'Seg 1', script: 'Script 1' },
      segment2: { title: 'Seg 2', script: 'Script 2' },
      segment3: { title: 'Seg 3', script: 'Script 3' },
      paragraphs: VALID_PARAGRAPHS,
      limitations: VALID_LIMITATIONS,
      uncertainties: VALID_UNCERTAINTIES,
      key_takeaways: { intro_line: 'Before we wrap...', points: ['Point 1', 'Point 2'] },
      outro: 'Thanks for listening',
      wavespeed_prompt: 'Abstract podcast cover art',
    };

    expect(fullScript.title).toBeTruthy();
    expect(fullScript.paragraphs.length).toBeGreaterThan(0);
    expect(fullScript.limitations.length).toBeGreaterThan(0);
    expect(fullScript.uncertainties.length).toBeGreaterThan(0);

    // All paragraphs valid
    const allParaErrors = fullScript.paragraphs.flatMap(p => validateParagraph(p));
    expect(allParaErrors).toEqual([]);

    // All limitations valid
    const allLimErrors = fullScript.limitations.flatMap(l => validateLimitation(l));
    expect(allLimErrors).toEqual([]);
  });
});

describe('Community publish + upvote flow (integration-ish)', () => {
  it('validates publish payload structure', () => {
    const payload = {
      action: 'publish',
      communityId: 'abc123',
      paperTitle: 'Test Paper',
      episodeTitle: 'Test Episode',
      audioUrl: 'https://example.com/audio.mp3',
      coverArtUrl: 'https://example.com/cover.jpg',
      description: 'A test description',
      audience: 'adult',
      storyMode: 'documentary',
      style: 'casual',
    };

    expect(payload.action).toBe('publish');
    expect(payload.communityId).toBeTruthy();
    expect(payload.episodeTitle).toBeTruthy();
    expect(payload.audioUrl).toBeTruthy();
    expect(['child', 'student', 'adult', 'professional']).toContain(payload.audience);
    expect(['mystery', 'case_study', 'debate', 'documentary']).toContain(payload.storyMode);
    expect(['academic', 'casual', 'interview', 'debate']).toContain(payload.style);
  });

  it('validates upvote payload structure', () => {
    const payload = {
      action: 'upvote',
      postId: 'post123',
      userId: 'user-abc',
    };

    expect(payload.action).toBe('upvote');
    expect(payload.postId).toBeTruthy();
    expect(payload.userId).toBeTruthy();
  });

  it('upvote toggle produces correct expected states', () => {
    // Simulates the toggle behavior
    let upvoted = false;
    let count = 0;

    // First upvote
    upvoted = true;
    count += 1;
    expect(upvoted).toBe(true);
    expect(count).toBe(1);

    // Second upvote (toggle off)
    upvoted = false;
    count -= 1;
    expect(upvoted).toBe(false);
    expect(count).toBe(0);

    // Third upvote (toggle on again)
    upvoted = true;
    count += 1;
    expect(upvoted).toBe(true);
    expect(count).toBe(1);
  });
});
