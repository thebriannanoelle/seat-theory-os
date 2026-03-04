"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shuffle } from "lucide-react";

export function GenerateMatchesButton({ demandBriefId }: { demandBriefId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/matches/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demandBriefId }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setResult(`${data.generated} matches generated`);
      router.refresh();
    } else {
      setResult(data.error ?? "Failed to generate matches");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={handleGenerate} disabled={loading}>
        <Shuffle className="mr-1 h-3 w-3" />
        {loading ? "Generating..." : "Generate Matches"}
      </Button>
      {result && <span className="text-xs text-muted-foreground">{result}</span>}
    </div>
  );
}
