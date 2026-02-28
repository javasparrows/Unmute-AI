"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name ?? ""}
                className="h-7 w-7 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm hidden sm:inline">
              {user.name ?? user.email}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{user.email}</TooltipContent>
      </Tooltip>
      <form action="/api/auth/signout" method="POST">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" type="submit" className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>ログアウト</TooltipContent>
        </Tooltip>
      </form>
    </div>
  );
}
