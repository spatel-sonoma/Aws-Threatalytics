import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { documentService } from "@/lib/document-service";
import { feedbackService } from "@/lib/feedback-service";
import { metricsService, MetricsData } from "@/lib/metrics-service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Upload, MessageSquare, ThumbsUp, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ClientAssistant = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("policy_audit");
  const [response, setResponse] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [helpful, setHelpful] = useState(false);
  const [comments, setComments] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputError, setInputError] = useState<string | null>(null);

  const loadMetrics = async () => {
    try {
      const data = await metricsService.getMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const uploadAndProcess = async () => {
    if (!file) return;
    
    setProcessing(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result?.toString().split(',')[1];
        if (!base64) {
          alert('Failed to read file');
          setProcessing(false);
          return;
        }

        // Upload
        const uploadRes = await documentService.uploadDocument(file.name, base64);
        setDocumentId(uploadRes.document_id);

        // Process
        await documentService.processDocument(uploadRes.document_id);
        
        alert('File processed successfully. You may now ask a question.');
        setProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload/process error:', error);
      alert('Failed to process file');
      setProcessing(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;

    try {
      const data = await documentService.askQuestion(question, mode, documentId);
      
      if (data.error && data.templates) {
        setInputError(data.error);
        setSuggestions(data.templates);
        setResponse(null);
      } else {
        setResponse(data.answer);
        setSuggestions([]);
        setInputError(null);
        setFeedbackSent(false);
      }
    } catch (error) {
      console.error('Ask error:', error);
      setResponse('Failed to get answer. Please try again.');
    }
  };

  const sendFeedback = async () => {
    try {
      await feedbackService.submitFeedback({
        question,
        helpful,
        comments
      });
      setFeedbackSent(true);
      loadMetrics();
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  const chartData = metrics ? [
    { name: 'Helpful', value: metrics.helpful },
    { name: 'Not Helpful', value: metrics.not_helpful }
  ] : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0f0f0f]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">🤖 Policy Assistant</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Upload Document */}
        <Card className="bg-[#1a1a1a] border-gray-800 shadow-lg">
          <CardContent className="p-8 space-y-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Upload className="h-6 w-6 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Upload Policy Document</h2>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Upload a PDF or DOCX file containing your policy document for analysis
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="flex-1">
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.docx"
                  className="bg-[#0f0f0f] border-gray-700 text-white h-12 
                    file:bg-orange-500 file:text-white file:border-0 file:mr-4 
                    file:py-2 file:px-6 file:rounded-md file:cursor-pointer 
                    file:font-semibold hover:file:bg-orange-600 transition-all"
                />
              </div>
              <Button
                onClick={uploadAndProcess}
                disabled={processing || !file}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 
                  disabled:cursor-not-allowed h-12 px-8 font-semibold shadow-lg 
                  hover:shadow-orange-500/50 transition-all"
              >
                {processing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Processing...
                  </>
                ) : (
                  "Upload + Process"
                )}
              </Button>
            </div>
            {file && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm">
                  ✓ Selected: <span className="font-semibold">{file.name}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ask Question */}
        <Card className="bg-[#1a1a1a] border-gray-800 shadow-lg">
          <CardContent className="p-8 space-y-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <MessageSquare className="h-6 w-6 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Ask a Question</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Analysis Mode</label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="bg-[#0f0f0f] border-gray-700 text-white h-12 hover:border-orange-500/50 transition-colors">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-gray-700 text-white">
                  <SelectItem value="policy_audit" className="hover:bg-orange-500/10">
                    🔍 Policy Audit
                  </SelectItem>
                  <SelectItem value="drill_extractor" className="hover:bg-orange-500/10">
                    🎯 Drill Extractor
                  </SelectItem>
                  <SelectItem value="red_flag_finder" className="hover:bg-orange-500/10">
                    🚩 Red Flag Finder
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300">Your Question</label>
              <Textarea
                placeholder="Type your question here... (e.g., 'Does this policy clearly define lockdown procedures?')"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="bg-[#0f0f0f] border-gray-700 text-white placeholder:text-gray-600 
                  min-h-[120px] focus:border-orange-500 transition-colors resize-none"
              />
            </div>

            <Button
              onClick={handleAsk}
              disabled={!question.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 
                disabled:cursor-not-allowed h-12 font-semibold shadow-lg 
                hover:shadow-orange-500/50 transition-all"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Ask Question
            </Button>

            {inputError && (
              <div className="text-red-400 p-5 bg-red-500/10 border border-red-500/30 rounded-lg animate-in fade-in">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-lg mb-2">{inputError}</p>
                    {suggestions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-red-300 mb-2">💡 Try one of these:</p>
                        <ul className="space-y-2">
                          {suggestions.map((s, i) => (
                            <li 
                              key={i} 
                              className="text-sm text-gray-300 pl-4 border-l-2 border-red-500/30 hover:border-red-500 transition-colors cursor-pointer"
                              onClick={() => setQuestion(s)}
                            >
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Answer */}
        {response && (
          <Card className="bg-[#1a1a1a] border-gray-800 shadow-lg animate-in fade-in slide-in-from-bottom-4">
            <CardContent className="p-8 space-y-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Answer</h2>
              </div>
              <div className="bg-[#0f0f0f] p-6 rounded-lg border border-gray-800">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
                  {response}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback */}
        {response && !feedbackSent && (
          <Card className="bg-[#1a1a1a] border-gray-800 shadow-lg">
            <CardContent className="p-8 space-y-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ThumbsUp className="h-6 w-6 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">How was this answer?</h2>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-[#0f0f0f] rounded-lg border border-gray-800">
                <Checkbox
                  checked={helpful}
                  onCheckedChange={(val) => setHelpful(val as boolean)}
                  className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 h-5 w-5"
                />
                <label className="text-gray-300 font-medium cursor-pointer select-none" onClick={() => setHelpful(!helpful)}>
                  This answer was helpful
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">Additional Comments (Optional)</label>
                <Textarea
                  placeholder="Share your thoughts or suggestions..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="bg-[#0f0f0f] border-gray-700 text-white placeholder:text-gray-600 h-24 resize-none"
                />
              </div>

              <Button
                onClick={sendFeedback}
                className="w-full bg-orange-500 hover:bg-orange-600 h-12 font-semibold shadow-lg hover:shadow-orange-500/50 transition-all"
              >
                <ThumbsUp className="mr-2 h-5 w-5" />
                Submit Feedback
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Feedback Sent */}
        {feedbackSent && (
          <Card className="bg-green-500/10 border-green-500/30 shadow-lg animate-in fade-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="text-green-400 font-semibold text-lg">Thank you for your feedback!</p>
                  <p className="text-green-300/70 text-sm mt-1">Your input helps us improve our analysis.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics */}
        {metrics && (
          <Card className="bg-[#1a1a1a] border-gray-800 shadow-lg">
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Feedback Analytics</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#0f0f0f] p-5 rounded-lg border border-gray-800">
                  <p className="text-gray-400 text-sm mb-1">Total Feedback</p>
                  <p className="text-3xl font-bold text-white">{metrics.total_feedback}</p>
                </div>
                <div className="bg-[#0f0f0f] p-5 rounded-lg border border-gray-800">
                  <p className="text-gray-400 text-sm mb-1">Helpful Responses</p>
                  <p className="text-3xl font-bold text-green-400">{metrics.helpful}</p>
                </div>
                <div className="bg-[#0f0f0f] p-5 rounded-lg border border-gray-800">
                  <p className="text-gray-400 text-sm mb-1">Helpful Rate</p>
                  <p className="text-3xl font-bold text-orange-400">{metrics.helpful_rate_percent}%</p>
                </div>
              </div>

              <div className="bg-[#0f0f0f] p-6 rounded-lg border border-gray-800">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis allowDecimals={false} stroke="#666" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1a1a1a', 
                        border: '1px solid #333',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      itemStyle={{ color: '#f97316' }}
                    />
                    <Bar dataKey="value" fill="#f97316" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {metrics.sample_comments.length > 0 && (
                <div className="bg-[#0f0f0f] p-6 rounded-lg border border-gray-800">
                  <p className="font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    Recent Comments
                  </p>
                  <ul className="space-y-3">
                    {metrics.sample_comments.map((c, i) => (
                      <li key={i} className="text-sm text-gray-400 pl-4 border-l-2 border-gray-700 hover:border-orange-500 transition-colors">
                        "{c}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClientAssistant;
