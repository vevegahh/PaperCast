const WAVESPEED_API_KEY = Deno.env.get("WAVESPEED_API_KEY") || "";

async function pollWaveSpeed(taskId: string): Promise<string[]> {
  for (let i = 0; i < 120; i++) {
    const res = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`,
      { headers: { "Authorization": `Bearer ${WAVESPEED_API_KEY}` } }
    );
    const json = await res.json();
    if (json.data?.status === "completed") return json.data.outputs;
    if (json.data?.status === "failed")
      throw new Error("WaveSpeed failed: " + (json.data?.error || "unknown"));
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("WaveSpeed task timed out after 3 minutes");
}

function buildFullScript(
  script: Record<string, unknown>,
  style: string
): string {
  const parts: string[] = [];
  const hook = script.hook as string;
  const s1 = script.segment1 as { script: string };
  const s2 = script.segment2 as { script: string };
  const s3 = script.segment3 as { script: string };
  const takeaways = script.key_takeaways as {
    intro_line: string;
    points: string[];
  };
  const outro = script.outro as string;

  if (hook) parts.push(hook);
  if (s1?.script) parts.push(s1.script);
  if (s2?.script) parts.push(s2.script);
  if (s3?.script) parts.push(s3.script);
  if (takeaways?.intro_line) {
    parts.push(takeaways.intro_line);
    if (takeaways.points) parts.push(takeaways.points.join(". "));
  }
  if (outro) parts.push(outro);

  let fullText = parts.join("\n\n");

  if (style === "interview" || style === "debate") {
    fullText = fullText.replace(/^(HOST|EXPERT|HOST_A|HOST_B):\s*/gm, "");
  }

  return fullText;
}

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

    if (text.length < 200) {
      return new Response(
        JSON.stringify({ error: "Text must be at least 200 characters" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || "";
    const anonKey = Deno.env.get("ANON_KEY") || "";

    const SYSTEM_PROMPT = `You are an elite podcast scriptwriter. Convert the source text into a podcast episode script. Return ONLY raw valid JSON, no markdown, no explanation.

Tone by style (will be specified in user message):
- academic: Authoritative, formal, like a BBC documentary narrator
- casual: Warm, conversational, uses analogies, like Lex Fridman
- interview: HOST asks questions, EXPERT answers. Prefix each line with "HOST:" or "EXPERT:"
- debate: HOST_A argues FOR the thesis, HOST_B challenges it. Prefix with "HOST_A:" or "HOST_B:"

Return this JSON structure:
{
  "title": "Episode title, max 8 words",
  "tagline": "One sentence hook for social sharing",
  "description": "2-3 sentence episode description",
  "estimated_duration": "e.g. 8 minutes",
  "hook": "Opening 30 seconds, must be compelling enough to stop scrolling",
  "segment1": { "title": "...", "script": "..." },
  "segment2": { "title": "...", "script": "..." },
  "segment3": { "title": "...", "script": "..." },
  "key_takeaways": {
    "intro_line": "Before we wrap, three things worth remembering...",
    "points": ["point 1", "point 2", "point 3"]
  },
  "outro": "Warm close, thank listener, generic next episode tease",
  "wavespeed_prompt": "Detailed image generation prompt for cover art. Abstract, professional podcast cover art. Must visually reflect the topic. Dark navy and gold palette. Minimalist. Cinematic lighting. No text in image. Ultra HD."
}`;

    // STAGE 1: Generate podcast script with Claude
    const t1 = Date.now();
    const aiRes = await fetch(`${baseUrl}/api/ai/chat/completion`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4.5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Style: ${style}\n\nSource text:\n${text}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI script generation failed (${aiRes.status}): ${errText.substring(0, 200)}`);
    }

    const aiData = await aiRes.json();
    const scriptRaw: string =
      aiData.text ||
      aiData.choices?.[0]?.message?.content ||
      "";

    if (!scriptRaw) {
      throw new Error("AI returned empty script");
    }

    let cleaned = scriptRaw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    let script: Record<string, unknown>;
    try {
      script = JSON.parse(cleaned);
    } catch (parseErr: unknown) {
      const msg = parseErr instanceof Error ? parseErr.message : "unknown";
      throw new Error(`Failed to parse AI script JSON: ${msg}`);
    }
    timings.scriptGen = Date.now() - t1;

    // STAGES 2 + 3: Cover art and TTS in parallel
    const t2 = Date.now();
    const imagePromise = (async () => {
      const res = await fetch(
        "https://api.wavespeed.ai/api/v3/wavespeed-ai/flux-dev",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WAVESPEED_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt:
              script.wavespeed_prompt ||
              "Abstract dark navy and gold podcast cover art, minimalist, cinematic lighting, ultra HD",
            size: "1024*1024",
            num_inference_steps: 28,
            guidance_scale: 3.5,
            num_images: 1,
            seed: -1,
          }),
        }
      );
      const data = await res.json();
      if (!data.data?.id) throw new Error("Image gen failed to start");
      return await pollWaveSpeed(data.data.id);
    })();

    const fullScript = buildFullScript(script, style);

    const ttsPromise = (async () => {
      const res = await fetch(
        "https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen3-tts/text-to-speech",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${WAVESPEED_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: fullScript,
            language: "auto",
            voice: "Vivian",
          }),
        }
      );
      const data = await res.json();
      if (!data.data?.id) throw new Error("TTS failed to start");
      return await pollWaveSpeed(data.data.id);
    })();

    const [imageOutputs, ttsOutputs] = await Promise.all([
      imagePromise,
      ttsPromise,
    ]);
    timings.mediaGen = Date.now() - t2;
    timings.total = Date.now() - t0;

    console.log("[generate-podcast] timings:", timings);

    const result = {
      jobId: crypto.randomUUID(),
      status: "done",
      title: script.title || "Untitled Episode",
      tagline: script.tagline || "",
      description: script.description || "",
      estimated_duration: script.estimated_duration || "~8 minutes",
      style,
      segments: [
        script.segment1 || { title: "Segment 1", script: "" },
        script.segment2 || { title: "Segment 2", script: "" },
        script.segment3 || { title: "Segment 3", script: "" },
      ],
      key_takeaways: script.key_takeaways || {
        intro_line: "",
        points: [],
      },
      audioUrl: ttsOutputs[0] || "",
      coverArtUrl: imageOutputs[0] || "",
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
