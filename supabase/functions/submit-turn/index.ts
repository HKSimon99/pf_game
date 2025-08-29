// What this file does: Process a turn - rebalance, apply fees/slippage, compute next NAV, store orders/turn.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { SubmitTurnSchema } from "../_shared/types.ts";
import { getClose } from "../_shared/prices.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&no-check";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  try {
    const auth = req.headers.get("Authorization")!;
    const supa = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false }
    });

    const body = await req.json();
    const p = SubmitTurnSchema.parse(body);

    // Load game + last turn
    const { data: game } = await supa.from("games").select("*").eq("id", p.gameId).single();
    if (!game || game.status !== "active") return new Response("Game not active", { status: 400 });

    const { data: lastTurn } = await supa
      .from("turns")
      .select("*")
      .eq("game_id", p.gameId)
      .order("turn_index", { ascending: false })
      .limit(1)
      .single();

    const nextIndex = lastTurn.turn_index + 1;

    // Validate weights sum
    const sumW = p.orders.reduce((s, o) => s + o.weight, 0);
    if (sumW > 1 + 1e-6) return new Response("Weights must sum <= 1", { status: 400 });

    // Cash is leftover
    const cashWeightNew = Math.max(0, 1 - sumW);
    const weightsNew: Record<string, number> = {};
    p.orders.forEach(o => { weightsNew[`${o.assetType}:${o.assetId}`] = o.weight; });

    // Previous weights
    const weightsPrev: Record<string, number> = lastTurn.weights || {};
    const cashWeightPrev = Math.max(0, 1 - Object.values(weightsPrev).reduce((s: number, x: number) => s + x, 0));

    // Turnover and costs
    let turnover = 0;
    const allKeys = new Set([...Object.keys(weightsPrev), ...Object.keys(weightsNew), ["cash"] as any]);
    allKeys.forEach((k: string) => {
      const wp = k === "cash" ? cashWeightPrev : (weightsPrev[k] ?? 0);
      const wn = k === "cash" ? cashWeightNew  : (weightsNew[k]  ?? 0);
      turnover += Math.abs(wn - wp);
    });
    const bps = (game.fee_bps + game.slippage_bps) / 10000;
    const costs = Number(lastTurn.nav) * turnover * bps;
    const navAfterCosts = Number(lastTurn.nav) - costs;

    // Compute price relatives p_t / p_prev for each asset
    async function rel(key: string): Promise<number> {
      if (key === "cash") return 1;
      const [assetType, assetId] = key.split(":") as ["crypto"|"equity", string];
      const prev = await getClose(assetType, assetId, lastTurn.as_of_date);
      const curr = await getClose(assetType, assetId, p.asOfDate);
      return Number(curr) / Number(prev);
    }

    // Portfolio next NAV = nav_after_costs * sum_i w_new_i * rel_i
    const keys = Object.keys(weightsNew);
    const rels = await Promise.all(keys.map(rel));
    let growth = 0;
    for (let i = 0; i < keys.length; i++) growth += (weightsNew[keys[i]] ?? 0) * rels[i];
    growth += cashWeightNew * 1; // cash stays the same
    const nextNAV = navAfterCosts * growth;

    // Save order + new turn
    const { data: turn } = await supa.from("turns").insert({
      game_id: p.gameId,
      turn_index: nextIndex,
      as_of_date: p.asOfDate,
      nav: nextNAV,
      cash: nextNAV * cashWeightNew,
      weights: weightsNew
    }).select().single();

    await supa.from("orders").insert({
      game_id: p.gameId,
      turn_id: turn.id,
      payload: p as any,
      turnover,
      costs
    });

    // Bump game pointer
    await supa.from("games").update({ current_turn: nextIndex }).eq("id", p.gameId);

    return new Response(JSON.stringify({ nav: nextNAV, turnIndex: nextIndex }), { headers: { "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
