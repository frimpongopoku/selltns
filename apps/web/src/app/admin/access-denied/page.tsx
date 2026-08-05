import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Access denied" };

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">Selltns</p>
        <h1 className="mt-1 text-2xl font-semibold">This account isn&apos;t linked</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          That Google account isn&apos;t linked to a Selltns store yet. Ask your
          store owner to invite you, or sign in with a different account.
        </p>
        <Link href="/admin/login" className="mt-7 block">
          <Button className="w-full">Try a different account</Button>
        </Link>
        <p className="mt-4 text-xs text-muted-foreground">
          Want to create a new store instead?{" "}
          <Link href="/register" className="underline underline-offset-2">
            Register here
          </Link>
        </p>
      </Card>
    </div>
  );
}
