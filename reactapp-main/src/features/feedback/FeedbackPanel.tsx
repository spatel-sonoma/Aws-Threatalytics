import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FeedbackPanelProps {
  question: string;
  answer: string;
  onFeedbackSubmitted?: () => void;
}

const FeedbackPanel = ({ question, answer, onFeedbackSubmitted }: FeedbackPanelProps) => {
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const submitFeedback = async () => {
    if (helpful === null) {
      toast({
        title: "Please rate the response",
        description: "Let us know if this was helpful or not.",
        variant: "destructive",
      });
      return;
    }

    try {
      // This endpoint needs to be implemented in backend
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          helpful,
          comments,
          timestamp: new Date().toISOString(),
        }),
      });

      setSubmitted(true);
      toast({
        title: "Thank you!",
        description: "Your feedback helps us improve.",
      });
      
      onFeedbackSubmitted?.();
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Could not submit feedback. Backend services required.",
        variant: "destructive",
      });
    }
  };

  if (submitted) {
    return (
      <Card className="border-border">
        <CardContent className="p-4">
          <p className="text-sm text-green-600 font-medium">✅ Feedback received. Thank you!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Was this response helpful?</h3>
        
        <div className="flex gap-3">
          <Button
            variant={helpful === true ? "default" : "outline"}
            size="sm"
            onClick={() => setHelpful(true)}
            className="gap-2"
          >
            <ThumbsUp className="w-4 h-4" />
            Yes
          </Button>
          <Button
            variant={helpful === false ? "default" : "outline"}
            size="sm"
            onClick={() => setHelpful(false)}
            className="gap-2"
          >
            <ThumbsDown className="w-4 h-4" />
            No
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Additional comments (optional)</label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Tell us more about your experience..."
            className="min-h-[80px]"
          />
        </div>

        <Button onClick={submitFeedback} className="w-full">
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
};

export default FeedbackPanel;
