import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { activityService, ActivityEntry } from "@/lib/activity-service";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from 'sweetalert2';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const loadActivities = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await activityService.getActivities();
      setActivities(data);
      
      // Initialize notes from activities
      const initialNotes: Record<number, string> = {};
      data.forEach((item, idx) => {
        initialNotes[idx] = item.note || "";
      });
      setNotes(initialNotes);
    } catch (error) {
      console.error('Failed to load activities:', error);
      
      // Show error with Swal
      Swal.fire({
        title: 'Failed to Load',
        text: 'Unable to load activity log. Please try refreshing the page.',
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
    loadActivities();
  }, [loadActivities]);

  const updateNote = async (index: number) => {
    const entry = activities[index];
    if (!entry) return;
    
    try {
      await activityService.updateNote(entry.activity_id, notes[index] || "");
      
      // Success notification
      Swal.fire({
        title: 'Saved!',
        text: 'Case note updated successfully.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: '#fff',
        customClass: {
          popup: 'border border-gray-800'
        }
      });
    } catch (error) {
      console.error('Failed to update note:', error);
      
      // Error notification
      Swal.fire({
        title: 'Error',
        text: 'Failed to update case note. Please try again.',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <p className="text-gray-400">Loading activities...</p>
      </div>
    );
  }

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
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">📁 Client Case Dashboard</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {activities.length === 0 ? (
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-8 text-center">
              <p className="text-gray-400">No activities found. Start by analyzing a threat or uploading a document.</p>
            </CardContent>
          </Card>
        ) : (
          activities.map((item, i) => (
            <Card key={i} className="bg-[#1a1a1a] border-gray-800 hover:border-gray-700 transition-colors">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{item.timestamp || new Date().toLocaleString()}</p>
                  {item.trs_score !== undefined && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.trs_score >= 4 ? 'bg-red-500/20 text-red-400' :
                      item.trs_score >= 2 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      TRS: {item.trs_score}
                    </span>
                  )}
                </div>
                
                {item.case_name && (
                  <p className="text-white">
                    <strong className="text-orange-500">Case:</strong> {item.case_name}
                  </p>
                )}
                
                <p className="text-white">
                  <strong className="text-orange-500">Mode:</strong>{' '}
                  <span className="capitalize">{item.mode?.replace('_', ' ')}</span>
                </p>
                
                {item.question && (
                  <div className="space-y-1">
                    <strong className="text-orange-500">Question:</strong>
                    <p className="text-gray-300 pl-4 border-l-2 border-gray-700">{item.question}</p>
                  </div>
                )}
                
                {item.answer && (
                  <div className="space-y-1">
                    <strong className="text-orange-500">Answer:</strong>
                    <p className="text-gray-300 pl-4 border-l-2 border-gray-700">{item.answer}</p>
                  </div>
                )}
                
                {item.tag && (
                  <p className="text-white">
                    <strong className="text-orange-500">Tag:</strong>{' '}
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">{item.tag}</span>
                  </p>
                )}
                
                {item.file_url && (
                  <p>
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-2"
                    >
                      🔁 Download Source File
                    </a>
                  </p>
                )}
                
                <div className="space-y-2 pt-2">
                  <label className="text-sm font-semibold text-orange-500">📝 Case Note</label>
                  <Textarea
                    value={notes[i] || ""}
                    onChange={(e) => setNotes({ ...notes, [i]: e.target.value })}
                    onBlur={() => updateNote(i)}
                    placeholder="Enter private note for this entry..."
                    className="bg-[#0a0a0a] border-gray-700 focus:border-orange-500 text-white placeholder:text-gray-600"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
