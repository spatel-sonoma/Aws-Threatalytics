import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { conversationsService, Conversation } from "@/lib/conversations-service";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquare, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Swal from 'sweetalert2';

const History = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await conversationsService.listConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      
      // Show error with Swal
      Swal.fire({
        title: 'Failed to Load',
        text: 'Unable to load conversation history. Please try refreshing the page.',
        icon: 'error',
        confirmButtonColor: '#f97316',
        background: '#1a1a1a',
        color: '#fff',
        customClass: {
          popup: 'border border-gray-800',
          confirmButton: 'font-semibold'
        }
      });
      
      // If authentication fails, redirect to login
      if (error instanceof Error && error.message.includes('401')) {
        navigate('/auth');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const result = await Swal.fire({
      title: 'Delete Conversation?',
      text: "This action cannot be undone. Are you sure you want to delete this conversation?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f97316',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      background: '#1a1a1a',
      color: '#fff',
      customClass: {
        popup: 'border border-gray-800',
        confirmButton: 'font-semibold',
        cancelButton: 'font-semibold'
      }
    });

    if (!result.isConfirmed) return;
    
    const success = await conversationsService.deleteConversation(conversationId);
    if (success) {
      setConversations(conversations.filter(c => c.conversation_id !== conversationId));
      if (selectedConversation?.conversation_id === conversationId) {
        setSelectedConversation(null);
      }
      
      // Success message
      Swal.fire({
        title: 'Deleted!',
        text: 'The conversation has been deleted.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: '#fff',
        customClass: {
          popup: 'border border-gray-800'
        }
      });
    } else {
      // Error message
      Swal.fire({
        title: 'Error',
        text: 'Failed to delete the conversation. Please try again.',
        icon: 'error',
        confirmButtonColor: '#f97316',
        background: '#1a1a1a',
        color: '#fff',
        customClass: {
          popup: 'border border-gray-800',
          confirmButton: 'font-semibold'
        }
      });
    }
  };

  const getModeIcon = (mode: string) => {
    const icons: Record<string, string> = {
      'analyze': '🔍',
      'redact': '🔒',
      'report': '📄',
      'drill': '🎯'
    };
    return icons[mode] || '💬';
  };

  const getModeColor = (mode: string) => {
    const colors: Record<string, string> = {
      'analyze': 'text-blue-500',
      'redact': 'text-green-500',
      'report': 'text-purple-500',
      'drill': 'text-orange-500'
    };
    return colors[mode] || 'text-gray-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Conversations List */}
      <div className="w-96 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Previous Analysis</h1>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading conversations...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start a new analysis to see it here
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.conversation_id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={cn(
                    "p-4 rounded-lg cursor-pointer transition-all group",
                    "hover:bg-muted",
                    selectedConversation?.conversation_id === conversation.conversation_id
                      ? "bg-muted border border-border"
                      : "border border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{getModeIcon(conversation.mode)}</span>
                        <span className={cn("text-xs font-medium uppercase", getModeColor(conversation.mode))}>
                          {conversation.mode}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate mb-1">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(conversation.updated_at)} • {conversation.messages.length} messages
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(conversation.conversation_id, e)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation Detail */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Detail Header */}
            <div className="border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-xl">{getModeIcon(selectedConversation.mode)}</span>
                </div>
                <div>
                  <h2 className="font-semibold">{selectedConversation.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedConversation.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {selectedConversation.messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 max-w-[75%]",
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm'
                          : 'bg-[#1a1a1a] border border-[#2d2d2d] text-gray-100 rounded-tl-sm'
                      )}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <div className="border-t border-border p-4">
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                Continue this conversation
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
