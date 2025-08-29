"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { ASSETS } from "@game/shared/constants";
import { SubmitTurnSchema } from "@game/shared/schemas";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AreaChart, Card, Title } from "@tremor/react";

type Point = { date: string; nav: number };

export default function PlayPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState<string | null>(null);
  const [nav, setNav] = useState<number | null>(null);
  const [series, setSeries] = useState<Point[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.code === "KeyN") advance(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameId, asOfDate, weights, nav]);

  async function start() {
    const supabase = createSupabaseClient();
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) await supabase.auth.signInWithOAuth({ provider: "github" }); // quick path
    const r = await fetch(
      "/functions/v1/start-game",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({}),
      },
    );
    const j = await r.json();
    setGameId(j.gameId);
    setAsOfDate(j.startDate);
    setNav(10000);
    setSeries([{ date: j.startDate, nav: 10000 }]);
  }

  async function advance() {
    if (!gameId || !asOfDate) return;
    // simple +1 day
    const next = new Date(asOfDate + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    const nextDate = next.toISOString().slice(0,10);

    const orders = Object.entries(weights).map(([k, w]) => {
      const [assetType, assetId] = k.split(":") as ["crypto"|"equity", string];
      return { assetType, assetId, weight: w };
    });

    const payload = { gameId, asOfDate: nextDate, orders };
    SubmitTurnSchema.parse(payload);

    const supabase = createSupabaseClient();
    const r = await fetch("/functions/v1/submit-turn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    setAsOfDate(nextDate);
    setNav(j.nav);
    setSeries(s => [...s, { date: nextDate, nav: j.nav }]);
  }

  const assetKeys = useMemo(() => ASSETS.map(a => `${a.assetType}:${a.assetId}`), []);
  const total = Object.values(weights).reduce((s, x) => s + x, 0);
  const cash = Math.max(0, 1 - total);

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <Button onClick={start} disabled={!!gameId}>Start Game</Button>
        <Button onClick={advance} disabled={!gameId}>Next Turn (N)</Button>
      </div>
      <Card>
        <Title>NAV</Title>
        <AreaChart
          data={series}
          index="date"
          categories={["nav"]}
          valueFormatter={(n) => `$${n.toFixed(2)}`}
          yAxisWidth={60}
        />
      </Card>
      <Card>
        <Title>Weights (Cash auto-fills the rest)</Title>
        <div className="space-y-3">
          {assetKeys.map((k) => (
            <div key={k}>
              <div className="flex justify-between">
                <span>{k}</span>
                <span>{((weights[k] ?? 0) * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[Math.round((weights[k] ?? 0) * 100)]}
                onValueChange={([v]) => setWeights({ ...weights, [k]: v / 100 })}
                max={100}
                step={5}
              />
            </div>
          ))}
          <div className="text-sm">Cash: {(cash * 100).toFixed(0)}%</div>
        </div>
      </Card>
    </div>
  );
}
