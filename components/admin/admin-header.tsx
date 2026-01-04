"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AdminMobileSidebar } from "./admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BellIcon, UserIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";

interface AdminHeaderProps {
  className?: string;
}

export function AdminHeader({ className }: AdminHeaderProps) {
  return (
    <header
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/60 flex h-16 shrink-0 items-center gap-4 border-b px-4 backdrop-blur lg:px-6",
        className
      )}
    >
      {/* Mobile sidebar trigger */}
      <AdminMobileSidebar />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <BellIcon className="size-5" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src="" alt="User" />
                <AvatarFallback>
                  <UserIcon className="size-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm leading-none font-medium">Admin</p>
                <p className="text-muted-foreground text-xs leading-none">
                  admin@example.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <SettingsIcon className="mr-2 size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/sign-out-button">
                <LogOutIcon className="mr-2 size-4" />
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
