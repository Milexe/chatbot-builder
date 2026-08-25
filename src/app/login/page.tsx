import Link from "next/link";

import { LoginForm } from "@/app/login/login-form";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Sign in with Google or email to manage your chatbots.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {params.error ? (
              <p className="text-sm text-destructive" role="alert">
                {params.error}
              </p>
            ) : null}
            <LoginForm />
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full",
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
