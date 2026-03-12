import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>利用分析</CardTitle>
        <CardDescription>モデル別の利用状況とコスト推移</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">準備中です</p>
      </CardContent>
    </Card>
  );
}
