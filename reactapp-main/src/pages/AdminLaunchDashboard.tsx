import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { roadmapService, RoadmapData, RoadmapTask } from "@/lib/roadmap-service";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import Swal from 'sweetalert2';

const AdminLaunchDashboard = () => {
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRoadmap = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await roadmapService.getRoadmap();
      setRoadmap(data);
    } catch (error) {
      console.error('Failed to load roadmap:', error);
      
      // Show error with Swal
      Swal.fire({
        title: 'Failed to Load',
        text: 'Unable to load roadmap. Please try refreshing the page.',
        icon: 'error',
        confirmButtonColor: '#f97316',
        background: '#1a1a1a',
        color: '#fff',
        customClass: {
          popup: 'border border-gray-800',
          confirmButton: 'font-semibold'
        }
      });
      
      if (error instanceof Error && error.message.includes('401')) {
        navigate('/auth');
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  const updateStatus = async (category: string, index: number, checked: boolean) => {
    if (!roadmap) return;

    const status = checked ? 'complete' : 'pending';
    
    try {
      await roadmapService.updateTaskStatus(category, index, status);
      
      // Update local state
      setRoadmap(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        const categoryKey = category as keyof Omit<RoadmapData, 'database'>;
        if (categoryKey in updated && Array.isArray(updated[categoryKey])) {
          const tasks = [...(updated[categoryKey] as RoadmapTask[])];
          tasks[index] = { ...tasks[index], status };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (updated as any)[categoryKey] = tasks;
        }
        return updated;
      });
      
      // Success toast
      Swal.fire({
        title: checked ? 'Task Completed!' : 'Task Updated',
        text: checked ? 'Great progress on your roadmap!' : 'Task marked as pending.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#1a1a1a',
        color: '#fff',
        customClass: {
          popup: 'border border-gray-800'
        }
      });
    } catch (error) {
      console.error('Failed to update status:', error);
      
      // Error notification
      Swal.fire({
        title: 'Error',
        text: 'Failed to update task status. Please try again.',
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

  const exportRoadmap = () => {
    try {
      roadmapService.exportRoadmap();
      
      // Success notification
      Swal.fire({
        title: 'Exported!',
        text: 'Roadmap CSV file has been downloaded.',
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
      console.error('Failed to export roadmap:', error);
      
      // Error notification
      Swal.fire({
        title: 'Error',
        text: 'Failed to export roadmap. Please try again.',
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

  const renderPhase = (
    title: string,
    items: RoadmapTask[],
    category: string,
    key: 'task' | 'feature' = 'task'
  ) => (
    <Card className="bg-[#1a1a1a] border-gray-800">
      <CardContent className="p-6">
        <h2 className="text-lg font-bold text-orange-500 mb-4">{title}</h2>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-center space-x-3">
              <Checkbox
                checked={item.status === "complete"}
                onCheckedChange={(val) => updateStatus(category, i, val as boolean)}
                className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              <span className={`${item.status === 'complete' ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                {item[key]}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <p className="text-gray-400">Loading roadmap...</p>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <p className="text-gray-400">Failed to load roadmap</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-[#0f0f0f]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">🚀 Launch Readiness Dashboard</h1>
          </div>
          <Button
            onClick={exportRoadmap}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {renderPhase("1. Infrastructure Tasks", roadmap.infrastructure, "infrastructure")}
        {renderPhase("2. Client Dashboard Features", roadmap.client_dashboard, "client_dashboard", "feature")}
        {renderPhase("3. Pilot Checklist", roadmap.pilot, "pilot")}
        {renderPhase("4. Launch Prep", roadmap.launch, "launch")}

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-orange-500 mb-4">5. Database Plan</h2>
            <div className="space-y-2">
              <p className="text-gray-300">
                <strong className="text-white">Preferred DB:</strong> {roadmap.database.preferred_db}
              </p>
              <div>
                <strong className="text-white">Tables:</strong>
                <ul className="list-disc list-inside text-sm mt-2 text-gray-400 ml-4">
                  {roadmap.database.tables.map((table, i) => (
                    <li key={i}>{table}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLaunchDashboard;
