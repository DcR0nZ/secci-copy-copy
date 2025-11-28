import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Upload, Loader2, X, Camera, Image as ImageIcon } from 'lucide-react';

const MAX_PHOTOS = 10;

export default function ReturnJobDialog({ job, assignment, open, onOpenChange, onComplete }) {
  const [returnReason, setReturnReason] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    if (photos.length + selectedFiles.length > MAX_PHOTOS) {
      toast({
        title: "Too Many Photos",
        description: `You can upload a maximum of ${MAX_PHOTOS} photos.`,
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    const validFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    
    // Create previews
    const newPreviews = await Promise.all(
      validFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({
            file,
            preview: e.target.result,
          });
          reader.readAsDataURL(file);
        });
      })
    );

    setPhotos(prev => [...prev, ...validFiles]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!returnReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for returning this job.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const user = await base44.auth.me();
      
      // Upload photos
      let uploadedPhotoUrls = [];
      if (photos.length > 0) {
        setUploading(true);
        for (const photo of photos) {
          try {
            const result = await base44.integrations.Core.UploadFile({ file: photo });
            uploadedPhotoUrls.push(result.file_url);
          } catch (error) {
            console.error('Failed to upload photo:', error);
          }
        }
        setUploading(false);
      }

      // Get the truck ID from assignment
      let truckId = null;
      if (assignment) {
        truckId = assignment.truckId;
      } else {
        // Try to find assignment
        const assignments = await base44.entities.Assignment.filter({ jobId: job.id });
        if (assignments.length > 0) {
          truckId = assignments[0].truckId;
          // Delete the assignment
          await base44.entities.Assignment.delete(assignments[0].id);
        }
      }
      
      // Update the job with return information - keep it visible with RETURNED status
      await base44.entities.Job.update(job.id, {
        isReturned: true,
        returnReason: returnReason.trim(),
        returnPhotos: uploadedPhotoUrls.length > 0 ? uploadedPhotoUrls : undefined,
        returnedBy: user.email,
        returnedByName: user.full_name || user.email,
        returnedDate: new Date().toISOString(),
        returnedTruckId: truckId,
        returnAlertDismissedBy: [],
        returnAlertRemindLater: [],
        status: 'RETURNED'
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
        description: "The job has been marked as returned. Relevant users will be notified.",
      });

      // Reset form
      setReturnReason('');
      setPhotos([]);
      setPhotoPreviews([]);
      
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
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle className="text-red-900">Return Job - Unable to Deliver</DialogTitle>
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

            {/* Photo Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site Photos (Optional but recommended)
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Upload photos showing why the delivery couldn't be completed
              </p>

              {photos.length < MAX_PHOTOS && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-2"
                    disabled={submitting}
                    asChild
                  >
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={submitting}
                      />
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </label>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-2"
                    disabled={submitting}
                    asChild
                  >
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={submitting}
                      />
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Choose Photos
                    </label>
                  </Button>
                </div>
              )}

              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
                      <img
                        src={preview.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Return Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for return *
              </label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Describe why the delivery couldn't be completed (e.g., no safe access, site not ready, customer not present, etc.)"
                rows={4}
                required
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-900">
                ⚠️ This job will be marked as returned and remain visible on the schedule. The dispatcher and customer will be notified.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting || uploading}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploading ? 'Uploading...' : 'Processing...'}
                </>
              ) : (
                'Confirm Return'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}