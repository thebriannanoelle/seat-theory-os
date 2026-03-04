"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shuffle, Send, CheckCircle, Loader2, Trophy, X } from "lucide-react";

interface MatchResult {
  matchId: string;
  inventoryId: string;
  propertyName: string;
  matchScore: number;
  reasonCodes: string[];
  assetsAvailable: string[];
  dealSizeMin: number | null;
  dealSizeMax: number | null;
  status: string;
  alreadyExists: boolean;
}

function formatReasonCode(code: string): string {
  return code
    .replace(/_/g, " ")
    .replace(/:/g, ": ")
    .replace(/,/g, ", ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-blue-600";
  if (score >= 25) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 75) return "bg-emerald-50 border-emerald-200";
  if (score >= 50) return "bg-blue-50 border-blue-200";
  if (score >= 25) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function GenerateMatchesButton({
  demandBriefId,
}: {
  demandBriefId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [generated, setGenerated] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [introLoading, setIntroLoading] = useState<string | null>(null);
  const [introCreated, setIntroCreated] = useState<Set<string>>(new Set());

  async function handleGenerate() {
    setLoading(true);
    setResults(null);

    const res = await fetch("/api/matches/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demandBriefId }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setResults(data.results);
      setGenerated(data.generated);
      setPanelOpen(true);
      router.refresh();
    }
  }

  async function handleCreateIntro(matchId: string) {
    setIntroLoading(matchId);

    const res = await fetch("/api/introductions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, notes: "Created from match generation" }),
    });

    setIntroLoading(null);

    if (res.ok) {
      setIntroCreated((prev) => new Set(prev).add(matchId));
      router.refresh();
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        ) : (
          <Shuffle className="mr-1 h-3 w-3" />
        )}
        {loading ? "Generating..." : "Generate Matches"}
      </Button>

      <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Match Results
              {results && (
                <Badge variant="secondary" className="ml-2">
                  {generated} new &middot; {results.length} total
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {results && results.length === 0 && (
            <div className="py-12 text-center">
              <X className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">No matches found</p>
              <p className="text-sm text-muted-foreground">
                No inventory records matched this demand brief&apos;s filters.
                Try adjusting categories or budget ranges.
              </p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((result) => (
                <Card
                  key={result.matchId}
                  className={`relative overflow-hidden transition-shadow hover:shadow-md ${scoreBg(result.matchScore)}`}
                >
                  {result.alreadyExists && (
                    <div className="absolute right-3 top-3">
                      <Badge variant="outline" className="text-xs">
                        Existing
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-3">
                    <CardTitle className="pr-16 text-base">
                      {result.propertyName}
                    </CardTitle>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-3xl font-bold tabular-nums ${scoreColor(result.matchScore)}`}
                      >
                        {result.matchScore}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / 100
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-3">
                    {result.reasonCodes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {result.reasonCodes.map((code) => (
                          <Badge
                            key={code}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {formatReasonCode(code)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {(result.dealSizeMin || result.dealSizeMax) && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Deal Size:
                        </span>{" "}
                        {result.dealSizeMin
                          ? formatCurrency(result.dealSizeMin)
                          : "—"}{" "}
                        &ndash;{" "}
                        {result.dealSizeMax
                          ? formatCurrency(result.dealSizeMax)
                          : "—"}
                      </p>
                    )}

                    {result.assetsAvailable.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Assets Available
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {result.assetsAvailable.map((asset) => (
                            <Badge
                              key={asset}
                              variant="outline"
                              className="text-xs"
                            >
                              {asset}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-0">
                    {introCreated.has(result.matchId) ? (
                      <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                        Introduction created
                      </p>
                    ) : result.status === "INTRO_SENT" ||
                      result.status === "MEETING_BOOKED" ? (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4" />
                        {result.status === "INTRO_SENT"
                          ? "Intro already sent"
                          : "Meeting booked"}
                      </p>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleCreateIntro(result.matchId)}
                        disabled={introLoading === result.matchId}
                      >
                        {introLoading === result.matchId ? (
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="mr-1.5 h-3 w-3" />
                        )}
                        Create Introduction
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
