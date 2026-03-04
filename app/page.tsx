import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Seat Theory Broker OS</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Sports sponsorship brokerage platform
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/dashboard">
          <Button size="lg">Operator Console</Button>
        </Link>
        <Link href="/hub/dashboard">
          <Button size="lg" variant="outline">
            Client Hub
          </Button>
        </Link>
      </div>
    </div>
  );
}
