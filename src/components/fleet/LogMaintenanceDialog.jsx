import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { Camera, X, Upload } from 'lucide-react';

export default function LogMaintenanceDialog({ truck, user, open, onOpenChange, onSuccess }) {
  const [formData, setFormData] = useState({
    type: 'routine',
    category: 'other',
    severity: 'low',
    description: '',
    odometerReading: '',
    notes: ''
  });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleSubmit = async () => {
    if (!formData.description.trim()) {
      toast({
        title: "Error",
        description: "Please provide a description",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload photos
      const photoUrls = [];
      for (const photo of photos) {
        const { data } = await base44.integrations.Core.UploadFile({ file: photo.file });
        photoUrls.push(data.file_url);
      }

      // Create maintenance record
      await base44.entities.Maintenance.create({
        truckId: truck.id,
        truckName: truck.name,
        type: formData.type,
        category: formData.category,
        severity: formData.severity,
        description: formData.description,
        status: 'reported',
        reportedBy: user.email,
        reportedByName: user.full_name,
        reportedDate: new Date().toISOString(),
        photos: photoUrls,
        odometerReading: formData.odometerReading ? parseFloat(formData.odometerReading) : null,
        notes: formData.notes || null
      });

      toast({
        title: "Success",
        description: "Maintenance record logged successfully",
      });

      // Reset form
      setFormData({
        type: 'routine',
        category: 'other',
        severity: 'low',
        description: '',
        odometerReading: '',
        notes: ''
      });
      setPhotos([]);
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to log maintenance:', error);
      toast({
        title: "Error",
        description: "Failed to log maintenance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Maintenance - {truck?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="issue">Issue/Problem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engine">Engine</SelectItem>
                  <SelectItem value="brakes">Brakes</SelectItem>
                  <SelectItem value="tires">Tires</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="body">Body/Exterior</SelectItem>
                  <SelectItem value="fluids">Fluids</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.type === 'issue' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={formData.severity} onValueChange={(v) => setFormData({...formData, severity: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Can wait</SelectItem>
                  <SelectItem value="medium">Medium - Address soon</SelectItem>
                  <SelectItem value="high">High - Urgent</SelectItem>
                  <SelectItem value="critical">Critical - Safety issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Description *</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe the maintenance or issue..."
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Odometer Reading (km)</label>
            <Input
              type="number"
              value={formData.odometerReading}
              onChange={(e) => setFormData({...formData, odometerReading: e.target.value})}
              placeholder="Current odometer reading"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Additional Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Photos</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoCapture}
              className="hidden"
            />
            
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo.preview}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-20 object-cover rounded"
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
            )}

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Add Photos
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={uploading} className="bg-blue-600 hover:bg-blue-700">
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}