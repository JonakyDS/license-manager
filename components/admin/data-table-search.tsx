"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, XIcon } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface DataTableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export function DataTableSearch({
  value,
  onChange,
  placeholder = "Search...",
  className,
  debounceMs = 300,
}: DataTableSearchProps) {
  const [localValue, setLocalValue] = React.useState(value);
  const debouncedValue = useDebounce(localValue, debounceMs);

  React.useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, onChange, value]);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pr-9 pl-9"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
          onClick={handleClear}
        >
          <XIcon className="size-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}
