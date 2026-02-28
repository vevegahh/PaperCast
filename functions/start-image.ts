const WAVESPEED_API_KEY = Deno.env.get("WAVESPEED_API_KEY") || "";

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
    const prompt: string = body.prompt ||
      "Abstract dark navy and gold podcast cover art, minimalist, cinematic lighting, ultra HD";

    const t0 = Date.now();
    const res = await fetch("https://api.wavespeed.ai/api/v3/wavespeed-ai/flux-dev", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WAVESPEED_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        size: "1024*1024",
        num_inference_steps: 20,
        guidance_scale: 3.5,
        num_images: 1,
        seed: -1,
      }),
    });

    const data = await res.json();
    if (!data.data?.id) {
      throw new Error("Image task failed: " + JSON.stringify(data).substring(0, 200));
    }

    console.log(`[start-image] task started in ${Date.now() - t0}ms, taskId=${data.data.id}`);

    return new Response(
      JSON.stringify({ success: true, taskId: data.data.id }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: corsHeaders,
    });
  }
};
