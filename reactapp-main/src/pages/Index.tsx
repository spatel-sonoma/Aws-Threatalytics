import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-8">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-16 h-16 text-primary-foreground" />
          </div>
        </div>
        <div>
          <h1 className="mb-4 text-5xl font-bold text-foreground">Threatalytics AI</h1>
          <p className="text-xl text-muted-foreground">Advanced Security Analytics Platform</p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate("/auth")} size="lg">
            Get Started
          </Button>
          <Button onClick={() => navigate("/dashboard")} variant="outline" size="lg">
            View Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
