"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// --- Types ---

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
 * Format ISO date string to readable format (YYYY/MM/DD HH:mm).
 */
function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${h}:${min}`;
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

export function UsersClient() {
  const [data, setData] = useState<UsersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) {
          setError(`Failed to load data (${res.status})`);
          return;
        }
        const json: UsersData = await res.json();
        setData(json);
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
      {/* Header with count and search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAndSorted.length === data.total
            ? `${data.total} users`
            : `${filteredAndSorted.length} of ${data.total} users`}
        </p>
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
          <CardDescription>All registered users and their activity</CardDescription>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      {/* Name */}
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {user.name ?? "\u2014"}
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

                      {/* Last Active */}
                      <td
                        className="py-2 pr-4 whitespace-nowrap text-muted-foreground"
                        title={
                          user.lastActiveAt
                            ? formatDateTime(user.lastActiveAt)
                            : undefined
                        }
                      >
                        {user.lastActiveAt
                          ? formatRelativeTime(user.lastActiveAt)
                          : "\u2014"}
                      </td>

                      {/* Signed Up */}
                      <td className="py-2 whitespace-nowrap text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
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
