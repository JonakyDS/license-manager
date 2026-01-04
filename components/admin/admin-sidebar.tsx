"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboardIcon,
  UsersIcon,
  PackageIcon,
  KeyIcon,
  SettingsIcon,
  MenuIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
} from "lucide-react";
import type { NavItem, NavSection } from "@/lib/types/admin";

const navSections: NavSection[] = [
  {
    items: [
      {
        title: "Overview",
        href: "/admin",
        icon: LayoutDashboardIcon,
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Users",
        href: "/admin/users",
        icon: UsersIcon,
      },
      {
        title: "Products",
        href: "/admin/products",
        icon: PackageIcon,
      },
      {
        title: "Licenses",
        href: "/admin/licenses",
        icon: KeyIcon,
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        title: "Settings",
        href: "/admin/settings",
        icon: SettingsIcon,
      },
    ],
  },
];

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "bg-card hidden flex-col border-r transition-all duration-300 lg:flex",
          collapsed ? "w-[68px]" : "w-[260px]",
          className
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-16 items-center border-b px-4",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed && (
            <Link
              href="/admin"
              className="flex items-center gap-2 font-semibold"
            >
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <LayoutDashboardIcon className="size-4" />
              </div>
              <span>Admin Panel</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(collapsed && "mx-auto")}
          >
            {collapsed ? (
              <ChevronRightIcon className="size-4" />
            ) : (
              <ChevronLeftIcon className="size-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-6 px-3">
            {navSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="flex flex-col gap-1">
                {section.title && !collapsed && (
                  <h4 className="text-muted-foreground mb-1 px-2 text-xs font-semibold tracking-wider uppercase">
                    {section.title}
                  </h4>
                )}
                {section.items.map((item) => (
                  <NavItemComponent
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full" asChild>
                  <Link href="/">
                    <HomeIcon className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Back to Site</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">
                <HomeIcon className="mr-2 size-4" />
                Back to Site
              </Link>
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}

function NavItemComponent({
  item,
  pathname,
  collapsed,
}: NavItemComponentProps) {
  const Icon = item.icon;
  const isActive = pathname === item.href;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            size="icon"
            className="w-full"
            asChild
          >
            <Link href={item.href}>
              <Icon className="size-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.title}
          {item.badge && (
            <span className="bg-primary text-primary-foreground ml-2 rounded px-1.5 py-0.5 text-xs">
              {item.badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={cn("w-full justify-start", isActive && "bg-secondary")}
      asChild
    >
      <Link href={item.href}>
        <Icon className="mr-2 size-4" />
        <span className="flex-1 text-left">{item.title}</span>
        {item.badge && (
          <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-xs">
            {item.badge}
          </span>
        )}
      </Link>
    </Button>
  );
}

// Mobile Sidebar
export function AdminMobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <MenuIcon className="size-5" />
          <span className="sr-only">Toggle navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        {/* Header */}
        <div className="flex h-16 items-center border-b px-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-semibold"
            onClick={() => setOpen(false)}
          >
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <LayoutDashboardIcon className="size-4" />
            </div>
            <span>Admin Panel</span>
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-6 px-3">
            {navSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="flex flex-col gap-1">
                {section.title && (
                  <h4 className="text-muted-foreground mb-1 px-2 text-xs font-semibold tracking-wider uppercase">
                    {section.title}
                  </h4>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        isActive && "bg-secondary"
                      )}
                      asChild
                    >
                      <Link href={item.href} onClick={() => setOpen(false)}>
                        <Icon className="mr-2 size-4" />
                        <span className="flex-1 text-left">{item.title}</span>
                        {item.badge && (
                          <span className="bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-xs">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="bg-card absolute right-0 bottom-0 left-0 border-t p-3">
          <Button
            variant="outline"
            className="w-full"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link href="/">
              <HomeIcon className="mr-2 size-4" />
              Back to Site
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
