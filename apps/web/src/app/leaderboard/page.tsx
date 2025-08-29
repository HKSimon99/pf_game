"use client";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

type LeaderboardRow = {
  final_nav: number;
  turns_played: number;
  season_id: number;
};

export default function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  async function fetchRows() {
    const r = await fetch("/functions/v1/leaderboard?limit=50");
    const j = await r.json();
    setRows(j.data ?? []);
  }

  useEffect(() => {
    const supabase = createSupabaseClient();
    fetchRows();
    const ch = supabase
      .channel("results")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_results" }, fetchRows)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Leaderboard</h1>
      <table className="min-w-[600px]">
        <thead><tr><th>Final NAV</th><th>Turns</th><th>Season</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}><td>${Number(r.final_nav).toFixed(2)}</td><td>{r.turns_played}</td><td>{r.season_id}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
