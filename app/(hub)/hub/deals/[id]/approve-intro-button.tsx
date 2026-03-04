"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export function ApproveIntroButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleApprove() {
    setLoading(true);

    await fetch("/api/introductions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, notes: "Approved by client" }),
    });

    setLoading(false);
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCircle className="h-4 w-4" />
        Introduction approved!
      </p>
    );
  }

  return (
    <Button onClick={handleApprove} disabled={loading}>
      {loading ? "Approving..." : "Approve Introduction"}
    </Button>
  );
}
