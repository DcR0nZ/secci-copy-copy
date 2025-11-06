
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";
import { Upload, Loader2, X, Camera, Image as ImageIcon, AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { sendPODNotesNotification } from '@/functions/sendPODNotesNotification';
import { sendToZapier } from '@/functions/sendToZapier';
import { useOffline } from '../offline/OfflineManager';

const MAX_PHOTOS = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB before compression
const TARGET_SIZE = 2 * 1024 * 1024; // 2MB target after compression

const compressImage = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions (max 1920px width/height)
        const maxDimension = 1920;
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to reach target size
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }

              // Only reduce quality if blob size is still too big AND quality is above threshold
              // This is a simplified approach, more advanced could binary search for quality.
              if (blob.size > TARGET_SIZE && quality > 0.5) { 
                quality -= 0.1;
                tryCompress();
              } else {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg', // Ensure JPEG for consistency after compression
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

export default function ProofOfDeliveryUpload({ job, open, onOpenChange, onPODUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [errors, setErrors] = useState([]);
  const { toast } = useToast();
  const { isOnline, queuePODUpload } = useOffline();

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length === 0) return;

    // Validate total count
    if (photos.length + selectedFiles.length > MAX_PHOTOS) {
      toast({
        title: "Too Many Photos",
        description: `You can upload a maximum of ${MAX_PHOTOS} photos. Currently you have ${photos.length} photo(s).`,
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    // Validate file types and sizes
    const validFiles = [];
    const newErrors = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        newErrors.push(`${file.name}: Not an image file`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        newErrors.push(`${file.name}: File too large (max 10MB)`);
        continue;
      }

      validFiles.push(file);
    }

    if (newErrors.length > 0) {
      setErrors(prev => [...prev, ...newErrors]);
    }

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    // Create previews
    const newPreviews = await Promise.all(
      validFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({
            file,
            preview: e.target.result,
            compressed: false, // This flag might not be used elsewhere, but kept for consistency
            originalSize: file.size,
          });
          reader.readAsDataURL(file);
        });
      })
    );

    setPhotos(prev => [...prev, ...validFiles]);
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';

    toast({
      title: "Photos Added",
      description: `${validFiles.length} photo(s) added. Ready to upload.`,
    });
  };

  const handleRemovePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => prev.filter((_, i) => i !== index)); // Assuming errors array might align with photos
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (photos.length === 0) {
      toast({
        title: "No Photos",
        description: "Please capture at least one photo of the delivery.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setErrors([]); // Clear previous errors for a new submission attempt

    // Fetch user details once, needed for both online notification and offline queue
    const user = await base44.auth.me(); 

    try {
      const totalPhotos = photos.length;
      const compressedPhotosDataURLs = [];
      const currentSubmissionErrors = []; // Collect all errors encountered during this submission

      // --- PHASE 1: Compress and convert photos to Data URLs ---
      for (let i = 0; i < photos.length; i++) {
        setProcessingIndex(i); // Indicate which photo is currently being processed
        const photo = photos[i];

        try {
          let fileToProcess = photo;
          if (photo.type.startsWith('image/') && photo.size > TARGET_SIZE) {
            try {
              fileToProcess = await compressImage(photo);
              console.log(`Compressed ${photo.name}: ${(photo.size / 1024 / 1024).toFixed(2)}MB → ${(fileToProcess.size / 1024 / 1024).toFixed(2)}MB`);
            } catch (compressionError) {
              console.error(`Compression failed for photo ${photo.name}. Attempting to use original file.`, compressionError);
              currentSubmissionErrors.push(`Photo ${i + 1} (${photo.name}): Compression failed. Using original.`);
              // Decide whether to use original if compression fails. Here we default to it.
              // If original is also too large, a later step might fail, which is appropriate.
            }
          }

          // Convert the processed (compressed or original) file to a Data URL
          const reader = new FileReader();
          const dataURL = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(fileToProcess);
          });
          
          compressedPhotosDataURLs.push(dataURL);
          
          // Update progress for the compression/processing phase (0-50%)
          const progress = ((i + 1) / totalPhotos) * 50;
          setUploadProgress(Math.round(progress));
        } catch (error) {
          console.error(`Failed to prepare photo ${i + 1} (${photo.name}):`, error);
          currentSubmissionErrors.push(`Photo ${i + 1} (${photo.name}): ${error.message || 'Processing failed'}`);
        }
      }

      setProcessingIndex(-1); // Reset processing index after the compression phase

      if (compressedPhotosDataURLs.length === 0) {
        throw new Error('All photos failed to be processed. Please ensure they are valid image files.');
      }
      
      // If there were any errors during photo processing (compression/dataURL conversion), display a warning toast.
      if (currentSubmissionErrors.length > 0) {
        setErrors(currentSubmissionErrors); // Display collected errors
        toast({
          title: "Photo Preparation Warnings",
          description: "Some photos encountered issues during preparation. Attempting to proceed with valid ones.",
          variant: "warning",
        });
      }


      // --- PHASE 2: OFFLINE PATH (if not online) ---
      if (!isOnline) {
        await queuePODUpload({
          jobId: job.id,
          photos: compressedPhotosDataURLs, // Pass Data URLs for storage in IndexedDB
          notes,
          jobDetails: { // Pass essential job details needed for offline re-upload and notification
            jobId: job.id, // Redundant but good for clarity in the offline task payload
            customerName: job.customerName,
            deliveryLocation: job.deliveryLocation,
            existingPodFiles: job.podFiles || [],
            driverName: user?.full_name || 'Driver' // Use the fetched user info
          }
        });

        toast({
          title: "Delivery Saved Offline",
          description: `${compressedPhotosDataURLs.length} photo(s) and notes have been saved locally. They will automatically upload when you regain internet connection.`,
          variant: "default",
          duration: 5000,
        });

        onPODUploaded(); // Notify parent component about potential update
        onOpenChange(false); // Close the dialog

        // Reset form state after successful offline save
        setPhotos([]);
        setPhotoPreviews([]);
        setNotes('');
        setErrors([]);
        setUploading(false); // Make sure uploading state is reset
        return; // IMPORTANT: Exit early for the offline path
      }

      // --- PHASE 2: ONLINE PATH (if online) ---
      const uploadedUrls = []; // This will store the Base44 URLs for successfully uploaded photos

      for (let i = 0; i < compressedPhotosDataURLs.length; i++) {
        setProcessingIndex(i); // Indicate which photo is currently being uploaded
        try {
          const dataURL = compressedPhotosDataURLs[i];
          const blob = await fetch(dataURL).then(r => r.blob());
          
          // Use the original file name if available, otherwise generate a generic one
          const originalFile = photos[i]; 
          const fileToUpload = new File([blob], originalFile?.name || `pod-${job.id}-${Date.now()}-${i + 1}.jpg`, { type: blob.type });
          
          // Upload to Base44
          const result = await base44.integrations.Core.UploadFile({ file: fileToUpload });
          uploadedUrls.push(result.file_url);

          // Update progress for the upload phase (50-100%)
          const progress = 50 + ((i + 1) / compressedPhotosDataURLs.length) * 50;
          setUploadProgress(Math.round(progress));
        } catch (error) {
          console.error(`Failed to upload photo ${i + 1} (${photos[i]?.name || 'N/A'}):`, error);
          currentSubmissionErrors.push(`Photo ${i + 1} (${photos[i]?.name || 'N/A'}): ${error.message || 'Upload failed'}`);
        }
      }
      setProcessingIndex(-1); // Reset processing index after the upload phase

      // If no photos were successfully uploaded, despite some being processed,
      // treat this as a critical failure for the online submission.
      if (uploadedUrls.length === 0 && compressedPhotosDataURLs.length > 0) {
        throw new Error('No photos were successfully uploaded. Please check your internet connection and try again.');
      }

      // Get existing POD files and append new ones
      const existingPodFiles = job.podFiles || [];
      const allPodFiles = [...existingPodFiles, ...uploadedUrls];

      // Update job with POD photos and status
      await base44.entities.Job.update(job.id, {
        ...job,
        podFiles: allPodFiles,
        podNotes: notes || job.podNotes, // Use new notes, or keep existing if no new ones provided
        status: 'DELIVERED',
        driverStatus: 'COMPLETED'
      });

      // Send notification email if there are notes (only if online and notes provided)
      if (notes && notes.trim()) {
        try {
          await sendPODNotesNotification({
            jobId: job.id,
            customerName: job.customerName,
            deliveryLocation: job.deliveryLocation,
            notes: notes.trim(),
            driverName: user?.full_name || 'Driver' // Use the fetched user info
          });
        } catch (emailError) {
          console.error('Failed to send POD notes notification:', emailError);
          // Don't fail the entire submission for a notification error, just log it.
        }
      }

      // Send to Zapier (only if online)
      try {
        await sendToZapier({
          eventType: 'job_delivered',
          data: {
            jobId: job.id,
            customerName: job.customerName,
            deliveryLocation: job.deliveryLocation,
            deliveryDate: new Date().toISOString(),
            podNotes: notes,
            photoCount: uploadedUrls.length,
            totalPhotoCount: allPodFiles.length
          }
        });
      } catch (zapierError) {
        console.error('Failed to send to Zapier:', zapierError);
        // Don't fail the entire submission for a Zapier error, just log it.
      }

      // Determine final toast message and variant based on errors encountered
      let finalToastDescription = `${uploadedUrls.length} photo(s) uploaded successfully!`;
      let finalToastTitle = "Delivery Complete!";
      let finalToastVariant = "default";

      if (currentSubmissionErrors.length > 0) {
        finalToastTitle = "Delivery with Warnings";
        finalToastDescription += ` Some issues were encountered during upload.`;
        finalToastVariant = "warning";
      }

      toast({
        title: finalToastTitle,
        description: finalToastDescription,
        variant: finalToastVariant,
      });

      if (currentSubmissionErrors.length > 0) {
        setErrors(currentSubmissionErrors); // Update the errors state with all collected errors
      }

      onPODUploaded(); // Notify parent component of successful/partial upload
      
      // Close dialog and reset form only if some photos were uploaded (online)
      // or if the process was an offline save (handled above).
      // If `uploadedUrls.length` is 0 but `compressedPhotosDataURLs.length` > 0, it means online upload failed
      // entirely, and the error was thrown, keeping the dialog open for user retry.
      if (uploadedUrls.length > 0) { // If online and at least one photo uploaded
        onOpenChange(false);
        setPhotos([]);
        setPhotoPreviews([]);
        setNotes('');
        setErrors([]);
      }

    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit proof of delivery. Please try again.",
        variant: "destructive",
      });
      console.error('POD submission error:', error);
      // Ensure processing state is reset on critical failure
      setProcessingIndex(-1);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setProcessingIndex(-1); // Ensure reset regardless of success/failure
    }
  };

  const handleCancel = () => {
    if (uploading) {
      toast({
        title: "Upload in Progress",
        description: "Please wait for the upload/save to complete before canceling.",
        variant: "destructive",
      });
      return;
    }

    onOpenChange(false);
    // Reset state when closing/canceling
    setPhotos([]);
    setPhotoPreviews([]);
    setNotes('');
    setErrors([]);
    setUploadProgress(0);
  };

  const totalSize = photos.reduce((sum, photo) => sum + photo.size, 0);
  const formattedSize = (totalSize / 1024 / 1024).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={!uploading ? onOpenChange : undefined}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Submit Proof of Delivery
            {!isOnline && (
              <span className="flex items-center gap-1 text-orange-600 text-sm font-normal">
                <WifiOff className="h-4 w-4" />
                Offline Mode
              </span>
            )}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Upload photos to confirm delivery completion (max {MAX_PHOTOS} photos)
            {!isOnline && " - Photos will be saved and uploaded when you're back online"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Job Info */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-700">
                <span className="font-medium">Customer:</span> {job.customerName}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Location:</span> {job.deliveryLocation}
              </p>
            </div>

            {/* Offline Warning Banner */}
            {!isOnline && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <WifiOff className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800">Working Offline</p>
                    <p className="text-xs text-orange-700 mt-1">
                      Your photos and notes will be saved locally and automatically uploaded when you have internet connection.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Photo Capture Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Delivery Photos ({photos.length}/{MAX_PHOTOS})
                </label>
                {totalSize > 0 && (
                  <span className="text-xs text-gray-500">
                    Total: {formattedSize}MB
                  </span>
                )}
              </div>

              {/* Upload Button */}
              {photos.length < MAX_PHOTOS && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mb-3 border-dashed border-2"
                  disabled={uploading}
                  asChild
                >
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={uploading}
                    />
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photos ({MAX_PHOTOS - photos.length} remaining)
                  </label>
                </Button>
              )}

              {/* Photo Preview Grid */}
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
                  {photoPreviews.map((preview, index) => (
                    <div
                      key={index}
                      className={`relative group aspect-square rounded-lg overflow-hidden border-2 ${
                        processingIndex === index
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={preview.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Processing Overlay */}
                      {processingIndex === index && (
                        <div className="absolute inset-0 bg-blue-600 bg-opacity-50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}

                      {/* Delete Button */}
                      {!uploading && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemovePhoto(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}

                      {/* Photo number */}
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded">
                        {index + 1}
                      </div>

                      {/* File size */}
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-2 py-0.5 rounded">
                        {(preview.originalSize / 1024).toFixed(0)}KB
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 mb-1">Some issues occurred:</p>
                      <ul className="text-xs text-red-700 space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {processingIndex >= 0 
                        ? `Processing photo ${processingIndex + 1} of ${photos.length}...`
                        : !isOnline // Display different message if offline during the upload phase
                        ? 'Saving offline...'
                        : 'Uploading...'}
                    </span>
                    <span className="text-gray-600">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                <strong>Tip:</strong> Photos will be automatically compressed to ~2MB each for faster upload.
                {!isOnline && ' Photos are saved offline and will sync automatically when connection returns.'}
              </p>
            </div>

            {/* Delivery Notes */}
            <div>
              <label htmlFor="pod-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Notes (Optional)
              </label>
              <Textarea
                id="pod-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about the delivery (e.g., issues encountered, special instructions followed, etc.)"
                rows={4}
                className="resize-none"
                disabled={uploading}
              />
              <p className="text-xs text-gray-500 mt-1">
                These notes will be visible to dispatchers and will trigger a notification.
              </p>
            </div>
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploading || photos.length === 0}
              // Change button style based on online status
              className={!isOnline ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {!isOnline ? 'Saving' : 'Uploading'} {uploadProgress}%...
                </>
              ) : (
                <>
                  {!isOnline ? ( // If offline, show "Save Offline"
                    <>
                      <WifiOff className="h-4 w-4 mr-2" />
                      Save Offline ({photos.length} {photos.length === 1 ? 'photo' : 'photos'})
                    </>
                  ) : ( // If online, show "Complete Delivery"
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Complete Delivery ({photos.length} {photos.length === 1 ? 'photo' : 'photos'})
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
