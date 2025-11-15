import { useState, useRef, useEffect } from "react";
import { Send, Loader2, AlertCircle, Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { API_CONFIG, ENDPOINTS } from "@/config/api";
import { conversationsService } from "@/lib/conversations-service";
import Swal from 'sweetalert2';

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  image?: string; // base64 image data
  imageUrl?: string; // for displaying uploaded images
}

// Mode configurations
const modeConfig = {
  'analyze': {
    title: 'Threat Analysis',
    endpoint: '/analyze',
    icon: '🔍',
    placeholder: 'Describe the threat scenario or behavioral data you want to analyze...',
    suggestion: 'Analyze suspicious login attempts from multiple IP addresses with failed authentication patterns.'
  },
  'redact': {
    title: 'PII Redaction',
    endpoint: '/redact',
    icon: '🔒',
    placeholder: 'Enter text containing PII that needs to be redacted...',
    suggestion: 'Redact all PII from: John Smith contacted me at john.smith@email.com'
  },
  'report': {
    title: 'Generate Report',
    endpoint: '/generate-report',
    icon: '📄',
    placeholder: 'Provide incident data for report generation...',
    suggestion: 'Generate a comprehensive report on recent security incidents'
  },
  'drill': {
    title: 'Simulate Drill',
    endpoint: '/simulate-drill',
    icon: '🎯',
    placeholder: 'Describe the drill scenario you want to simulate...',
    suggestion: 'Simulate a ransomware attack drill scenario'
  }
};

interface ChatInterfaceProps {
  analysisType: string;
  onModeSelect?: (mode: string) => void;
  messages?: Message[];
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationId?: string | null;
  onConversationIdChange?: (id: string | null) => void;
  checkUsageBeforeRequest?: () => Promise<boolean>;
  trackApiUsage?: (endpoint: string) => Promise<void>;
}

const VAGUE_PHRASES = [
  "what should we do",
  "is this okay",
  "does this seem right",
  "safe",
  "is it good",
  "fix this",
  "improve",
];

const QUESTION_TEMPLATES: Record<string, string[]> = {
  analyze: [
    "Does this policy clearly define lockdown procedures?",
    "Are there any vague terms in this policy section?",
    "Is anything critical missing from the evacuation plan?",
  ],
  drill: [
    "What drill procedures are described in this section?",
    "Summarize any practice protocols mentioned here.",
  ],
  redact: [
    "Does this section lack enforcement mechanisms?",
    "Identify red flags or unclear phrases in this document.",
  ],
  trends: [
    "What patterns emerge from recent security incidents?",
    "Show trending threat types over the past quarter.",
  ],
};

const formatResponse = (text: string) => {
  // Escape HTML first
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Format headers
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Format bold and italic text
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Format code
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  text = text.replace(/```([\s\S]+?)```/g, '<pre>$1</pre>');
  
  // Format lists
  text = text.replace(/^[•\-*] (.+)$/gm, '<li>$1</li>');
  if (text.includes('<li>')) {
    text = text.replace(/(<li>[\s\S]+<\/li>)/g, '<ul>$1</ul>');
    text = text.replace(/<\/ul>\s*<ul>/g, '');
  }
  
  // Format threat badges
  text = text.replace(/\[HIGH CONCERN\]/gi, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">HIGH CONCERN</span>');
  text = text.replace(/\[MEDIUM CONCERN\]/gi, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">MEDIUM CONCERN</span>');
  text = text.replace(/\[LOW CONCERN\]/gi, '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">LOW CONCERN</span>');
  
  // Format special sections
  text = text.replace(/\*\*Observable Behaviors:\*\*/g, '<div class="rounded-lg border p-4 my-4"><div class="font-semibold text-orange-500 flex items-center gap-2">🔍 Observable Behaviors</div>');
  text = text.replace(/\*\*Threat Response Scoring \(TRS\):\*\*/g, '</div><div class="rounded-lg border p-4 my-4"><div class="font-semibold text-orange-500 flex items-center gap-2">📊 Threat Response Scoring (TRS)</div>');
  text = text.replace(/\*\*Next Steps:\*\*/g, '</div><div class="rounded-lg border p-4 my-4"><div class="font-semibold text-orange-500 flex items-center gap-2">✅ Next Steps</div>');
  text = text.replace(/\*\*Disclaimer:\*\*/g, '</div><div class="rounded-lg border p-4 my-4"><div class="font-semibold text-orange-500 flex items-center gap-2">⚠️ Disclaimer</div>');
  
  if (text.includes('<div class="rounded-lg border p-4 my-4">')) {
    text += '</div>';
  }
  
  // Format paragraphs
  text = text.replace(/\n\n/g, '</p><p>');
  text = '<p>' + text + '</p>';
  
  // Clean up
  text = text.replace(/<p>\s*<\/p>/g, '');
  text = text.replace(/<p>\s*<h/g, '<h');
  text = text.replace(/<\/h[123]>\s*<\/p>/g, '</h3>');
  text = text.replace(/<p>\s*<div/g, '<div');
  text = text.replace(/<\/div>\s*<\/p>/g, '</div>');
  
  return text;
};

const ChatInterface = ({ 
  analysisType, 
  onModeSelect = () => {}, 
  messages: externalMessages, 
  setMessages: setExternalMessages,
  conversationId: externalConversationId,
  onConversationIdChange,
  checkUsageBeforeRequest,
  trackApiUsage
}: ChatInterfaceProps) => {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(externalConversationId || null);
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ file: File; preview: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const messages = externalMessages || internalMessages;
  const setMessages = setExternalMessages || setInternalMessages;

  // Sync external conversation ID
  useEffect(() => {
    if (externalConversationId !== undefined) {
      setCurrentConversationId(externalConversationId);
    }
  }, [externalConversationId]);

  // Update parent when conversation ID changes
  useEffect(() => {
    if (onConversationIdChange && currentConversationId !== externalConversationId) {
      onConversationIdChange(currentConversationId);
    }
  }, [currentConversationId, onConversationIdChange, externalConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset conversation when messages are cleared
  useEffect(() => {
    if (messages.length === 0) {
      setCurrentConversationId(null);
      setInput("");
      setInputError(null);
      setUploadedImage(null);
    }
  }, [messages.length]);

  const detectVagueInput = (question: string): boolean => {
    const q = question.toLowerCase().trim();
    if (q.split(" ").length < 4) return true;
    return VAGUE_PHRASES.some((phrase) => q.includes(phrase));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        title: 'Invalid File',
        text: 'Please upload an image file (PNG, JPG, etc.)',
        icon: 'error',
        confirmButtonColor: '#f97316',
        background: '#1a1a1a',
        color: '#fff'
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire({
        title: 'File Too Large',
        text: 'Please upload an image smaller than 10MB',
        icon: 'error',
        confirmButtonColor: '#f97316',
        background: '#1a1a1a',
        color: '#fff'
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      setUploadedImage({ file, preview });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedImage) || isLoading) return;

    // Check usage before making request
    if (checkUsageBeforeRequest) {
      const canProceed = await checkUsageBeforeRequest();
      if (!canProceed) {
        return; // Usage limit reached, upgrade prompt shown
      }
    }

    // Validate input (skip for image-only messages)
    if (input.trim() && detectVagueInput(input) && !uploadedImage) {
      setInputError("Please be more specific. Try using one of the suggested questions below:");
      return;
    }

    setInputError(null);
    
    let imageBase64 = null;
    let imageUrl = null;

    // Process image if uploaded
    if (uploadedImage) {
      imageBase64 = uploadedImage.preview.split(',')[1]; // Remove data URL prefix
      imageUrl = uploadedImage.preview;
    }

    const userMessage: Message = { 
      role: "user", 
      content: input || "Uploaded image", 
      imageUrl 
    };
    
    setMessages((prev) => [...prev, userMessage]);
    const messageText = input;
    setInput("");
    const currentImage = uploadedImage;
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    setIsLoading(true);

    try {
      let responseText = "";

      // If image is uploaded, use OpenAI Vision API directly
      if (currentImage && imageBase64) {
        const OPENAI_KEY = import.meta.env.VITE_OPENAI_KEY || 'sk-proj-your-key-here';
        const questionText = messageText || "Please analyze this image and describe what you see.";
        
        // Call OpenAI Vision API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: questionText
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${imageBase64}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 2000,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Failed to process image");
        }

        const data = await response.json();
        responseText = data.choices[0]?.message?.content || "Unable to process image.";
        
        // Track image analysis usage
        if (trackApiUsage) {
          await trackApiUsage('image-analysis');
        }
        
      } else {
        // Regular text-based analysis
        const API_KEY = 'TTWy409iie9ozE5vIW5rOhZSe3ZC3OU4hYDjQJOd';
        
        // Prepare request body based on mode
        let requestBody: Record<string, string> = {};
        switch(analysisType) {
          case 'analyze':
          case 'redact':
            requestBody = { text: messageText };
            break;
          case 'report':
            requestBody = { data: messageText };
            break;
          case 'drill':
            requestBody = { scenario: messageText };
            break;
          default:
            requestBody = { text: messageText };
        }

        const endpoint = ENDPOINTS.analysis[analysisType as keyof typeof ENDPOINTS.analysis];
        const response = await fetch(`${API_CONFIG.API_BASE_URL}${endpoint}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-api-key": API_KEY
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to get response");
        }

        const data = await response.json();
        responseText = data.result || data.analysis || data.report || data.recommendations || data.redacted || data.simulation || "No response";
      }
      
      // Track API usage after successful response (before showing assistant message)
      if (trackApiUsage && !currentImage) {
        await trackApiUsage(analysisType);
      }

      const assistantMessage: Message = { 
        role: "assistant", 
        content: responseText
      };
      
      setMessages((prev) => {
        const updatedMessages = [...prev, assistantMessage];
        
        // Save conversation after receiving response
        saveConversation(updatedMessages);
        
        return updatedMessages;
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Show error with Swal
      Swal.fire({
        title: 'Request Failed',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#f97316',
        background: '#1a1a1a',
        color: '#fff',
        customClass: {
          popup: 'border border-gray-800',
          confirmButton: 'font-semibold'
        }
      });
      
      const assistantMessage: Message = {
        role: "assistant",
        content: `<div style="color: #ff4444;">❌ Error: ${errorMessage}<br><br>Please try again or contact support.</div>`,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save or update conversation
  const saveConversation = async (updatedMessages: Message[]) => {
    try {
      // Filter out system messages for saving
      const messagesToSave = updatedMessages.filter(msg => msg.role !== 'system');
      
      if (messagesToSave.length === 0) return;

      if (!currentConversationId) {
        // Create new conversation with title from first user message
        const firstUserMessage = messagesToSave.find(msg => msg.role === 'user');
        if (firstUserMessage) {
          const title = conversationsService.generateTitle(firstUserMessage.content, analysisType);
          const conversationId = await conversationsService.createConversation(
            analysisType,
            title,
            messagesToSave
          );
          if (conversationId) {
            setCurrentConversationId(conversationId);
          }
        }
      } else {
        // Update existing conversation
        await conversationsService.updateConversation(currentConversationId, messagesToSave);
      }
    } catch (error) {
      console.error('Failed to save conversation:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setInputError(null);
  };

  const analysisCards = [
    {
      id: 'analyze',
      title: 'Analyze Threat',
      description: 'Detect behavioral threat indicators',
      icon: '🔍',
      endpoint: ENDPOINTS.analysis.analyze
    },
    {
      id: 'redact',
      title: 'Redact PII',
      description: 'Remove personal information',
      icon: '🔒',
      endpoint: ENDPOINTS.analysis.redact
    },
    {
      id: 'report',
      title: 'Generate Report',
      description: 'Create detailed analysis reports',
      icon: '📄',
      endpoint: ENDPOINTS.analysis.generateReport
    },
    {
      id: 'drill',
      title: 'Simulate Drill',
      description: 'Practice threat response',
      icon: '🎯',
      endpoint: ENDPOINTS.analysis.simulateDrill
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Header with Mode Badge */}
      {messages.length > 0 && (
        <div className="border-b border-border px-6 py-3 bg-[#0f0f0f]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white text-lg">{modeConfig[analysisType].icon}</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Threatalytics AI</h2>
              <p className="text-xs text-orange-500">{modeConfig[analysisType].title}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto">{/* Increased max width for better readability */}
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-2xl text-white mx-auto mb-4">
                  🛡️
                </div>
                <h1 className="text-3xl font-bold mb-2 text-white">Welcome to Threatalytics AI</h1>
                <p className="text-gray-400 text-base">
                Advanced threat analysis powered by GPT-4o. Choose an analysis type and start your conversation.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl w-full">
              {Object.entries(modeConfig).map(([key, mode]) => (
                <button
                  key={key}
                  onClick={() => {
                    onModeSelect(key);
                    setInput(mode.suggestion);
                  }}
                  className={cn(
                    "p-4 rounded-lg border text-center group transition-all",
                    "hover:border-orange-600/50 hover:shadow-lg hover:-translate-y-1",
                    analysisType === key ? 'bg-orange-600 border-orange-600 text-white' : 'bg-[#0f0f0f] border-gray-800 hover:bg-[#252525]'
                  )}
                >
                  <div className="text-3xl mb-2">{mode.icon}</div>
                  <h3 className="text-sm font-semibold mb-1">{mode.title}</h3>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={cn(
                  "flex gap-3 px-4",
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
                  {message.role === 'user' ? (
                    <div className="space-y-2">
                      {message.imageUrl && (
                        <img 
                          src={message.imageUrl} 
                          alt="User upload" 
                          className="max-w-full max-h-64 rounded-lg"
                        />
                      )}
                      {message.content && (
                        <p className="text-[15px] leading-relaxed">{message.content}</p>
                      )}
                    </div>
                  ) : (
                    <div 
                      className={cn(
                        "prose prose-sm max-w-none",
                        "prose-headings:text-orange-500 prose-headings:font-semibold prose-headings:mb-3",
                        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
                        "prose-p:text-gray-200 prose-p:leading-relaxed prose-p:my-2",
                        "prose-strong:text-orange-400 prose-strong:font-semibold",
                        "prose-ul:my-2 prose-li:text-gray-200 prose-li:my-1",
                        "prose-code:bg-gray-800 prose-code:text-orange-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
                        "[&_.inline-flex]:inline-flex [&_.inline-flex]:items-center",
                        "[&_.rounded-lg]:bg-[#0f0f0f] [&_.rounded-lg]:border [&_.rounded-lg]:border-[#2d2d2d] [&_.rounded-lg]:p-4 [&_.rounded-lg]:my-3"
                      )}
                      dangerouslySetInnerHTML={{ 
                        __html: formatResponse(message.content)
                      }}
                    />
                  )}
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
            {isLoading && (
              <div className="flex gap-3 px-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="rounded-2xl px-4 py-3 max-w-[75%] bg-[#1a1a1a] border border-[#2d2d2d] rounded-tl-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      </div>

      {/* Chat Input */}
      <div className="border-t border-border p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {inputError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-destructive font-medium">{inputError}</p>
                  <p className="text-sm text-muted-foreground mt-2">Try this example:</p>
                  <button
                    onClick={() => {
                      setInput(modeConfig[analysisType].suggestion);
                      setInputError(null);
                    }}
                    className="mt-2 text-sm text-orange-500 hover:text-orange-400 text-left"
                  >
                    {modeConfig[analysisType].suggestion}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Image preview */}
          {uploadedImage && (
            <div className="relative inline-block mb-3">
              <img 
                src={uploadedImage.preview} 
                alt="Upload preview" 
                className="max-h-48 rounded-lg border border-border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removeImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div className="flex gap-3 items-end relative">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {/* Image upload button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="flex-shrink-0 h-[60px] w-[60px] border-border hover:border-orange-500"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
            
            <Textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                const textarea = e.target;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={uploadedImage ? "Ask a question about this image..." : modeConfig[analysisType].placeholder}
              className={cn(
                "min-h-[60px] max-h-[200px] resize-none pr-14",
                "bg-card border-border",
                "focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              )}
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && !uploadedImage) || isLoading}
              size="icon"
              className={cn(
                "absolute right-2 bottom-2 h-10 w-10 rounded-full",
                "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
                "transition-transform hover:scale-105 active:scale-95"
              )}
            >
              <Send className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
