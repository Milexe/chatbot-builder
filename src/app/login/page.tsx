import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your email and we will send a magic link to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" action="#" method="post">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  disabled
                />
              </div>
              <Button type="submit" disabled>
                Send magic link
              </Button>
            </form>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mt-3 w-full",
              )}
            >
              Back to home
            </Link>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
