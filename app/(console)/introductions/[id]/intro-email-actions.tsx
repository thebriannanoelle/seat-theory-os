"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, MailCheck, Loader2 } from "lucide-react";

interface IntroEmailActionsProps {
  introId: string;
  subject: string;
  body: string;
  sent: boolean;
}

export function IntroEmailActions({
  introId,
  subject,
  body,
  sent: initialSent,
}: IntroEmailActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(initialSent);
  const [marking, setMarking] = useState(false);

  async function handleCopy() {
    const fullEmail = `Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleMarkSent() {
    setMarking(true);
    const res = await fetch(`/api/introductions/${introId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markSent: true }),
    });
    setMarking(false);
    if (res.ok) {
      setSent(true);
      router.refresh();
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleCopy}>
        {copied ? (
          <>
            <CheckCircle className="mr-1.5 h-4 w-4 text-emerald-600" />
            Copied
          </>
        ) : (
          <>
            <Copy className="mr-1.5 h-4 w-4" />
            Copy Intro Email
          </>
        )}
      </Button>
      {sent ? (
        <span className="flex items-center gap-1.5 text-sm text-emerald-600">
          <MailCheck className="h-4 w-4" />
          Sent
        </span>
      ) : (
        <Button variant="outline" size="sm" onClick={handleMarkSent} disabled={marking}>
          {marking ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <MailCheck className="mr-1.5 h-4 w-4" />
          )}
          Mark Intro Sent
        </Button>
      )}
    </div>
  );
}
