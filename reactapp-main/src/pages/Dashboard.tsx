import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";
import UpgradeModal from "@/components/UpgradeModal";
import { Conversation } from "@/lib/conversations-service";
import { useUsageTracking } from "@/hooks/use-usage";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { subscriptionService } from "@/lib/subscription-service";
import Swal from "sweetalert2";

const Dashboard = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [selectedAnalysis, setSelectedAnalysis] = useState("analyze");
  const [messages, setMessages] = useState<Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { usage, checkUsageBeforeRequest, trackApiUsage, refreshUsage } = useUsageTracking();

  // Handle payment success verification
  useEffect(() => {
    const session_id = searchParams.get('session_id');
    const plan = searchParams.get('plan');
    const user_id = searchParams.get('user_id');
    
    if (session_id && plan && user_id) {
      console.log('Payment success detected, verifying...', { session_id, plan });
      
      subscriptionService.verifyPayment(session_id, plan)
        .then(() => {
          Swal.fire({
            title: 'Payment Successful!',
            text: `Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan is now active.`,
            icon: 'success',
            confirmButtonColor: '#f97316',
            background: '#1a1a1a',
            color: '#fff'
          });
          
          // Refresh usage to show new limits
          refreshUsage();
          
          // Clear query params
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((error) => {
          console.error('Payment verification failed:', error);
          Swal.fire({
            title: 'Verification Issue',
            text: 'Payment received but verification pending. Please refresh or contact support.',
            icon: 'warning',
            confirmButtonColor: '#f97316',
            background: '#1a1a1a',
            color: '#fff'
          });
        });
    }
  }, [searchParams, refreshUsage]);

  // Handle resuming conversation from History
  useEffect(() => {
    if (location.state) {
      const { conversation, resumeMode } = location.state as { 
        conversation?: Conversation; 
        resumeMode?: string 
      };
      
      if (conversation && resumeMode) {
        console.log('Resuming conversation:', conversation.conversation_id);
        setSelectedAnalysis(resumeMode);
        setMessages(conversation.messages);
        setCurrentConversationId(conversation.conversation_id);
        
        // Clear the location state to prevent re-loading on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location]);

  // Listen for upgrade modal event
  useEffect(() => {
    const handleOpenUpgrade = () => setShowUpgradeModal(true);
    window.addEventListener('open-upgrade-modal', handleOpenUpgrade);
    return () => window.removeEventListener('open-upgrade-modal', handleOpenUpgrade);
  }, []);

  const handleNewAnalysis = () => {
    setMessages([]); // Clear existing messages
    setCurrentConversationId(null);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        selectedAnalysis={selectedAnalysis}
        onSelectAnalysis={setSelectedAnalysis}
        onNewAnalysis={handleNewAnalysis}
        onUpgradeClick={() => setShowUpgradeModal(true)}
        usage={usage}
      />
      <main className="flex-1 overflow-hidden relative">
        {/* Floating Upgrade Button */}
        <Button
          onClick={() => setShowUpgradeModal(true)}
          className="absolute top-4 right-4 z-50 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <Zap className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Upgrade Plan</span>
          <span className="sm:hidden">Upgrade</span>
        </Button>
        
        <ChatInterface 
          analysisType={selectedAnalysis}
          onModeSelect={setSelectedAnalysis}
          messages={messages}
          setMessages={setMessages}
          conversationId={currentConversationId}
          onConversationIdChange={setCurrentConversationId}
          checkUsageBeforeRequest={checkUsageBeforeRequest}
          trackApiUsage={trackApiUsage}
        />
      </main>
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          refreshUsage();
        }}
        currentPlan={usage?.plan}
        usage={usage || undefined}
      />
    </div>
  );
};

export default Dashboard;
