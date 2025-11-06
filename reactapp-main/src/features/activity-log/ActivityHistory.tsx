import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileDown, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActivityEntry {
  id: string;
  client_id: string;
  case_name: string;
  timestamp: string;
  mode: string;
  question: string;
  answer: string;
  trs_score: number;
  tag: string;
  note: string;
  file_url: string;
}

const ActivityHistory = () => {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const clientId = localStorage.getItem("client_id") || "demo-client";
      
      // This endpoint needs to be implemented in backend
      const response = await fetch(`/api/admin/activity?client_id=${clientId}`);
      if (!response.ok) throw new Error("Failed to load activities");
      
      const data = await response.json();
      setActivities(data);
      
      const initialNotes: Record<string, string> = {};
      data.forEach((item: ActivityEntry) => {
        initialNotes[item.id] = item.note || "";
      });
      setNotes(initialNotes);
    } catch (error) {
      toast({
        title: "Backend Required",
        description: "Activity log requires backend services. Enable Cloud to use this feature.",
        variant: "destructive",
      });
      // Mock data for demonstration
      setActivities([
        {
          id: "1",
          client_id: "demo",
          case_name: "CASE-001",
          timestamp: new Date().toISOString(),
          mode: "analyze",
          question: "What are the security vulnerabilities?",
          answer: "Sample analysis result...",
          trs_score: 3,
          tag: "Security",
          note: "",
          file_url: "",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async (activityId: string) => {
    try {
      // This endpoint needs to be implemented in backend
      await fetch("/api/admin/note/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activityId, note: notes[activityId] }),
      });
      
      toast({
        title: "Note Saved",
        description: "Your private note has been updated.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save note. Backend services required.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading activity history...</div>;
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground mb-6">Previous Analysis</h2>
      
      {activities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No previous activities found.</p>
            <p className="text-sm text-muted-foreground mt-2">Start analyzing to see your history here.</p>
          </CardContent>
        </Card>
      ) : (
        activities.map((activity) => (
          <Card key={activity.id} className="border-border">
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                  <p className="font-semibold text-foreground mt-1">
                    Case: {activity.case_name || "N/A"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-medium">
                    TRS: {activity.trs_score}
                  </span>
                  {activity.tag && (
                    <span className="px-3 py-1 bg-muted text-foreground rounded-full text-xs">
                      {activity.tag}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mode</p>
                  <p className="text-foreground capitalize">{activity.mode}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Question</p>
                  <p className="text-foreground">{activity.question}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Answer</p>
                  <p className="text-foreground whitespace-pre-wrap">{activity.answer}</p>
                </div>
              </div>

              {activity.file_url && (
                <Button variant="outline" size="sm" className="gap-2">
                  <FileDown className="w-4 h-4" />
                  Download Source File
                </Button>
              )}

              <div className="space-y-2 pt-4 border-t border-border">
                <label className="text-sm font-semibold text-foreground">Private Case Note</label>
                <Textarea
                  value={notes[activity.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [activity.id]: e.target.value })}
                  onBlur={() => updateNote(activity.id)}
                  placeholder="Enter private notes for this case..."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ActivityHistory;
