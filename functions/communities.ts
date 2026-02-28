// Communities edge function — Insforge DB-backed MVP
// Endpoints:
//   GET  /functions/communities                         → list communities
//   GET  /functions/communities?communityId=X&sort=Y    → list posts
//   POST /functions/communities { action: "publish", ... } → publish post
//   POST /functions/communities { action: "upvote", ... }  → toggle upvote

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: corsHeaders });
}

function ok(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
}

// ── Insforge DB helpers ──
async function dbQuery(sql: string, params: unknown[] = []) {
  const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || "";
  const serviceKey = Deno.env.get("SERVICE_KEY") || Deno.env.get("ANON_KEY") || "";

  const res = await fetch(`${baseUrl}/api/db/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB query failed (${res.status}): ${text.substring(0, 200)}`);
  }

  return await res.json();
}

// ── Ensure tables exist (idempotent) ──
async function ensureTables() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      community_id TEXT NOT NULL REFERENCES communities(id),
      user_id TEXT NOT NULL DEFAULT 'anon',
      paper_title TEXT NOT NULL,
      episode_title TEXT NOT NULL,
      audio_url TEXT NOT NULL,
      cover_art_url TEXT DEFAULT '',
      description TEXT DEFAULT '',
      audience TEXT DEFAULT 'adult',
      story_mode TEXT DEFAULT 'documentary',
      style TEXT DEFAULT 'casual',
      upvotes_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS upvotes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      post_id TEXT NOT NULL REFERENCES posts(id),
      user_id TEXT NOT NULL DEFAULT 'anon',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id)
    )
  `);

  // Seed default communities if empty
  const existing = await dbQuery("SELECT COUNT(*) as cnt FROM communities");
  const count = existing?.rows?.[0]?.cnt ?? existing?.data?.[0]?.cnt ?? existing?.[0]?.cnt ?? 0;
  if (Number(count) === 0) {
    const seeds = [
      ["ai-ml", "AI & Machine Learning", "Papers on artificial intelligence, deep learning, and ML systems"],
      ["biology", "Biology & Life Sciences", "Genomics, ecology, neuroscience, and biomedical research"],
      ["physics", "Physics & Astronomy", "Quantum mechanics, astrophysics, condensed matter"],
      ["medicine", "Medicine & Health", "Clinical trials, epidemiology, public health"],
      ["cs-systems", "Computer Systems", "Distributed systems, databases, networking, security"],
      ["social-science", "Social Sciences", "Psychology, economics, sociology, political science"],
      ["climate", "Climate & Environment", "Climate change, sustainability, environmental science"],
      ["math", "Mathematics", "Pure and applied mathematics, statistics"],
    ];
    for (const [slug, name, desc] of seeds) {
      await dbQuery(
        "INSERT OR IGNORE INTO communities (slug, name, description) VALUES (?, ?, ?)",
        [slug, name, desc]
      );
    }
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    await ensureTables();

    const url = new URL(req.url);

    // ── GET: list communities or posts ──
    if (req.method === "GET") {
      const communityId = url.searchParams.get("communityId");

      if (!communityId) {
        // List all communities with post count
        const result = await dbQuery(`
          SELECT c.*, COALESCE(pc.post_count, 0) as post_count
          FROM communities c
          LEFT JOIN (SELECT community_id, COUNT(*) as post_count FROM posts GROUP BY community_id) pc
            ON c.id = pc.community_id
          ORDER BY c.name ASC
        `);
        return ok({ communities: result?.rows ?? result?.data ?? result ?? [] });
      }

      // List posts for a community
      const sort = url.searchParams.get("sort") || "popular";
      const orderBy = sort === "popular"
        ? "p.upvotes_count DESC, p.created_at DESC"
        : "p.created_at DESC";

      const result = await dbQuery(`
        SELECT p.* FROM posts p
        WHERE p.community_id = ?
        ORDER BY ${orderBy}
        LIMIT 50
      `, [communityId]);
      return ok({ posts: result?.rows ?? result?.data ?? result ?? [] });
    }

    // ── POST: actions ──
    if (req.method === "POST") {
      const body = await req.json();
      const action: string = body.action || "";

      if (action === "publish") {
        const { communityId, paperTitle, episodeTitle, audioUrl, coverArtUrl, description, audience, storyMode, style } = body;
        if (!communityId || !episodeTitle || !audioUrl) {
          return err("communityId, episodeTitle, and audioUrl are required");
        }

        await dbQuery(`
          INSERT INTO posts (community_id, paper_title, episode_title, audio_url, cover_art_url, description, audience, story_mode, style)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          communityId,
          paperTitle || episodeTitle,
          episodeTitle,
          audioUrl,
          coverArtUrl || "",
          description || "",
          audience || "adult",
          storyMode || "documentary",
          style || "casual",
        ]);

        return ok({ success: true });
      }

      if (action === "upvote") {
        const { postId, userId } = body;
        if (!postId) return err("postId is required");
        const uid = userId || "anon-" + crypto.randomUUID().slice(0, 8);

        // Check if already upvoted
        const existing = await dbQuery(
          "SELECT id FROM upvotes WHERE post_id = ? AND user_id = ?",
          [postId, uid]
        );
        const rows = existing?.rows ?? existing?.data ?? existing ?? [];

        if (rows.length > 0) {
          // Remove upvote
          await dbQuery("DELETE FROM upvotes WHERE post_id = ? AND user_id = ?", [postId, uid]);
          await dbQuery("UPDATE posts SET upvotes_count = MAX(0, upvotes_count - 1) WHERE id = ?", [postId]);
          return ok({ success: true, upvoted: false });
        } else {
          // Add upvote
          await dbQuery("INSERT INTO upvotes (post_id, user_id) VALUES (?, ?)", [postId, uid]);
          await dbQuery("UPDATE posts SET upvotes_count = upvotes_count + 1 WHERE id = ?", [postId]);
          return ok({ success: true, upvoted: true });
        }
      }

      return err("Unknown action. Use 'publish' or 'upvote'.");
    }

    return err("Method not allowed", 405);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[communities] error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
};
