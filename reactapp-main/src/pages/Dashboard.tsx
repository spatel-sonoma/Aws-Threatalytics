import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";

const Dashboard = () => {
  const [selectedAnalysis, setSelectedAnalysis] = useState("analyze");
  const [messages, setMessages] = useState<Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>>([]);

  const handleNewAnalysis = () => {
    setMessages([]); // Clear existing messages
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        selectedAnalysis={selectedAnalysis}
        onSelectAnalysis={setSelectedAnalysis}
        onNewAnalysis={handleNewAnalysis}
      />
      <main className="flex-1 overflow-hidden">
        <ChatInterface 
          analysisType={selectedAnalysis}
          onModeSelect={setSelectedAnalysis}
          messages={messages}
          setMessages={setMessages}
        />
      </main>
    </div>
  );
};

export default Dashboard;
