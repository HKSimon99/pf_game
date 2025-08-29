import { View, Button, Text } from "react-native";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

export default function Profile() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  return (
    <View style={{ padding: 16 }}>
      {email ? <Text>Signed in as {email}</Text> : <Button title="Sign in with GitHub" onPress={() => supabase.auth.signInWithOAuth({ provider: "github" })} />}
    </View>
  );
}
