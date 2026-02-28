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
    const taskId: string = body.taskId || "";

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "taskId is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const res = await fetch(
      `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`,
      { headers: { "Authorization": `Bearer ${WAVESPEED_API_KEY}` } }
    );

    const json = await res.json();
    const status = json.data?.status || "unknown";

    if (status === "completed") {
      return new Response(
        JSON.stringify({ status: "completed", outputs: json.data.outputs }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (status === "failed") {
      return new Response(
        JSON.stringify({ status: "failed", error: json.data?.error || "Task failed" }),
        { status: 200, headers: corsHeaders }
      );
    }

    // still processing
    return new Response(
      JSON.stringify({ status }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: corsHeaders,
    });
  }
};
