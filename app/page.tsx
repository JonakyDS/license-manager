import { Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-b p-4">
      <div className="max-w-2xl space-y-8 text-center">
        <div className="flex justify-center">
          <div className="bg-primary/10 rounded-full p-4">
            <Shield className="text-primary h-16 w-16" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Licence Management Server
          </h1>
          <p className="text-muted-foreground text-xl">
            This is the official licence management server for our plugins and
            themes.
          </p>
        </div>

        <div className="border-border border-t pt-4">
          <p className="text-muted-foreground text-sm">
            For API documentation, please refer to our developer resources.
          </p>
        </div>
      </div>
    </div>
  );
}
