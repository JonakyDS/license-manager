/**
 * DetailRow - A reusable component for displaying labeled information with an icon.
 *
 * Use this component for:
 * - Displaying key-value pairs in view dialogs
 * - Showing information with visual icon indicators
 * - Creating consistent information layouts
 *
 * @example
 * <DetailRow
 *   icon={<UserIcon className="size-4" />}
 *   label="Name"
 *   value={user.name}
 * />
 *
 * // With badge as value
 * <DetailRow
 *   icon={<ShieldIcon className="size-4" />}
 *   label="Role"
 *   value={<Badge variant="default">{user.role}</Badge>}
 * />
 */

import * as React from "react";

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

export function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
