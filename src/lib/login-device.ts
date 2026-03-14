import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";
import { sendLoginNotification } from "@/lib/email";

/**
 * Handle login device detection and notification.
 *
 * Logic:
 * - First ever login (no devices registered): register device, no notification.
 * - Known device: update lastSeenAt, no notification.
 * - New device (user has other devices): register device AND send notification.
 *
 * This function should never throw -- errors are caught and logged.
 */
export async function handleLoginDevice(params: {
  userId: string;
  email: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<void> {
  const { userId, email, ip, userAgent } = params;

  // Create device fingerprint hash from IP + user-agent
  const raw = `${ip ?? "unknown"}|${userAgent ?? "unknown"}`;
  const deviceHash = createHash("sha256").update(raw).digest("hex");

  // Check if the user has any devices registered at all
  const deviceCount = await prisma.loginDevice.count({
    where: { userId },
  });

  if (deviceCount === 0) {
    // First ever login -- just register, don't notify
    await prisma.loginDevice.create({
      data: { userId, deviceHash, userAgent, ip },
    });
    return;
  }

  // Check if THIS specific device is already known
  const existing = await prisma.loginDevice.findUnique({
    where: { userId_deviceHash: { userId, deviceHash } },
  });

  if (existing) {
    // Known device -- just update lastSeenAt, no notification
    await prisma.loginDevice.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date() },
    });
    return;
  }

  // New device on an existing account -- register and notify
  await prisma.loginDevice.create({
    data: { userId, deviceHash, userAgent, ip },
  });

  // Send notification email (fire-and-forget)
  sendLoginNotification({
    to: email,
    ip,
    userAgent,
    loginTime: new Date(),
  }).catch((err: unknown) => {
    console.error("Failed to send login notification:", err);
  });
}
