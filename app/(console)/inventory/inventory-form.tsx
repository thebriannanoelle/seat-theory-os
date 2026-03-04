"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function InventoryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      propertyName: formData.get("propertyName"),
      categoryAvailable: (formData.get("categoryAvailable") as string)
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [],
      dealSizeMin: formData.get("dealSizeMin") || null,
      dealSizeMax: formData.get("dealSizeMax") || null,
      audienceTags: (formData.get("audienceTags") as string)
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [],
      assetsAvailable: (formData.get("assetsAvailable") as string)
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [],
      contractExpiration: formData.get("contractExpiration") || null,
    };

    await fetch("/api/inventory", {
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
          Add Inventory
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Inventory</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="propertyName">Property Name</Label>
            <Input id="propertyName" name="propertyName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryAvailable">Categories (comma-separated)</Label>
            <Input id="categoryAvailable" name="categoryAvailable" placeholder="e.g., sports, entertainment" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dealSizeMin">Deal Size Min ($)</Label>
              <Input id="dealSizeMin" name="dealSizeMin" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dealSizeMax">Deal Size Max ($)</Label>
              <Input id="dealSizeMax" name="dealSizeMax" type="number" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="audienceTags">Audience Tags (comma-separated)</Label>
            <Input id="audienceTags" name="audienceTags" placeholder="e.g., millennials, sports fans" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assetsAvailable">Assets Available (comma-separated)</Label>
            <Input id="assetsAvailable" name="assetsAvailable" placeholder="e.g., signage, naming rights, hospitality" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractExpiration">Contract Expiration</Label>
            <Input id="contractExpiration" name="contractExpiration" type="date" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Add Inventory"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
