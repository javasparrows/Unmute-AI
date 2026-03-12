import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getPlanInfo } from "@/lib/plans";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      plan: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  const planInfo = getPlanInfo(user.plan);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
          <CardDescription>アカウント情報</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name ?? ""}
                className="h-16 w-16 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-medium">
                {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-medium">{user.name ?? "未設定"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">プラン</p>
              <div className="mt-1">
                <Badge variant={user.plan === "FREE" ? "outline" : "default"}>
                  {planInfo.name}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">登録日</p>
              <p className="text-sm mt-1">
                {user.createdAt.toLocaleDateString("ja-JP")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
