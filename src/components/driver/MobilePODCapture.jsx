import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { Camera, X, Check, Signature, Upload } from 'lucide-react';

export default function MobilePODCapture({ job, user, onComplete, onCancel }) {
  const [photos, setPhotos] = useState([]);
  const [signature, setSignature] = useState(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const { toast } = useToast();

  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const handleSignatureCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSignature({
        file,
        preview: URL.createObjectURL(file)
      });
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      // Upload photos
      const photoUrls = [];
      for (const photo of photos) {
        const { data } = await base44.integrations.Core.UploadFile({ file: photo.file });
        photoUrls.push(data.file_url);
      }

      // Upload signature if provided
      let signatureUrl = null;
      if (signature) {
        const { data } = await base44.integrations.Core.UploadFile({ file: signature.file });
        signatureUrl = data.file_url;
      }

      // Submit POD via mobile API
      const response = await base44.functions.invoke('mobileSubmitPOD', {
        jobId: job.id,
        photos: photoUrls,
        signature: signatureUrl,
        notes,
        userId: user.id,
        userName: user.full_name
      });

      if (response.data.success) {
        toast({
          title: "POD Submitted",
          description: "Proof of delivery has been recorded successfully.",
        });
        onComplete();
      }
    } catch (error) {
      console.error('POD submission failed:', error);
      toast({
        title: "Error",
        description: "Failed to submit proof of delivery. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-white hover:bg-blue-700"
          >
            <X className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Proof of Delivery</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Job Info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-1">{job.customerName}</h3>
            <p className="text-sm text-gray-600">{job.deliveryLocation}</p>
          </CardContent>
        </Card>

        {/* Photo Capture */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Delivery Photos
            </h3>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoCapture}
              className="hidden"
            />

            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={photo.preview}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
          </CardContent>
        </Card>

        {/* Signature Capture */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Signature className="h-5 w-5" />
              Customer Signature
            </h3>
            
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleSignatureCapture}
              className="hidden"
            />

            {signature ? (
              <div className="relative">
                <img
                  src={signature.preview}
                  alt="Signature"
                  className="w-full h-32 object-contain bg-white border-2 border-gray-300 rounded-lg"
                />
                <button
                  onClick={() => {
                    URL.revokeObjectURL(signature.preview);
                    setSignature(null);
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => signatureInputRef.current?.click()}
              >
                <Signature className="h-4 w-4 mr-2" />
                Capture Signature
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Delivery Notes</h3>
            <Textarea
              placeholder="Add any notes about the delivery..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
          onClick={handleSubmit}
          disabled={uploading || (photos.length === 0 && !signature)}
        >
          {uploading ? (
            <>
              <Upload className="h-5 w-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Check className="h-5 w-5 mr-2" />
              Complete Delivery
            </>
          )}
        </Button>
      </div>
    </div>
  );
}