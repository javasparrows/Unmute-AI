"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Shield,
  CreditCard,
  Trash2,
  RotateCcw,
} from "lucide-react";

// --- Types ---

interface UsersClientProps {
  currentUserId: string;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  planOverride: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  totalDocuments: number;
  totalTokens: number;
  deletedAt: string | null;
}

interface UsersData {
  users: UserRow[];
  total: number;
}

type SortKey =
  | "name"
  | "plan"
  | "role"
  | "createdAt"
  | "lastActiveAt"
  | "totalDocuments"
  | "totalTokens";
type SortDirection = "asc" | "desc";
type StatusFilter = "active" | "deleted" | "all";

// --- Helpers ---

/**
 * Mask email for privacy: show first 3 chars + ***@domain
 */
function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return "***";
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const visible = local.slice(0, 3);
  return `${visible}***${domain}`;
}

/**
 * Format ISO date string to JST datetime (YYYY/MM/DD HH:mm).
 */
function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format ISO date string to short format (YYYY/MM/DD).
 */
function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/**
 * Format a relative time string (e.g., "2 hours ago", "3 days ago").
 */
function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(isoDate);
}

const PLAN_ORDER: Record<string, number> = { FREE: 0, PRO: 1, MAX: 2 };
const ROLE_ORDER: Record<string, number> = { USER: 0, ADMIN: 1 };

// --- Component ---

export function UsersClient({ currentUserId }: UsersClientProps) {
  const [data, setData] = useState<UsersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dialog state
  const [roleDialogUser, setRoleDialogUser] = useState<UserRow | null>(null);
  const [deleteDialogUser, setDeleteDialogUser] = useState<UserRow | null>(
    null
  );
  const [restoreDialogUser, setRestoreDialogUser] = useState<UserRow | null>(
    null
  );

  // --- Data fetching ---

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/admin/users?status=${statusFilter}`);
      if (!res.ok) {
        setError(`Failed to load data (${res.status})`);
        return;
      }
      const json: UsersData = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- API handlers ---

  async function handleRoleChange(userId: string, newRole: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/v2/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const responseData = await res.json();
        toast.error(responseData.error || "Failed to change role");
        return;
      }
      toast.success("Role updated successfully");
      await fetchUsers();
    } catch {
      toast.error("Failed to change role");
    } finally {
      setActionLoading(null);
      setRoleDialogUser(null);
    }
  }

  async function handlePlanOverride(userId: string, plan: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/v2/admin/users/${userId}/plan-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planOverride: plan }),
      });
      if (!res.ok) {
        const responseData = await res.json();
        toast.error(responseData.error || "Failed to set plan override");
        return;
      }
      toast.success(`Plan override set to ${plan}`);
      await fetchUsers();
    } catch {
      toast.error("Failed to set plan override");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleClearPlanOverride(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/v2/admin/users/${userId}/plan-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planOverride: null }),
      });
      if (!res.ok) {
        const responseData = await res.json();
        toast.error(responseData.error || "Failed to clear plan override");
        return;
      }
      toast.success("Plan override cleared");
      await fetchUsers();
    } catch {
      toast.error("Failed to clear plan override");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSoftDelete(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/v2/admin/users/${userId}/soft-delete`, {
        method: "POST",
      });
      if (!res.ok) {
        const responseData = await res.json();
        toast.error(responseData.error || "Failed to delete user");
        return;
      }
      toast.success("User deleted successfully");
      await fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setActionLoading(null);
      setDeleteDialogUser(null);
    }
  }

  async function handleRestore(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/v2/admin/users/${userId}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const responseData = await res.json();
        toast.error(responseData.error || "Failed to restore user");
        return;
      }
      toast.success("User restored successfully");
      await fetchUsers();
    } catch {
      toast.error("Failed to restore user");
    } finally {
      setActionLoading(null);
      setRestoreDialogUser(null);
    }
  }

  // --- Filtering and sorting ---

  const filteredAndSorted = useMemo(() => {
    if (!data) return [];

    // Filter by search query
    const query = search.toLowerCase().trim();
    let filtered = data.users;
    if (query) {
      filtered = data.users.filter((user) => {
        const name = (user.name ?? "").toLowerCase();
        const email = user.email.toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;

      switch (sortKey) {
        case "name": {
          const aName = (a.name ?? "").toLowerCase();
          const bName = (b.name ?? "").toLowerCase();
          cmp = aName.localeCompare(bName);
          break;
        }
        case "plan": {
          const aRank = PLAN_ORDER[a.plan] ?? -1;
          const bRank = PLAN_ORDER[b.plan] ?? -1;
          cmp = aRank - bRank;
          break;
        }
        case "role": {
          const aRank = ROLE_ORDER[a.role] ?? -1;
          const bRank = ROLE_ORDER[b.role] ?? -1;
          cmp = aRank - bRank;
          break;
        }
        case "createdAt": {
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        }
        case "lastActiveAt": {
          const aTime = a.lastActiveAt
            ? new Date(a.lastActiveAt).getTime()
            : 0;
          const bTime = b.lastActiveAt
            ? new Date(b.lastActiveAt).getTime()
            : 0;
          cmp = aTime - bTime;
          break;
        }
        case "totalDocuments": {
          cmp = a.totalDocuments - b.totalDocuments;
          break;
        }
        case "totalTokens": {
          cmp = a.totalTokens - b.totalTokens;
          break;
        }
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [data, search, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortHeader({
    label,
    column,
    className,
  }: {
    label: string;
    column: SortKey;
    className?: string;
  }) {
    const isActive = sortKey === column;
    const arrow = isActive ? (sortDir === "asc" ? " \u2191" : " \u2193") : "";
    return (
      <th
        className={`cursor-pointer select-none pb-2 pr-4 font-medium hover:text-foreground ${className ?? ""}`}
        onClick={() => handleSort(column)}
      >
        {label}
        {arrow}
      </th>
    );
  }

  // --- Dialog helpers ---

  function openRoleDialog(user: UserRow) {
    setRoleDialogUser(user);
  }

  function openDeleteDialog(user: UserRow) {
    setDeleteDialogUser(user);
  }

  function openRestoreDialog(user: UserRow) {
    setRestoreDialogUser(user);
  }

  // --- Render ---

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header with count, status filter, and search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {filteredAndSorted.length === data.total
              ? `${data.total} users`
              : `${filteredAndSorted.length} of ${data.total} users`}
          </p>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === "deleted" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("deleted")}
            >
              Deleted
            </Button>
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              All
            </Button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Search by name or email..."
          className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            All registered users and their activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {search ? "No users match your search" : "No users found"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <SortHeader label="Name" column="name" />
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <SortHeader label="Role" column="role" />
                    <SortHeader label="Plan" column="plan" />
                    <th className="hidden pb-2 pr-4 font-medium md:table-cell">
                      Status
                    </th>
                    <SortHeader
                      label="Docs"
                      column="totalDocuments"
                      className="hidden md:table-cell"
                    />
                    <SortHeader
                      label="Tokens"
                      column="totalTokens"
                      className="hidden md:table-cell"
                    />
                    <SortHeader label="Last Active" column="lastActiveAt" />
                    <SortHeader label="Signed Up" column="createdAt" />
                    <th className="pb-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map((user) => {
                    const isDeleted = !!user.deletedAt;
                    const isActionLoadingForUser = actionLoading === user.id;

                    return (
                      <tr
                        key={user.id}
                        className={cn(
                          "border-b last:border-0",
                          isDeleted && "opacity-50"
                        )}
                      >
                        {/* Name */}
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <span className="flex items-center gap-2">
                            {user.name ?? "\u2014"}
                            {isDeleted && (
                              <Badge variant="destructive">Deleted</Badge>
                            )}
                          </span>
                        </td>

                        {/* Email (masked) */}
                        <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">
                          {maskEmail(user.email)}
                        </td>

                        {/* Role */}
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <RoleBadge role={user.role} />
                        </td>

                        {/* Plan */}
                        <td className="py-2 pr-4 whitespace-nowrap">
                          <PlanBadge
                            plan={user.plan}
                            hasOverride={user.planOverride !== null}
                          />
                        </td>

                        {/* Status */}
                        <td className="hidden py-2 pr-4 whitespace-nowrap md:table-cell">
                          <StatusBadge status={user.subscriptionStatus} />
                        </td>

                        {/* Documents */}
                        <td className="hidden py-2 pr-4 whitespace-nowrap md:table-cell">
                          {user.totalDocuments.toLocaleString()}
                        </td>

                        {/* Tokens */}
                        <td className="hidden py-2 pr-4 whitespace-nowrap md:table-cell">
                          {user.totalTokens.toLocaleString()}
                        </td>

                        {/* Last Active (JST) */}
                        <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                          {user.lastActiveAt
                            ? formatDateTime(user.lastActiveAt)
                            : "\u2014"}
                        </td>

                        {/* Signed Up (JST) */}
                        <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                          {formatDateTime(user.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-2 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isActionLoadingForUser}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {/* Role toggle */}
                              <DropdownMenuItem
                                disabled={
                                  user.id === currentUserId || isDeleted
                                }
                                onClick={() => openRoleDialog(user)}
                              >
                                <Shield className="mr-2 h-4 w-4" />
                                {user.role === "ADMIN"
                                  ? "Demote to User"
                                  : "Promote to Admin"}
                              </DropdownMenuItem>
                              {/* Plan override submenu */}
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger disabled={isDeleted}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Plan Override
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handlePlanOverride(user.id, "FREE")
                                    }
                                  >
                                    FREE
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handlePlanOverride(user.id, "PRO")
                                    }
                                  >
                                    PRO
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handlePlanOverride(user.id, "MAX")
                                    }
                                  >
                                    MAX
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleClearPlanOverride(user.id)
                                    }
                                    disabled={!user.planOverride}
                                  >
                                    Clear Override
                                  </DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              {/* Delete / Restore */}
                              {isDeleted ? (
                                <DropdownMenuItem
                                  onClick={() => openRestoreDialog(user)}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Restore User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={user.id === currentUserId}
                                  onClick={() => openDeleteDialog(user)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role change confirmation dialog */}
      <AlertDialog
        open={!!roleDialogUser}
        onOpenChange={(open) => {
          if (!open) setRoleDialogUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Role</AlertDialogTitle>
            <AlertDialogDescription>
              Change {roleDialogUser?.name || roleDialogUser?.email} from{" "}
              {roleDialogUser?.role} to{" "}
              {roleDialogUser?.role === "ADMIN" ? "USER" : "ADMIN"}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (roleDialogUser) {
                  const newRole =
                    roleDialogUser.role === "ADMIN" ? "USER" : "ADMIN";
                  handleRoleChange(roleDialogUser.id, newRole);
                }
              }}
            >
              Change Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteDialogUser}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              {deleteDialogUser?.name || deleteDialogUser?.email}? This will
              cancel their Stripe subscription and invalidate all sessions. The
              user can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteDialogUser) {
                  handleSoftDelete(deleteDialogUser.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore confirmation dialog */}
      <AlertDialog
        open={!!restoreDialogUser}
        onOpenChange={(open) => {
          if (!open) setRestoreDialogUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore User</AlertDialogTitle>
            <AlertDialogDescription>
              Restore {restoreDialogUser?.name || restoreDialogUser?.email}? The
              user will return as a FREE plan user. Any previous subscription
              will not be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoreDialogUser) {
                  handleRestore(restoreDialogUser.id);
                }
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Sub-components ---

function RoleBadge({ role }: { role: string }) {
  if (role === "ADMIN") {
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        ADMIN
      </Badge>
    );
  }
  return <Badge variant="secondary">USER</Badge>;
}

function PlanBadge({
  plan,
  hasOverride,
}: {
  plan: string;
  hasOverride: boolean;
}) {
  const suffix = hasOverride ? " (override)" : "";

  switch (plan) {
    case "PRO":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          PRO{suffix}
        </Badge>
      );
    case "MAX":
      return (
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          MAX{suffix}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          FREE{suffix}
        </Badge>
      );
  }
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-muted-foreground">{"\u2014"}</span>;
  }

  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          active
        </Badge>
      );
    case "past_due":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          past_due
        </Badge>
      );
    case "canceled":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          canceled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
