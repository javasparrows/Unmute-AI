import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>プロフィール</CardTitle>
        <CardDescription>アカウント情報の確認と編集</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">準備中です</p>
      </CardContent>
    </Card>
  );
}
