import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";
import { base44 } from '@/api/base44Client';
import { AlertTriangle } from 'lucide-react';

export default function ReturnJobDialog({ job, assignment, open, onOpenChange, onComplete }) {
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const user = await base44.auth.me();
      
      // Find and delete the assignment for this job
      const assignments = await base44.entities.Assignment.filter({ jobId: job.id });
      if (assignments.length > 0) {
        await base44.entities.Assignment.delete(assignments[0].id);
      }
      
      // Update the job with return information
      await base44.entities.Job.update(job.id, {
        isReturned: true,
        returnReason: returnReason,
        returnNotes: returnNotes || undefined,
        returnedBy: user.email,
        returnedDate: new Date().toISOString(),
        status: 'CANCELLED'
      });

      // Send return notification email
      try {
        await base44.functions.invoke('sendJobReturnedEmail', {
          jobId: job.id
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      toast({
        title: "Job Returned",
        description: "The job has been marked as returned to supplier.",
      });

      onComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to return job. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to return job:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle className="text-red-900">Undeliverable Job Returned to Supplier</DialogTitle>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">
                <span className="font-semibold">Customer:</span> {job.customerName}
              </p>
              <p className="text-sm text-red-900 mt-1">
                <span className="font-semibold">Delivery:</span> {job.deliveryLocation}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for return *
              </label>
              <Select value={returnReason} onValueChange={setReturnReason} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No safe access for delivery staff">
                    No safe access for delivery staff
                  </SelectItem>
                  <SelectItem value="No safe area for truck and/or machine to be parked">
                    No safe area for truck and/or machine to be parked
                  </SelectItem>
                  <SelectItem value="Excessively difficult delivery conditions not communicated at time of booking">
                    Excessively difficult delivery conditions not communicated at time of booking
                  </SelectItem>
                  <SelectItem value="Incorrect or damaged items">
                    Incorrect or damaged items
                  </SelectItem>
                  <SelectItem value="Other">
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details (optional)
              </label>
              <Textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Provide any additional details about the return..."
                rows={4}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-900">
                ⚠️ This action will unschedule the job and mark it as returned. The customer and dispatcher will be notified.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? 'Processing...' : 'Confirm Return'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}