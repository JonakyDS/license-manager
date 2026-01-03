import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b bg-white dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <h1 className="text-xl font-semibold">Licence Manager</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-lg border bg-white p-6 dark:bg-zinc-900">
            <h2 className="text-2xl font-bold">
              Welcome, {session.user.name}!
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              You are now signed in to your account.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
