export type PodcastStyle = 'academic' | 'casual' | 'interview' | 'debate';
export type Audience = 'child' | 'student' | 'adult' | 'professional';
export type StoryMode = 'mystery' | 'case_study' | 'debate' | 'documentary';
export type PodcastMode = 'summary' | 'full' | 'duration_range';

export interface Segment {
  title: string;
  script: string;
}

export interface KeyTakeaways {
  intro_line: string;
  points: string[];
}

export interface Citation {
  section: string;
  page?: number;
  snippet?: string;
}

export interface ScriptParagraph {
  id: string;
  text: string;
  citations: Citation[];
}

export interface LimitationItem {
  text: string;
  citations: Citation[];
}

export interface GenerateRequest {
  text: string;
  style: PodcastStyle;
  audience: Audience;
  storyMode: StoryMode;
  podcastMode: PodcastMode;
  minMinutes?: number;
  maxMinutes?: number;
}

export interface PodcastResult {
  jobId: string;
  status: string;
  title: string;
  tagline: string;
  description: string;
  estimated_duration: string;
  style: PodcastStyle;
  audience: Audience;
  storyMode: StoryMode;
  podcastMode: PodcastMode;
  segments: Segment[];
  paragraphs: ScriptParagraph[];
  limitations: LimitationItem[];
  uncertainties: LimitationItem[];
  key_takeaways: KeyTakeaways;
  audioUrl: string;
  coverArtUrl: string;
}

export interface StyleOption {
  id: PodcastStyle;
  icon: string;
  label: string;
  description: string;
}

export interface AudienceOption {
  id: Audience;
  icon: string;
  label: string;
}

export interface StoryModeOption {
  id: StoryMode;
  icon: string;
  label: string;
  description: string;
}
