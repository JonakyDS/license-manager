import { SettingsIcon } from "lucide-react";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="flex min-h-[600px] flex-col items-center justify-center gap-6">
      <div className="bg-primary/10 text-primary flex size-20 items-center justify-center rounded-full">
        <SettingsIcon className="size-10" />
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-lg">Coming Soon</p>
        <p className="text-muted-foreground max-w-md text-sm">
          We&apos;re working on bringing you powerful settings and configuration
          options. Stay tuned!
        </p>
      </div>
    </div>
  );
}
