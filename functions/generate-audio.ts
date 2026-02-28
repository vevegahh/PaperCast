const WAVESPEED_API_KEY = Deno.env.get("WAVESPEED_API_KEY") || "";

async function pollWaveSpeed(taskId: string): Promise<string[]> {
  for (let i = 0; i < 90; i++) {
    const res = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`,
      { headers: { "Authorization": `Bearer ${WAVESPEED_API_KEY}` } }
    );
    const json = await res.json();
    if (json.data?.status === "completed") return json.data.outputs;
    if (json.data?.status === "failed")
      throw new Error("WaveSpeed TTS failed: " + (json.data?.error || "unknown"));
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("WaveSpeed TTS timed out");
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

  try {
    const body = await req.json();
    const text: string = body.text || "";
    const voice: string = body.voice || "Vivian";

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const t0 = Date.now();
    const res = await fetch(
      "https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen3-tts/text-to-speech",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WAVESPEED_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          language: "auto",
          voice,
        }),
      }
    );

    const data = await res.json();
    if (!data.data?.id) {
      throw new Error("TTS failed to start: " + JSON.stringify(data).substring(0, 200));
    }

    const outputs = await pollWaveSpeed(data.data.id);
    console.log(`[generate-audio] completed in ${Date.now() - t0}ms`);

    return new Response(
      JSON.stringify({ success: true, audioUrl: outputs[0] || "" }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: corsHeaders,
    });
  }
};
