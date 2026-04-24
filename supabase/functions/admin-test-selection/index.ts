// admin-test-selection — runs the Selection Engine against a synthetic profile.
// Admin-only. Returns selected Moves without calling the Voice Wrapper or
// persisting anything.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  type Lens,
  type Move,
  type RespondentProfile,
  type SizeBand,
  selectMoves,
} from "../_shared/selection-engine.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  profile: {
    lens: Lens;
    function: string | null;
    size_band: SizeBand | null;
    pillar_tiers: Record<string, number>;
    cap_flag_pillars?: number[];
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Require a Bearer token and verify admin role via has_role().
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userResp, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userResp?.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
    _user_id: userResp.user.id,
    _role: "admin",
  });
  if (roleErr || isAdmin !== true) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const validation = validateProfile(body?.profile);
  if (!validation.ok) return json({ error: validation.error }, 400);
  const profile = validation.profile;

  // Load active Moves for this lens (and function for functional).
  let q = admin
    .from("outcomes_library")
    .select(
      "id,lens,pillar,tier_band,function,size_bands,title,why_matters,what_to_do,how_to_know,effort,tags,cta_type,cta_url,active,last_reviewed_at,body,applies_to_tier",
    )
    .eq("active", true)
    .eq("lens", profile.lens);
  if (profile.lens === "functional" && profile.function) {
    q = q.or(`function.eq.${profile.function},function.is.null`);
  }
  const { data: moves, error: movesErr } = await q.limit(2000);
  if (movesErr) return json({ error: movesErr.message }, 500);

  const playbook = (moves ?? []) as Move[];
  const selected = selectMoves(profile, playbook);

  return json({
    profile,
    candidate_count: playbook.length,
    selected_count: selected.length,
    selected: selected.map((m) => ({
      id: m.id,
      title: m.title,
      lens: m.lens,
      pillar: m.pillar,
      tier_band: m.tier_band,
      function: m.function,
      effort: m.effort,
      role: m.role ?? null,
      score: Math.round(m.score * 1000) / 1000,
    })),
  });
});

function validateProfile(p: RequestBody["profile"] | undefined): {
  ok: true;
  profile: RespondentProfile;
} | { ok: false; error: string } {
  if (!p) return { ok: false, error: "Missing profile" };
  if (!["individual", "organisational", "functional"].includes(p.lens)) {
    return { ok: false, error: "Invalid lens" };
  }
  if (p.lens === "functional" && !p.function) {
    return { ok: false, error: "Functional lens requires function" };
  }
  if (!p.pillar_tiers || typeof p.pillar_tiers !== "object") {
    return { ok: false, error: "Missing pillar_tiers" };
  }
  const tiers: Record<number, number> = {};
  for (let i = 1; i <= 8; i++) {
    const raw = (p.pillar_tiers as Record<string, number>)[String(i)] ??
      (p.pillar_tiers as Record<string, number>)[i as unknown as string];
    const v = Number(raw);
    if (Number.isNaN(v) || v < 0 || v > 5) {
      return { ok: false, error: `Pillar ${i} tier must be 0–5` };
    }
    tiers[i] = v;
  }
  return {
    ok: true,
    profile: {
      lens: p.lens,
      function: p.function ?? null,
      size_band: p.size_band ?? null,
      pillar_tiers: tiers,
      cap_flag_pillars: Array.isArray(p.cap_flag_pillars) ? p.cap_flag_pillars : [],
    },
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
