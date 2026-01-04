"use client";

import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ViewDialog, DetailRow } from "@/components/admin";
import type { LicenseTableData } from "@/lib/types/admin";
import {
  PackageIcon,
  UserIcon,
  MailIcon,
  CalendarIcon,
  ClockIcon,
  GlobeIcon,
  FileTextIcon,
  CopyIcon,
} from "lucide-react";

interface LicenseViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  license: LicenseTableData | null;
}

const statusVariants: Record<string, "default" | "secondary" | "destructive"> =
  {
    active: "default",
    expired: "secondary",
    revoked: "destructive",
  };

export function LicenseViewDialog({
  open,
  onOpenChange,
  license,
}: LicenseViewDialogProps) {
  if (!license) return null;

  const copyLicenseKey = async () => {
    try {
      await navigator.clipboard.writeText(license.licenseKey);
      toast.success("License key copied to clipboard");
    } catch {
      toast.error("Failed to copy license key");
    }
  };

  return (
    <ViewDialog
      open={open}
      onOpenChange={onOpenChange}
      title="License Details"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* License Key Header */}
        <div className="bg-muted/50 flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">License Key</span>
            <Badge variant={statusVariants[license.status]}>
              {license.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-background flex-1 rounded px-3 py-2 font-mono text-sm">
              {license.licenseKey}
            </code>
            <Button variant="outline" size="icon" onClick={copyLicenseKey}>
              <CopyIcon className="size-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Details */}
        <div className="grid gap-4">
          <DetailRow
            icon={<PackageIcon className="size-4" />}
            label="Product"
            value={license.product?.name || "Unknown"}
          />

          {license.customerName && (
            <DetailRow
              icon={<UserIcon className="size-4" />}
              label="Customer Name"
              value={license.customerName}
            />
          )}

          {license.customerEmail && (
            <DetailRow
              icon={<MailIcon className="size-4" />}
              label="Customer Email"
              value={license.customerEmail}
            />
          )}

          <DetailRow
            icon={<ClockIcon className="size-4" />}
            label="Validity Period"
            value={`${license.validityDays} days`}
          />

          <DetailRow
            icon={<GlobeIcon className="size-4" />}
            label="Domain Changes"
            value={`${license.domainChangesUsed} / ${license.maxDomainChanges} used`}
          />

          {license.activatedAt && (
            <DetailRow
              icon={<CalendarIcon className="size-4" />}
              label="Activated At"
              value={format(
                new Date(license.activatedAt),
                "MMMM d, yyyy 'at' h:mm a"
              )}
            />
          )}

          {license.expiresAt && (
            <DetailRow
              icon={<CalendarIcon className="size-4" />}
              label="Expires At"
              value={format(
                new Date(license.expiresAt),
                "MMMM d, yyyy 'at' h:mm a"
              )}
            />
          )}

          <DetailRow
            icon={<CalendarIcon className="size-4" />}
            label="Created"
            value={format(
              new Date(license.createdAt),
              "MMMM d, yyyy 'at' h:mm a"
            )}
          />

          {license.notes && (
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2">
                <FileTextIcon className="size-4" />
                <span className="text-xs">Notes</span>
              </div>
              <p className="bg-muted rounded-lg p-3 text-sm">{license.notes}</p>
            </div>
          )}
        </div>
      </div>
    </ViewDialog>
  );
}
