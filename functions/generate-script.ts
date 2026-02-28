// WPM constant for duration estimation (~150 words per minute of speech)
const WPM = 150;

const TRUTH_SHEET_PROMPT = `You are a rigorous research analyst. Extract a structured "truth sheet" from the following research text. Return ONLY valid JSON, no markdown, no explanation.

Return this JSON structure:
{
  "paper_title": "...",
  "research_question": "...",
  "method": "Brief description of methodology",
  "key_findings": [
    { "finding": "...", "section": "e.g. Results / Discussion / Abstract", "page": null, "snippet": "exact short quote <= 20 words from source" }
  ],
  "limitations": [
    { "text": "...", "section": "...", "snippet": "exact short quote <= 20 words" }
  ],
  "uncertainties": [
    { "text": "...", "section": "...", "snippet": "exact short quote <= 20 words" }
  ],
  "key_numbers": [
    { "stat": "...", "context": "...", "section": "...", "snippet": "exact short quote <= 20 words" }
  ],
  "sections_detected": ["Abstract", "Introduction", "Methods", "Results", "Discussion", "Conclusion"]
}

Rules:
- Extract ALL key findings, not just 2-3. Be thorough.
- For each item, identify which section of the paper it comes from (Abstract, Introduction, Methods, Results, Discussion, Conclusion, or best guess).
- Include a short exact-quote snippet (<=20 words) from the source for each item when possible.
- If you cannot determine a page number, use null.
- limitations: anything the authors acknowledge as a limitation.
- uncertainties: anything where confidence is low, results are mixed, or further research is needed.
- Be factual. Do not invent findings.`;

function buildScriptPrompt(audience: string, storyMode: string, style: string, podcastMode: string, minMinutes?: number, maxMinutes?: number): string {
  let targetWords: string;
  if (podcastMode === "summary") {
    targetWords = `Target: 300-600 words (~2-4 minutes of speech at ${WPM} wpm). Keep it concise.`;
  } else if (podcastMode === "duration_range" && minMinutes && maxMinutes) {
    const minW = minMinutes * WPM;
    const maxW = maxMinutes * WPM;
    targetWords = `Target: ${minW}-${maxW} words (~${minMinutes}-${maxMinutes} minutes of speech at ${WPM} wpm).`;
  } else {
    targetWords = `Target: 1200-2250 words (~8-15 minutes of speech at ${WPM} wpm).`;
  }

  return `You are an elite podcast scriptwriter. Given a truth sheet (structured research extraction), write a compelling podcast episode script.

AUDIENCE: ${audience}
${audience === "child" ? "Use simple words, fun analogies, short sentences. Explain like the listener is 10 years old." : ""}
${audience === "student" ? "Use clear explanations with some technical terms. Assume undergrad-level knowledge." : ""}
${audience === "adult" ? "Use accessible but intelligent language. Assume general educated audience." : ""}
${audience === "professional" ? "Use precise technical language. Assume domain expertise." : ""}

STORY MODE: ${storyMode}
${storyMode === "mystery" ? "Structure like a detective story — open with a puzzle, reveal clues, build to the finding." : ""}
${storyMode === "case_study" ? "Walk through the research step by step — problem, approach, evidence, outcome." : ""}
${storyMode === "debate" ? "Present competing viewpoints and let evidence settle the argument." : ""}
${storyMode === "documentary" ? "Cinematic narrative — set the scene, build tension, deliver insights dramatically." : ""}

VOICE STYLE: ${style}
${style === "academic" ? "Authoritative, formal, like a BBC documentary narrator." : ""}
${style === "casual" ? "Warm, conversational, uses analogies, like Lex Fridman." : ""}
${style === "interview" ? "HOST asks questions, EXPERT answers. Prefix each line with HOST: or EXPERT:." : ""}
${style === "debate" ? "HOST_A argues FOR the thesis, HOST_B challenges it. Prefix with HOST_A: or HOST_B:." : ""}

${targetWords}

Return ONLY valid JSON with this structure:
{
  "title": "Episode title, max 8 words",
  "tagline": "One sentence hook for social sharing",
  "description": "2-3 sentence episode description",
  "estimated_duration": "e.g. 8 minutes",
  "hook": "Opening 30 seconds, must be compelling enough to stop scrolling",
  "segment1": { "title": "...", "script": "..." },
  "segment2": { "title": "...", "script": "..." },
  "segment3": { "title": "...", "script": "..." },
  "paragraphs": [
    {
      "id": "p1",
      "text": "The paragraph text as spoken in the podcast",
      "citations": [
        { "section": "Results", "page": null, "snippet": "exact quote <= 20 words" }
      ]
    }
  ],
  "limitations": [
    {
      "text": "Human-readable limitation statement",
      "citations": [{ "section": "Discussion", "page": null, "snippet": "..." }]
    }
  ],
  "uncertainties": [
    {
      "text": "Human-readable uncertainty statement",
      "citations": [{ "section": "...", "page": null, "snippet": "..." }]
    }
  ],
  "key_takeaways": {
    "intro_line": "Before we wrap, things worth remembering...",
    "points": ["point 1", "point 2", "point 3"]
  },
  "outro": "Warm close, thank listener",
  "wavespeed_prompt": "Detailed image generation prompt for cover art. Abstract, professional podcast cover art. Must visually reflect the topic. Dark navy and gold palette. Minimalist. Cinematic lighting. No text in image. Ultra HD."
}

IMPORTANT RULES:
- Every paragraph in "paragraphs" MUST have at least 1 citation linking back to the truth sheet.
- The "paragraphs" array should cover the full spoken content (hook + segments + takeaways + outro), each with citations.
- You MUST include at least one limitation and one uncertainty from the truth sheet.
- Citations must reference real sections from the paper. Use the truth sheet snippets.
- Do NOT invent citations or findings not in the truth sheet.`;
}

const VALID_AUDIENCES = ["child", "student", "adult", "professional"];
const VALID_STORY_MODES = ["mystery", "case_study", "debate", "documentary"];
const VALID_STYLES = ["academic", "casual", "interview", "debate"];
const VALID_PODCAST_MODES = ["summary", "full", "duration_range"];

export default async (req: Request): Promise<Response> => {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const timings: Record<string, number> = {};
  const t0 = Date.now();

  try {
    const body = await req.json();
    const text: string = body.text || "";
    const style: string = body.style || "casual";
    const audience: string = body.audience || "adult";
    const storyMode: string = body.storyMode || "documentary";
    const podcastMode: string = body.podcastMode || "full";
    const minMinutes: number | undefined = body.minMinutes;
    const maxMinutes: number | undefined = body.maxMinutes;

    const MAX_CHARS = parseInt(Deno.env.get("MAX_PAPER_CHARS") || "40000", 10);

    // Validation
    if (text.length < 200) {
      return new Response(
        JSON.stringify({ error: "Text must be at least 200 characters" }),
        { status: 400, headers: corsHeaders }
      );
    }
    if (text.length > MAX_CHARS) {
      return new Response(
        JSON.stringify({ error: `Text exceeds maximum of ${MAX_CHARS} characters` }),
        { status: 400, headers: corsHeaders }
      );
    }
    if (!VALID_AUDIENCES.includes(audience)) {
      return new Response(
        JSON.stringify({ error: `Invalid audience. Must be one of: ${VALID_AUDIENCES.join(", ")}` }),
        { status: 400, headers: corsHeaders }
      );
    }
    if (!VALID_STORY_MODES.includes(storyMode)) {
      return new Response(
        JSON.stringify({ error: `Invalid storyMode. Must be one of: ${VALID_STORY_MODES.join(", ")}` }),
        { status: 400, headers: corsHeaders }
      );
    }
    if (!VALID_STYLES.includes(style)) {
      return new Response(
        JSON.stringify({ error: `Invalid style. Must be one of: ${VALID_STYLES.join(", ")}` }),
        { status: 400, headers: corsHeaders }
      );
    }
    if (!VALID_PODCAST_MODES.includes(podcastMode)) {
      return new Response(
        JSON.stringify({ error: `Invalid podcastMode. Must be one of: ${VALID_PODCAST_MODES.join(", ")}` }),
        { status: 400, headers: corsHeaders }
      );
    }
    if (podcastMode === "duration_range") {
      if (!minMinutes || !maxMinutes || minMinutes < 1 || maxMinutes > 60 || minMinutes > maxMinutes) {
        return new Response(
          JSON.stringify({ error: "duration_range requires minMinutes (>=1) and maxMinutes (<=60) with min <= max" }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || "";
    const anonKey = Deno.env.get("ANON_KEY") || "";

    // ── STEP 1: Extract Truth Sheet ──
    const t1 = Date.now();
    const truthRes = await fetch(`${baseUrl}/api/ai/chat/completion`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.5",
        messages: [
          { role: "system", content: TRUTH_SHEET_PROMPT },
          { role: "user", content: `Source text:\n${text}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!truthRes.ok) {
      const errText = await truthRes.text();
      throw new Error(`Truth sheet extraction failed (${truthRes.status}): ${errText.substring(0, 200)}`);
    }

    const truthData = await truthRes.json();
    const truthRaw: string = truthData.text || truthData.choices?.[0]?.message?.content || "";
    if (!truthRaw) throw new Error("AI returned empty truth sheet");

    let truthCleaned = truthRaw.trim();
    if (truthCleaned.startsWith("```")) {
      truthCleaned = truthCleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const truthSheet = JSON.parse(truthCleaned);
    timings.truthSheet = Date.now() - t1;

    // ── STEP 2: Generate Story Script with Citations ──
    const t2 = Date.now();
    const scriptPrompt = buildScriptPrompt(audience, storyMode, style, podcastMode, minMinutes, maxMinutes);

    const scriptRes = await fetch(`${baseUrl}/api/ai/chat/completion`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.5",
        messages: [
          { role: "system", content: scriptPrompt },
          { role: "user", content: `Truth Sheet:\n${JSON.stringify(truthSheet, null, 2)}` },
        ],
        temperature: 0.7,
      }),
    });

    if (!scriptRes.ok) {
      const errText = await scriptRes.text();
      throw new Error(`Script generation failed (${scriptRes.status}): ${errText.substring(0, 200)}`);
    }

    const scriptData = await scriptRes.json();
    const scriptRaw: string = scriptData.text || scriptData.choices?.[0]?.message?.content || "";
    if (!scriptRaw) throw new Error("AI returned empty script");

    let scriptCleaned = scriptRaw.trim();
    if (scriptCleaned.startsWith("```")) {
      scriptCleaned = scriptCleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const script = JSON.parse(scriptCleaned);
    timings.scriptGen = Date.now() - t2;
    timings.total = Date.now() - t0;

    console.log("[generate-script] timings:", timings);

    return new Response(JSON.stringify({ success: true, script, truthSheet, timings }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-script] error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
