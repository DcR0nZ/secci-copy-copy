import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Calendar, Clock, Truck, MapPin, User, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';

export default function ReturnedJobAlert({ returnedJobs, user, onDismiss, onJobsUpdated }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const { toast } = useToast();

  if (!returnedJobs || returnedJobs.length === 0) return null;

  const currentJob = returnedJobs[currentIndex];

  const handleRemindLater = async () => {
    setProcessing(true);
    try {
      const remindLaterList = currentJob.returnAlertRemindLater || [];
      if (!remindLaterList.includes(user.id)) {
        await base44.entities.Job.update(currentJob.id, {
          returnAlertRemindLater: [...remindLaterList, user.id]
        });
      }
      
      toast({
        title: "Reminder Set",
        description: "You'll be reminded about this returned job next time you log in.",
      });

      moveToNext();
    } catch (error) {
      console.error('Failed to set reminder:', error);
      toast({
        title: "Error",
        description: "Failed to set reminder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReschedule = async () => {
    setProcessing(true);
    try {
      // Create a duplicate job for rescheduling
      const newJob = await base44.entities.Job.create({
        customerId: currentJob.customerId,
        customerName: currentJob.customerName,
        customerReference: currentJob.customerReference,
        deliveryTypeId: currentJob.deliveryTypeId,
        deliveryTypeName: currentJob.deliveryTypeName,
        pickupLocationId: currentJob.pickupLocationId,
        pickupLocation: currentJob.pickupLocation,
        deliveryLocation: currentJob.deliveryLocation,
        deliveryLatitude: currentJob.deliveryLatitude,
        deliveryLongitude: currentJob.deliveryLongitude,
        requestedDate: format(new Date(), 'yyyy-MM-dd'), // Set to today for rescheduling
        totalUnits: currentJob.totalUnits,
        totalSheetQty: currentJob.totalSheetQty,
        poSalesDocketNumber: currentJob.poSalesDocketNumber,
        deliveryWindow: currentJob.deliveryWindow,
        sqm: currentJob.sqm,
        weightKg: currentJob.weightKg,
        siteContactName: currentJob.siteContactName,
        siteContactPhone: currentJob.siteContactPhone,
        deliveryNotes: currentJob.deliveryNotes ? `${currentJob.deliveryNotes}\n\n[Rescheduled from returned job - Original return reason: ${currentJob.returnReason}]` : `[Rescheduled from returned job - Original return reason: ${currentJob.returnReason}]`,
        sheetList: currentJob.sheetList,
        attachments: currentJob.attachments,
        nonStandardDelivery: currentJob.nonStandardDelivery,
        status: 'APPROVED'
      });

      // Mark the original job as dismissed for this user
      const dismissedList = currentJob.returnAlertDismissedBy || [];
      await base44.entities.Job.update(currentJob.id, {
        returnAlertDismissedBy: [...dismissedList, user.id]
      });

      toast({
        title: "Job Duplicated",
        description: "A new job has been created and is ready for scheduling.",
      });

      if (onJobsUpdated) onJobsUpdated();
      moveToNext();
    } catch (error) {
      console.error('Failed to reschedule job:', error);
      toast({
        title: "Error",
        description: "Failed to create rescheduled job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    setProcessing(true);
    try {
      // Mark the job as cancelled and dismiss for this user
      const dismissedList = currentJob.returnAlertDismissedBy || [];
      await base44.entities.Job.update(currentJob.id, {
        status: 'CANCELLED',
        returnAlertDismissedBy: [...dismissedList, user.id]
      });

      toast({
        title: "Job Cancelled",
        description: "The returned job has been cancelled.",
      });

      if (onJobsUpdated) onJobsUpdated();
      moveToNext();
    } catch (error) {
      console.error('Failed to cancel job:', error);
      toast({
        title: "Error",
        description: "Failed to cancel job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const moveToNext = () => {
    if (currentIndex < returnedJobs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onDismiss();
    }
  };

  const TRUCKS = [
    { id: 'ACCO1', name: 'ACCO1' },
    { id: 'ACCO2', name: 'ACCO2' },
    { id: 'FUSO', name: 'FUSO' },
    { id: 'ISUZU', name: 'ISUZU' },
    { id: 'UD', name: 'UD' }
  ];

  const getTruckName = (truckId) => {
    const truck = TRUCKS.find(t => t.id === truckId);
    return truck ? truck.name : truckId || 'Unknown';
  };

  return (
    <>
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" hideCloseButton>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-black rounded-full">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <DialogTitle className="text-xl">Returned Job Alert</DialogTitle>
              </div>
              {returnedJobs.length > 1 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>{currentIndex + 1} of {returnedJobs.length}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentIndex === returnedJobs.length - 1}
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Job Details */}
            <div className="bg-gray-900 text-white rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">{currentJob.customerName}</h3>
              <div className="flex items-start gap-2 text-gray-300 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{currentJob.deliveryLocation}</span>
              </div>
            </div>

            {/* Return Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {currentJob.returnedDate ? format(new Date(currentJob.returnedDate), 'dd MMM yyyy') : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">
                  {currentJob.returnedDate ? format(new Date(currentJob.returnedDate), 'h:mm a') : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Truck:</span>
                <span className="font-medium">{getTruckName(currentJob.returnedTruckId)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Driver:</span>
                <span className="font-medium">{currentJob.returnedByName || currentJob.returnedBy || 'N/A'}</span>
              </div>
            </div>

            {/* Return Reason */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Reason for Return</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-900">{currentJob.returnReason || 'No reason provided'}</p>
              </div>
            </div>

            {/* Return Photos */}
            {currentJob.returnPhotos && currentJob.returnPhotos.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Site Photos</h4>
                <div className="grid grid-cols-4 gap-2">
                  {currentJob.returnPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-lg overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setViewingPhoto(photo)}
                    >
                      <img
                        src={photo}
                        alt={`Return photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleRemindLater}
              disabled={processing}
              className="w-full sm:w-auto"
            >
              Remind Me Later
            </Button>
            <Button
              variant="default"
              onClick={handleReschedule}
              disabled={processing}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              Reschedule Job
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={processing}
              className="w-full sm:w-auto"
            >
              Cancel Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full-screen photo viewer */}
      {viewingPhoto && (
        <Dialog open={true} onOpenChange={() => setViewingPhoto(null)}>
          <DialogContent className="max-w-4xl p-0 bg-black">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setViewingPhoto(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={viewingPhoto}
              alt="Return photo"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}