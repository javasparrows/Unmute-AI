import { requireAdmin } from "@/lib/admin";
import { UsersClient } from "@/components/admin/users-client";

export default async function AdminUsersPage() {
  const session = await requireAdmin();
  return <UsersClient currentUserId={session.user.id} />;
}
