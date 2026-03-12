import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PreferencesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>翻訳設定</CardTitle>
        <CardDescription>デフォルトの翻訳設定を変更</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">準備中です</p>
      </CardContent>
    </Card>
  );
}
