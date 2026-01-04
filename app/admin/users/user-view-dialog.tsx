"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ViewDialog, DetailRow } from "@/components/admin";
import type { UserTableData } from "@/lib/types/admin";
import {
  UserIcon,
  MailIcon,
  ShieldIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";

interface UserViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserTableData | null;
}

export function UserViewDialog({
  open,
  onOpenChange,
  user,
}: UserViewDialogProps) {
  if (!user) return null;

  return (
    <ViewDialog
      open={open}
      onOpenChange={onOpenChange}
      title="User Details"
      maxWidth="sm"
    >
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={user.image || ""} alt={user.name} />
            <AvatarFallback className="text-lg">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h3 className="text-xl font-semibold">{user.name}</h3>
            <p className="text-muted-foreground text-sm">{user.email}</p>
            <div className="flex gap-2">
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {user.role}
              </Badge>
              <Badge variant={user.emailVerified ? "default" : "outline"}>
                {user.emailVerified ? "Verified" : "Unverified"}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Details */}
        <div className="grid gap-4">
          <DetailRow
            icon={<UserIcon className="size-4" />}
            label="Name"
            value={user.name}
          />
          <DetailRow
            icon={<MailIcon className="size-4" />}
            label="Email"
            value={user.email}
          />
          <DetailRow
            icon={<ShieldIcon className="size-4" />}
            label="Role"
            value={
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {user.role}
              </Badge>
            }
          />
          <DetailRow
            icon={
              user.emailVerified ? (
                <CheckCircleIcon className="size-4 text-green-600" />
              ) : (
                <XCircleIcon className="text-muted-foreground size-4" />
              )
            }
            label="Email Status"
            value={user.emailVerified ? "Verified" : "Not Verified"}
          />
          <DetailRow
            icon={<CalendarIcon className="size-4" />}
            label="Created"
            value={format(new Date(user.createdAt), "MMMM d, yyyy 'at' h:mm a")}
          />
          <DetailRow
            icon={<CalendarIcon className="size-4" />}
            label="Last Updated"
            value={format(new Date(user.updatedAt), "MMMM d, yyyy 'at' h:mm a")}
          />
        </div>
      </div>
    </ViewDialog>
  );
}
