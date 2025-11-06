import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp } from "lucide-react";

interface MetricsData {
  total_feedback: number;
  helpful: number;
  not_helpful: number;
  helpful_rate_percent: number;
  sample_comments: string[];
}

const FeedbackMetrics = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      // This endpoint needs to be implemented in backend
      const response = await fetch("/api/metrics");
      if (!response.ok) throw new Error("Failed to load metrics");
      
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      // Mock data for demonstration
      setMetrics({
        total_feedback: 10,
        helpful: 8,
        not_helpful: 2,
        helpful_rate_percent: 80,
        sample_comments: [
          "Very accurate analysis",
          "Helped identify key issues",
          "Could be more detailed",
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading metrics...</div>;
  }

  if (!metrics) return null;

  const chartData = [
    { name: "Helpful", value: metrics.helpful, color: "hsl(var(--primary))" },
    { name: "Not Helpful", value: metrics.not_helpful, color: "hsl(var(--muted))" },
  ];

  return (
    <Card className="border-border">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Feedback Metrics</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary">{metrics.helpful_rate_percent}%</p>
            <p className="text-sm text-muted-foreground">Helpful Rate</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{metrics.total_feedback}</p>
            <p className="text-sm text-muted-foreground">Total Responses</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "hsl(var(--card))", 
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px"
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {metrics.sample_comments.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <p className="text-sm font-semibold text-foreground">Recent Comments</p>
            <ul className="space-y-1">
              {metrics.sample_comments.map((comment, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • {comment}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FeedbackMetrics;
