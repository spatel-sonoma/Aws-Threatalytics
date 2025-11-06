import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface RoadmapData {
  infrastructure: Array<{ task: string; status: string }>;
  client_dashboard: Array<{ feature: string; status: string }>;
  pilot: Array<{ task: string; status: string }>;
  launch: Array<{ task: string; status: string }>;
  database: {
    preferred_db: string;
    tables: string[];
  };
}

const AdminDashboard = () => {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadRoadmap();
  }, []);

  const loadRoadmap = async () => {
    try {
      // This endpoint needs to be implemented in backend
      const response = await fetch("/api/admin/roadmap");
      if (!response.ok) throw new Error("Failed to load roadmap");
      
      const data = await response.json();
      setRoadmap(data);
    } catch (error) {
      toast({
        title: "Backend Required",
        description: "Admin dashboard requires backend services.",
        variant: "destructive",
      });
      // Mock data
      setRoadmap({
        infrastructure: [
          { task: "Set up S3 bucket + CloudFront", status: "complete" },
          { task: "Provision API Gateway + Lambda", status: "complete" },
          { task: "Configure environment variables", status: "pending" },
        ],
        client_dashboard: [
          { feature: "Re-download source files", status: "complete" },
          { feature: "Save private case notes", status: "complete" },
        ],
        pilot: [
          { task: "Confirm FERPA/PII onboarding with schools", status: "pending" },
          { task: "Validate red flag logic with live data", status: "pending" },
        ],
        launch: [
          { task: "QA all endpoints", status: "pending" },
          { task: "Deploy final build to CloudFront", status: "pending" },
        ],
        database: {
          preferred_db: "DynamoDB",
          tables: ["activity_log", "clients", "cases", "feedback", "metrics"],
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (category: keyof Omit<RoadmapData, "database">, index: number, checked: boolean) => {
    try {
      // This endpoint needs to be implemented in backend
      await fetch("/api/admin/roadmap/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          index,
          status: checked ? "complete" : "pending",
        }),
      });

      setRoadmap((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        updated[category][index].status = checked ? "complete" : "pending";
        return updated;
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not update status. Backend services required.",
        variant: "destructive",
      });
    }
  };

  const exportRoadmap = () => {
    window.open("/api/admin/roadmap/export", "_blank");
  };

  const renderPhase = (
    title: string,
    items: Array<{ task?: string; feature?: string; status: string }>,
    category: keyof Omit<RoadmapData, "database">
  ) => (
    <Card className="border-border">
      <CardContent className="p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">{title}</h2>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-center space-x-3">
              <Checkbox
                checked={item.status === "complete"}
                onCheckedChange={(val) => updateStatus(category, i, val as boolean)}
              />
              <span className="text-foreground">{item.task || item.feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading roadmap...</div>;
  }

  if (!roadmap) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Launch Readiness Dashboard</h1>
            <p className="text-muted-foreground mt-2">Track deployment progress and milestones</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {renderPhase("1. Infrastructure Tasks", roadmap.infrastructure, "infrastructure")}
        {renderPhase("2. Client Dashboard Features", roadmap.client_dashboard, "client_dashboard")}
        {renderPhase("3. Pilot Checklist", roadmap.pilot, "pilot")}
        {renderPhase("4. Launch Prep", roadmap.launch, "launch")}

        <Card className="border-border">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">5. Database Plan</h2>
            <p className="text-foreground mb-3">
              <span className="font-semibold">Preferred:</span> {roadmap.database.preferred_db}
            </p>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Tables:</p>
              <ul className="grid grid-cols-2 gap-2">
                {roadmap.database.tables.map((table, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {table}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Button onClick={exportRoadmap} className="w-full gap-2">
          <Download className="w-4 h-4" />
          Export Roadmap (CSV)
        </Button>
      </div>
    </div>
  );
};

export default AdminDashboard;
