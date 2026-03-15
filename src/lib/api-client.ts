import { hc } from "hono/client";
import type { AppType } from "@/app/api/v2/[[...route]]/route";

/**
 * Type-safe API client for Hono routes.
 * Usage:
 *   const res = await apiClient.evidence.mappings.$get({ query: { documentId: "xxx" } });
 *   const data = await res.json();
 */
export const apiClient = hc<AppType>("/");
