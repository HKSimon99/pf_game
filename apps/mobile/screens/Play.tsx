import { useState } from "react";
import { View, Text, Button } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { VictoryChart, VictoryLine } from "victory-native";
import { Slider } from "@react-native-assets/slider";
import { ASSETS } from "@game/shared/src/constants";

export default function Play() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState<string | null>(null);
  const [series, setSeries] = useState<{ x: string; y: number }[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});

  async function start() {
    const tok = (await supabase.auth.getSession()).data.session?.access_token;
    if (!tok) await supabase.auth.signInWithOAuth({ provider: "github" });
    const r = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/start-game`, {
      method: "POST",
      headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
    });
    const j = await r.json();
    setGameId(j.gameId);
    setAsOfDate(j.startDate);
    setSeries([{ x: j.startDate, y: 10000 }]);
  }

  async function next() {
    if (!gameId || !asOfDate) return;
    const nd = new Date(asOfDate + "T00:00:00Z"); nd.setUTCDate(nd.getUTCDate() + 1);
    const nextDate = nd.toISOString().slice(0,10);
    const orders = Object.entries(weights).map(([k, w]) => {
      const [assetType, assetId] = k.split(":") as ["crypto"|"equity", string];
      return { assetType, assetId, weight: w };
    });
    const r = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/submit-turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      body: JSON.stringify({ gameId, asOfDate: nextDate, orders })
    });
    const j = await r.json();
    setAsOfDate(nextDate);
    setSeries((s) => [...s, { x: nextDate, y: j.nav }]);
    Haptics.selectionAsync();
  }

  const keys = ASSETS.map(a => `${a.assetType}:${a.assetId}`);
  const total = Object.values(weights).reduce((s, x) => s + x, 0);
  const cash = Math.max(0, 1 - total);

  return (
    <View style={{ padding: 16 }}>
      <Button title="Start" onPress={start} disabled={!!gameId} />
      <Button title="Next Turn" onPress={next} disabled={!gameId} />
      <Text>Cash: {(cash*100).toFixed(0)}%</Text>
      {keys.map(k => (
        <View key={k} style={{ marginVertical: 8 }}>
          <Text>{k} {(weights[k] ?? 0 * 100).toFixed(0)}%</Text>
          <Slider
            value={[(weights[k] ?? 0) * 100]}
            onValueChange={([v]) => setWeights({ ...weights, [k]: v/100 })}
            minimumValue={0}
            maximumValue={100}
            step={5}
          />
        </View>
      ))}
      <VictoryChart>
        <VictoryLine data={series} x="x" y="y" />
      </VictoryChart>
    </View>
  );
}
