import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Clock,
  Package,
  Phone,
  Calendar,
  CheckCircle,
  Download,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerJobDetailsDialog({ job, open, onOpenChange }) {
  const [fullscreenImage, setFullscreenImage] = useState(null);

  if (!job) return null;

  const getStatusColor = (status) => {
    const colors = {
      'DELIVERED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-gray-100 text-gray-800',
      'RETURNED': 'bg-red-100 text-red-800',
      'IN_TRANSIT': 'bg-blue-100 text-blue-800',
      'SCHEDULED': 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const downloadImage = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Delivery Details</DialogTitle>
              <Badge className={getStatusColor(job.status)}>
                {job.status.replace('_', ' ')}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Location & Date */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Delivery Location</p>
                    <p className="text-gray-900">{job.deliveryLocation}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Requested Date</p>
                    <p className="text-gray-900">
                      {format(new Date(job.requestedDate), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                {job.deliveryWindow && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Delivery Window</p>
                      <p className="text-gray-900">{job.deliveryWindow}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Delivery Type</p>
                    <p className="text-gray-900">{job.deliveryTypeName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Site Contact */}
            {job.siteContactName && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Site Contact</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-900">{job.siteContactName}</span>
                    </div>
                    {job.siteContactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-700">{job.siteContactPhone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items */}
            {job.sheetList && job.sheetList.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Items Delivered</h3>
                  <div className="space-y-2">
                    {job.sheetList.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm py-2 border-b last:border-0">
                        <span className="text-gray-900">{item.description}</span>
                        <span className="text-gray-600 font-medium">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Notes */}
            {job.deliveryNotes && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">Delivery Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {job.deliveryNotes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* POD Notes */}
            {job.podNotes && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">Delivery Completion Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {job.podNotes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Proof of Delivery Photos */}
            {job.podFiles && job.podFiles.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Proof of Delivery
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {job.podFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={file}
                          alt={`POD ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setFullscreenImage(file)}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => downloadImage(file, `POD-${job.id}-${index + 1}.jpg`)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Photos */}
            {job.jobPhotos && job.jobPhotos.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-blue-600" />
                    Delivery Photos
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {job.jobPhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setFullscreenImage(photo.url)}
                        />
                        {photo.caption && (
                          <p className="text-xs text-gray-600 mt-1">{photo.caption}</p>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => downloadImage(photo.url, `Photo-${job.id}-${index + 1}.jpg`)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completion Info */}
            {job.status === 'DELIVERED' && job.actualCompletionTime && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">Delivery Completed</p>
                      <p className="text-sm text-green-700">
                        {format(new Date(job.actualCompletionTime), 'MMMM dd, yyyy - HH:mm')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={fullscreenImage}
            alt="Fullscreen view"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}