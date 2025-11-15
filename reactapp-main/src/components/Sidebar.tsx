import { PlusCircle, Search, Lock, FileText, Target, History, LogOut, Settings, FolderOpen, Rocket, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import UsageDisplay from "@/components/UsageDisplay";
import { useState } from "react";
import { UsageData } from "@/lib/usage-service";

interface SidebarProps {
  selectedAnalysis: string;
  onSelectAnalysis: (mode: string) => void;
  onNewAnalysis?: () => void;
  onUpgradeClick?: () => void;
  usage?: UsageData | null; // Add usage prop for real-time updates
}

const ANALYSIS_TYPES = [
  { id: 'analyze', name: 'Threat Analysis', icon: Search },
  { id: 'redact', name: 'PII Redaction', icon: Lock },
  { id: 'report', name: 'Generate Report', icon: FileText },
  { id: 'drill', name: 'Simulate Drill', icon: Target }
];

const Sidebar = ({ selectedAnalysis, onSelectAnalysis, onNewAnalysis, onUpgradeClick, usage }: SidebarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const handleNewAnalysisClick = () => {
    if (onNewAnalysis) {
      onNewAnalysis();
    }
  };

  const handleAnalysisTypeClick = (typeId: string) => {
    // Clear chat when switching to a different analysis type
    if (typeId !== selectedAnalysis && onNewAnalysis) {
      onNewAnalysis();
    }
    onSelectAnalysis(typeId);
  };

  const menuItems = [
    // { icon: History, label: "Previous Analysis", action: () => navigate("/history") },
    { icon: FolderOpen, label: "Case Dashboard", action: () => navigate("/client-dashboard") },
    { icon: Rocket, label: "Launch Readiness", action: () => navigate("/admin-launch") },
    { icon: Bot, label: "Policy Assistant", action: () => navigate("/assistant") },
    // { icon: Settings, label: "Admin Dashboard", action: () => navigate("/admin") },
  ];

  return (
    <div className="flex flex-col h-full w-[280px] bg-background border-r">
      {/* Header with New Analysis Button */}
      <div className="p-4 border-b">
        <Button 
          onClick={handleNewAnalysisClick}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          New Analysis
        </Button>
      </div>

      {/* Analysis Types Section */}
      <div className="flex-1 overflow-auto py-4">
        <div className="px-4 mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            ANALYSIS TYPES
          </h2>
        </div>
        <div className="space-y-1 px-2">
          {ANALYSIS_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => handleAnalysisTypeClick(type.id)}
                className={cn(
                  "flex items-center w-full px-4 py-2 text-sm font-medium rounded-md",
                  "transition-colors duration-150",
                  selectedAnalysis === type.id
                    ? "bg-orange-600 text-white"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {type.name}
              </button>
            );
          })}
        </div>

        {/* Menu Section */}
        <div className="mt-8">
          <div className="px-4 mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              MENU
            </h2>
          </div>
          <div className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="flex items-center w-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors duration-150"
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Conversations Section */}
        <div className="mt-8">
          <div className="px-4 mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              RECENT CONVERSATIONS
            </h2>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="flex items-center w-full px-6 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <History className="mr-3 h-5 w-5" />
            Previous Analysis
          </button>
        </div>
      </div>

      {/* Usage Display */}
      <div className="border-t p-4">
        <UsageDisplay 
          usage={usage}
          onUpgradeClick={onUpgradeClick}
          compact 
          showUpgradeButton={true}
        />
      </div>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.email || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.subscription?.plan || 'Free Plan'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
