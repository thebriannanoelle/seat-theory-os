"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, FileDown } from "lucide-react";

export function IntroPackActions({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            Copy Intro Pack
          </>
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled
        title="PDF export coming soon"
      >
        <FileDown className="mr-1.5 h-4 w-4" />
        Download PDF
      </Button>
    </div>
  );
}
