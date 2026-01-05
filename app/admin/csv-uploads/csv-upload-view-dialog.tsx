"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ViewDialog, DetailRow } from "@/components/admin";
import type { CsvUploadTableData } from "@/lib/types/admin";
import {
  GlobeIcon,
  ServerIcon,
  FileIcon,
  KeyIcon,
  PackageIcon,
  UserIcon,
  MailIcon,
  CalendarIcon,
  AlertCircleIcon,
  LinkIcon,
} from "lucide-react";

interface CsvUploadViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvUpload: CsvUploadTableData | null;
}

const statusVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  processing: "secondary",
  processed: "default",
  failed: "destructive",
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export function CsvUploadViewDialog({
  open,
  onOpenChange,
  csvUpload,
}: CsvUploadViewDialogProps) {
  if (!csvUpload) return null;

  return (
    <ViewDialog
      open={open}
      onOpenChange={onOpenChange}
      title="CSV Upload Details"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Status Header */}
        <div className="bg-muted/50 flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Status</span>
            <Badge variant={statusVariants[csvUpload.status]}>
              {csvUpload.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <GlobeIcon className="text-muted-foreground size-4" />
            <span className="font-medium">{csvUpload.domain}</span>
          </div>
        </div>

        {/* Error Message (if failed) */}
        {csvUpload.status === "failed" && csvUpload.errorMessage && (
          <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <AlertCircleIcon className="mt-0.5 size-5 flex-shrink-0 text-red-500" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                Error Message
              </span>
              <span className="text-sm text-red-600 dark:text-red-300">
                {csvUpload.errorMessage}
              </span>
            </div>
          </div>
        )}

        <Separator />

        {/* File Details Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">File Information</h4>
          <div className="grid gap-4">
            <DetailRow
              icon={<FileIcon className="size-4" />}
              label="File Name"
              value={csvUpload.csvFileName}
            />
            <DetailRow
              icon={<FileIcon className="size-4" />}
              label="File Size"
              value={formatFileSize(csvUpload.csvFileSize)}
            />
            <DetailRow
              icon={<LinkIcon className="size-4" />}
              label="File URL"
              value={
                <a
                  href={csvUpload.csvFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm break-all hover:underline"
                >
                  {csvUpload.csvFileUrl}
                </a>
              }
            />
          </div>
        </div>

        <Separator />

        {/* SFTP Details Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">SFTP Configuration</h4>
          <div className="grid gap-4">
            <DetailRow
              icon={<ServerIcon className="size-4" />}
              label="SFTP Host"
              value={`${csvUpload.sftpHost}:${csvUpload.sftpPort}`}
            />
            <DetailRow
              icon={<UserIcon className="size-4" />}
              label="SFTP Username"
              value={csvUpload.sftpUsername}
            />
            <DetailRow
              icon={<KeyIcon className="size-4" />}
              label="SFTP Password"
              value="••••••••"
            />
          </div>
        </div>

        <Separator />

        {/* License Details Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">License Information</h4>
          <div className="grid gap-4">
            <DetailRow
              icon={<KeyIcon className="size-4" />}
              label="License Key"
              value={
                <code className="bg-muted rounded px-2 py-0.5 font-mono text-xs">
                  {csvUpload.license?.licenseKey || "Unknown"}
                </code>
              }
            />
            {csvUpload.license?.product?.name && (
              <DetailRow
                icon={<PackageIcon className="size-4" />}
                label="Product"
                value={csvUpload.license.product.name}
              />
            )}
            {csvUpload.license?.customerName && (
              <DetailRow
                icon={<UserIcon className="size-4" />}
                label="Customer Name"
                value={csvUpload.license.customerName}
              />
            )}
            {csvUpload.license?.customerEmail && (
              <DetailRow
                icon={<MailIcon className="size-4" />}
                label="Customer Email"
                value={csvUpload.license.customerEmail}
              />
            )}
          </div>
        </div>

        <Separator />

        {/* Timestamps Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Timestamps</h4>
          <div className="grid gap-4">
            <DetailRow
              icon={<CalendarIcon className="size-4" />}
              label="Created At"
              value={format(
                new Date(csvUpload.createdAt),
                "MMMM d, yyyy 'at' h:mm a"
              )}
            />
            <DetailRow
              icon={<CalendarIcon className="size-4" />}
              label="Updated At"
              value={format(
                new Date(csvUpload.updatedAt),
                "MMMM d, yyyy 'at' h:mm a"
              )}
            />
            {csvUpload.processedAt && (
              <DetailRow
                icon={<CalendarIcon className="size-4" />}
                label="Processed At"
                value={format(
                  new Date(csvUpload.processedAt),
                  "MMMM d, yyyy 'at' h:mm a"
                )}
              />
            )}
          </div>
        </div>
      </div>
    </ViewDialog>
  );
}
