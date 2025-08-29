import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";

export default function Leaderboard() {
  const [rows, setRows] = useState<any[]>([]);
  const fetchRows = useCallback(async () => {
    const r = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/leaderboard?limit=50`);
    const j = await r.json();
    setRows(j.data ?? []);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  return (
    <View style={{ padding: 16 }}>
      {rows.map((r, i) => (<Text key={i}>{i+1}. ${Number(r.final_nav).toFixed(2)} ({r.turns_played} turns)</Text>))}
    </View>
  );
}
