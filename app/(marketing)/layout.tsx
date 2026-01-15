import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Header, Footer } from "@/components/marketing";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user
    ? { name: session.user.name, email: session.user.email }
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
