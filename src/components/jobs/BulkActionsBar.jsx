import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle } from 'lucide-react';

export default function BulkActionsBar({ selectedJobs, onClearSelection, onActionComplete }) {
  const [bulkAction, setBulkAction] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const handleBulkAction = async () => {
    if (!bulkAction) {
      toast({
        title: "Error",
        description: "Please select an action.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const updates = selectedJobs.map(async (job) => {
        const updatedData = { ...job };
        
        switch (bulkAction) {
          case 'mark_scheduled':
            updatedData.status = 'SCHEDULED';
            break;
          case 'mark_in_transit':
            updatedData.status = 'IN_TRANSIT';
            break;
          case 'mark_delivered':
            updatedData.status = 'DELIVERED';
            break;
          case 'mark_cancelled':
            updatedData.status = 'CANCELLED';
            break;
          default:
            return;
        }
        
        return base44.entities.Job.update(job.id, updatedData);
      });

      await Promise.all(updates);

      toast({
        title: "Success",
        description: `Updated ${selectedJobs.length} job(s) successfully.`,
      });

      onActionComplete();
      onClearSelection();
      setBulkAction('');
    } catch (error) {
      console.error('Bulk action failed:', error);
      toast({
        title: "Error",
        description: "Failed to perform bulk action. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (selectedJobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white border-2 border-blue-600 rounded-lg shadow-xl p-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-blue-600" />
          <span className="font-semibold">{selectedJobs.length} selected</span>
        </div>

        <div className="w-px h-6 bg-gray-300" />

        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select action..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mark_scheduled">Mark as Scheduled</SelectItem>
            <SelectItem value="mark_in_transit">Mark as In Transit</SelectItem>
            <SelectItem value="mark_delivered">Mark as Delivered</SelectItem>
            <SelectItem value="mark_cancelled">Mark as Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={handleBulkAction}
          disabled={!bulkAction || processing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {processing ? 'Processing...' : 'Apply'}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}