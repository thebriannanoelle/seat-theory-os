"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function DemandBriefForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title"),
      goals: formData.get("goals") || null,
      audienceTags: (formData.get("audienceTags") as string)
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [],
      geography: formData.get("geography") || null,
      budgetMin: formData.get("budgetMin") || null,
      budgetMax: formData.get("budgetMax") || null,
      categoryConstraints: (formData.get("categoryConstraints") as string)
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [],
      activationRequirements: formData.get("activationRequirements") || null,
      timelineStart: formData.get("timelineStart") || null,
      timelineEnd: formData.get("timelineEnd") || null,
    };

    await fetch("/api/demand-briefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Demand Brief
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Demand Brief</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goals">Goals</Label>
            <Textarea id="goals" name="goals" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetMin">Budget Min ($)</Label>
              <Input id="budgetMin" name="budgetMin" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetMax">Budget Max ($)</Label>
              <Input id="budgetMax" name="budgetMax" type="number" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="geography">Geography</Label>
            <Input id="geography" name="geography" placeholder="e.g., US, Global" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audienceTags">Audience Tags (comma-separated)</Label>
            <Input id="audienceTags" name="audienceTags" placeholder="e.g., millennials, sports fans, families" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryConstraints">Category Constraints (comma-separated)</Label>
            <Input id="categoryConstraints" name="categoryConstraints" placeholder="e.g., sports, entertainment" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activationRequirements">Activation Requirements</Label>
            <Textarea id="activationRequirements" name="activationRequirements" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timelineStart">Timeline Start</Label>
              <Input id="timelineStart" name="timelineStart" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timelineEnd">Timeline End</Label>
              <Input id="timelineEnd" name="timelineEnd" type="date" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Demand Brief"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
