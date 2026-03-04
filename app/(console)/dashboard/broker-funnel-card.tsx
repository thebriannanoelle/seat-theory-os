"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowDown,
  ArrowUp,
  Minus,
  Loader2,
  TrendingDown,
} from "lucide-react";

interface FunnelStep {
  label: string;
  current: number;
  previous: number;
}

function conversionRate(from: number, to: number): string {
  if (from === 0) return "—";
  return `${Math.round((to / from) * 100)}%`;
}

function Delta({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        0
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-emerald-600">
        <ArrowUp className="h-3 w-3" />
        +{diff}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-red-600">
      <ArrowDown className="h-3 w-3" />
      {diff}
    </span>
  );
}

export function BrokerFunnelCard() {
  const [steps, setSteps] = useState<FunnelStep[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/funnel")
      .then((res) => res.json())
      .then((data) => {
        setSteps(data.steps ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Broker Funnel
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!steps) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Broker Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load funnel data.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Find max current value for bar widths
  const maxValue = Math.max(...steps.map((s) => s.current), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Broker Funnel
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            This month vs. last month
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header */}
          <div className="mb-3 grid grid-cols-[1fr_4rem_4rem_4rem] gap-2 text-xs font-medium text-muted-foreground">
            <span>Stage</span>
            <span className="text-right">Count</span>
            <span className="text-right">vs Last</span>
            <span className="text-right">Conv.</span>
          </div>

          {steps.map((step, i) => {
            const barWidth = Math.max(
              4,
              Math.round((step.current / maxValue) * 100)
            );
            const conversion =
              i > 0
                ? conversionRate(steps[i - 1].current, step.current)
                : "—";

            return (
              <div key={step.label} className="group">
                <div className="grid grid-cols-[1fr_4rem_4rem_4rem] items-center gap-2 py-1.5">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">{step.label}</span>
                    <div className="h-2 rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-primary/70 transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-right text-sm font-bold tabular-nums">
                    {step.current}
                  </span>
                  <div className="flex justify-end">
                    <Delta
                      current={step.current}
                      previous={step.previous}
                    />
                  </div>
                  <span className="text-right text-sm tabular-nums text-muted-foreground">
                    {conversion}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="ml-2 border-l-2 border-dashed border-muted-foreground/20 pl-2">
                    <span className="text-[10px] text-muted-foreground">
                      {conversionRate(step.current, steps[i + 1].current)}{" "}
                      pass-through
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
