"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { createUser, updateUser } from "@/lib/actions/users";
import { USER_ROLES } from "@/lib/constants/admin";
import type { UserTableData } from "@/lib/types/admin";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserTableData | null;
  onSuccess?: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const formRef = React.useRef<HTMLFormElement>(null);

  const isEditing = Boolean(user);

  // Reset form when dialog opens/closes or user changes
  React.useEffect(() => {
    if (open) {
      setErrors({});
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);

    try {
      const result = isEditing
        ? await updateUser(formData)
        : await createUser(formData);

      if (result.success) {
        toast.success(result.message);
        onSuccess?.();
        onOpenChange(false);
      } else {
        if (result.errors) {
          setErrors(result.errors);
        }
        toast.error(result.message || "An error occurred");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit} ref={formRef}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit User" : "Create User"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the user's information below."
                : "Fill in the details to create a new user."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            {/* Hidden ID field for editing */}
            {isEditing && <input type="hidden" name="id" value={user?.id} />}

            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                defaultValue={user?.name || ""}
                aria-invalid={!!errors.name}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name[0]}</p>
              )}
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                defaultValue={user?.email || ""}
                aria-invalid={!!errors.email}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email[0]}</p>
              )}
            </div>

            {/* Role */}
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                name="role"
                defaultValue={user?.role || "user"}
                disabled={isLoading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-destructive text-sm">{errors.role[0]}</p>
              )}
            </div>

            {/* Email Verified (only for editing) */}
            {isEditing && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="emailVerified" className="text-base">
                    Email Verified
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Mark the user&apos;s email as verified
                  </p>
                </div>
                <Switch
                  id="emailVerified"
                  name="emailVerified"
                  value="true"
                  defaultChecked={user?.emailVerified}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 size-4" />}
              {isEditing ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
