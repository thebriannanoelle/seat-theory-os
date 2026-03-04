"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Share2, Send } from "lucide-react";

interface MatchActionsProps {
  matchId: string;
  status: string;
  visibility: string;
}

export function MatchActions({ matchId, status, visibility }: MatchActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function shareMatch() {
    setLoading(true);
    await fetch(`/api/matches`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: matchId, visibility: "SHARED", status: "PROPOSED" }),
    });
    setLoading(false);
    router.refresh();
  }

  async function createIntro() {
    setLoading(true);
    await fetch("/api/introductions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      {visibility === "INTERNAL" && (
        <Button size="sm" variant="ghost" onClick={shareMatch} disabled={loading}>
          <Share2 className="h-3 w-3" />
        </Button>
      )}
      {(status === "PROPOSED" || status === "DRAFT") && (
        <Button size="sm" variant="ghost" onClick={createIntro} disabled={loading}>
          <Send className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
