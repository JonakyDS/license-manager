"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CopyButtonProps {
  value: string;
  label?: string;
  showLabel?: boolean;
}

export function CopyButton({
  value,
  label = "Copy",
  showLabel = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (showLabel) {
    return (
      <Button variant="outline" size="sm" onClick={handleCopy}>
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" />
            {label}
          </>
        )}
      </Button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className="hover:bg-muted inline-flex h-6 w-6 items-center justify-center rounded"
      title={label}
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="text-muted-foreground h-3 w-3" />
      )}
    </button>
  );
}
