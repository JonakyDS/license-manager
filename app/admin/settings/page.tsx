import { SettingsIcon } from "lucide-react";
import { PageHeader, StripeSyncCard } from "@/components/admin";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage application settings and integrations"
      />

      <div className="grid gap-6">
        <StripeSyncCard />
      </div>
    </div>
  );
}
