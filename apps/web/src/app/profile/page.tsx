"use client";
import { supabase } from "@/src/lib/supabase";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  return (
    <div className="p-4 space-y-4">
      {email ? (
        <div>Signed in as {email}</div>
      ) : (
        <Button onClick={() => supabase.auth.signInWithOAuth({ provider: "github" })}>
          Sign in with GitHub
        </Button>
      )}
    </div>
  );
}
