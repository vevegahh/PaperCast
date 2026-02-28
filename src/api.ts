import type { GenerateRequest, PodcastResult, ScriptParagraph, LimitationItem } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface ScriptResponse {
  success: boolean;
  script: {
    title: string;
    tagline: string;
    description: string;
    estimated_duration: string;
    hook: string;
    segment1: { title: string; script: string };
    segment2: { title: string; script: string };
    segment3: { title: string; script: string };
    paragraphs?: ScriptParagraph[];
    limitations?: LimitationItem[];
    uncertainties?: LimitationItem[];
    key_takeaways: { intro_line: string; points: string[] };
    outro: string;
    wavespeed_prompt: string;
  };
  truthSheet?: Record<string, unknown>;
  timings?: Record<string, number>;
  error?: string;
}

interface StartTaskResponse {
  success?: boolean;
  taskId?: string;
  error?: string;
}

interface CheckTaskResponse {
  status: 'created' | 'processing' | 'completed' | 'failed';
  outputs?: string[];
  error?: string;
}

function buildFullScript(script: ScriptResponse['script'], style: string): string {
  const parts: string[] = [];
  if (script.hook) parts.push(script.hook);
  if (script.segment1?.script) parts.push(script.segment1.script);
  if (script.segment2?.script) parts.push(script.segment2.script);
  if (script.segment3?.script) parts.push(script.segment3.script);
  if (script.key_takeaways?.intro_line) {
    parts.push(script.key_takeaways.intro_line);
    if (script.key_takeaways.points) parts.push(script.key_takeaways.points.join(". "));
  }
  if (script.outro) parts.push(script.outro);

  let fullText = parts.join("\n\n");
  if (style === "interview" || style === "debate") {
    fullText = fullText.replace(/^(HOST|EXPERT|HOST_A|HOST_B):\s*/gm, "");
  }
  return fullText;
}

async function pollTask(taskId: string): Promise<string[]> {
  for (let i = 0; i < 120; i++) {
    const res = await fetch(`${API_BASE}/functions/check-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
    const data: CheckTaskResponse = await res.json();

    if (data.status === 'completed' && data.outputs) {
      return data.outputs;
    }
    if (data.status === 'failed') {
      throw new Error(data.error || 'Task failed');
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Task timed out');
}

export type Stage = 'llm' | 'wavespeed' | 'tts' | 'merging' | 'complete';

export async function generatePodcast(
  req: GenerateRequest,
  onStage: (stage: Stage) => void
): Promise<PodcastResult> {
  // Stage 1: Generate script with two-step pipeline (truth sheet -> story script)
  onStage('llm');
  const scriptRes = await fetch(`${API_BASE}/functions/generate-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const scriptData: ScriptResponse = await scriptRes.json();
  if (!scriptData.success || scriptData.error) {
    throw new Error(scriptData.error || 'Script generation failed');
  }
  const script = scriptData.script;

  // Stage 2: Submit image + TTS tasks (instant, just starts them)
  onStage('wavespeed');
  const [imageStart, ttsStart] = await Promise.all([
    fetch(`${API_BASE}/functions/start-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: script.wavespeed_prompt }),
    }).then(r => r.json()) as Promise<StartTaskResponse>,

    fetch(`${API_BASE}/functions/start-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: buildFullScript(script, req.style),
        voice: 'Vivian',
      }),
    }).then(r => r.json()) as Promise<StartTaskResponse>,
  ]);

  if (imageStart.error || !imageStart.taskId) {
    throw new Error('Cover art: ' + (imageStart.error || 'Failed to start'));
  }
  if (ttsStart.error || !ttsStart.taskId) {
    throw new Error('Audio: ' + (ttsStart.error || 'Failed to start'));
  }

  // Stage 3: Poll both tasks until complete
  onStage('tts');
  const [imageOutputs, ttsOutputs] = await Promise.all([
    pollTask(imageStart.taskId),
    pollTask(ttsStart.taskId),
  ]);

  onStage('merging');
  // Brief pause on merging stage for UX
  await new Promise((r) => setTimeout(r, 1000));

  onStage('complete');

  return {
    jobId: crypto.randomUUID(),
    status: 'done',
    title: script.title || 'Untitled Episode',
    tagline: script.tagline || '',
    description: script.description || '',
    estimated_duration: script.estimated_duration || '~8 minutes',
    style: req.style,
    audience: req.audience,
    storyMode: req.storyMode,
    podcastMode: req.podcastMode,
    segments: [
      script.segment1 || { title: 'Segment 1', script: '' },
      script.segment2 || { title: 'Segment 2', script: '' },
      script.segment3 || { title: 'Segment 3', script: '' },
    ],
    paragraphs: script.paragraphs || [],
    limitations: script.limitations || [],
    uncertainties: script.uncertainties || [],
    key_takeaways: script.key_takeaways || { intro_line: '', points: [] },
    audioUrl: ttsOutputs[0] || '',
    coverArtUrl: imageOutputs[0] || '',
  };
}
