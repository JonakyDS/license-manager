"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterIcon, XIcon } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
}

interface DataTableFiltersProps {
  filters: FilterConfig[];
  onFilterChange: (key: string, value: string) => void;
  onClearFilters?: () => void;
  className?: string;
}

export function DataTableFilters({
  filters,
  onFilterChange,
  onClearFilters,
  className,
}: DataTableFiltersProps) {
  const hasActiveFilters = filters.some(
    (filter) => filter.value && filter.value !== "all"
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="text-muted-foreground flex items-center gap-1">
        <FilterIcon className="size-4" />
        <span className="hidden text-sm sm:inline">Filters:</span>
      </div>
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={filter.value}
          onValueChange={(value) => onFilterChange(filter.key, value)}
        >
          <SelectTrigger className="h-8 w-[130px] sm:w-[150px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {hasActiveFilters && onClearFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-8 px-2"
        >
          <XIcon className="mr-1 size-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
