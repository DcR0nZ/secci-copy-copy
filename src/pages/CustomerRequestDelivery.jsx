import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";
import { Upload, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';


export default function CustomerRequestDeliveryPage() {
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  const [pickupLocations, setPickupLocations] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [formData, setFormData] = useState({
    deliveryTypeId: '',
    pickupLocationId: '',
    deliveryLocation: '',
    deliveryLatitude: null,
    deliveryLongitude: null,
    requestedDate: '',
    totalUnits: '',
    poSalesDocketNumber: '',
    deliveryWindow: '',
    sqm: '',
    weightKg: '',
    siteContactName: '',
    siteContactPhone: '',
    deliveryNotes: '',
    nonStandardDelivery: {
      longWalk: false,
      longWalkDistance: '',
      passUp: false,
      passDown: false,
      stairs: false,
      stairsCount: '',
      fourManNeeded: false,
      moreThan2000Sqm: false,
      zoneC: false,
      other: false,
      otherDetails: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const [types, locations] = await Promise.all([
        base44.entities.DeliveryType.list(),
        base44.entities.PickupLocation.filter({ status: 'ACTIVE' })
      ]);
      setDeliveryTypes(types);
      setPickupLocations(locations);
    };
    fetchData();
  }, []);

  const handleAttachmentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingAttachment(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const fileUrls = results.map(r => r.file_url);
      
      setAttachments(prev => [...prev, ...fileUrls]);
      
      toast({
        title: "Files Uploaded",
        description: `${files.length} file(s) uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to upload attachments:", error);
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      if (name.startsWith('nonStandardDelivery.')) {
        const nonStandardFieldName = name.split('.')[1];
        const updatedNonStandard = { ...prev.nonStandardDelivery };
        updatedNonStandard[nonStandardFieldName] = type === 'checkbox' ? checked : value;

        if (type === 'checkbox' && !checked) {
          if (nonStandardFieldName === 'longWalk') {
            updatedNonStandard.longWalkDistance = '';
          } else if (nonStandardFieldName === 'stairs') {
            updatedNonStandard.stairsCount = '';
          } else if (nonStandardFieldName === 'other') {
            updatedNonStandard.otherDetails = '';
          }
        }
        return {
          ...prev,
          nonStandardDelivery: updatedNonStandard
        };
      } else {
        const updated = {
          ...prev,
          [name]: type === 'checkbox' ? checked : value
        };
        
        if (name === 'sqm') {
          const sqmValue = parseFloat(value);
          if (!isNaN(sqmValue) && sqmValue >= 2000) {
            updated.nonStandardDelivery = {
              ...prev.nonStandardDelivery,
              moreThan2000Sqm: true,
              fourManNeeded: true
            };
          } else if (isNaN(sqmValue) || sqmValue < 2000) {
            updated.nonStandardDelivery = {
              ...prev.nonStandardDelivery,
              moreThan2000Sqm: false,
              fourManNeeded: false
            };
          }
        }
        
        return updated;
      }
    });
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };



  const selectedDeliveryType = deliveryTypes.find(t => t.id === formData.deliveryTypeId);
  const isUnitsDelivery = selectedDeliveryType?.name?.toLowerCase().includes('units');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      const selectedType = deliveryTypes.find(t => t.id === formData.deliveryTypeId);
      const selectedLocation = pickupLocations.find(l => l.id === formData.pickupLocationId);
      
      const hasNonStandard = Object.values(formData.nonStandardDelivery).some(val => 
        (typeof val === 'boolean' && val === true) || 
        (typeof val === 'string' && val.trim() !== '')
      );

      const newJob = await base44.entities.Job.create({
        customerId: currentUser.customerId,
        customerName: currentUser.customerName,
        deliveryTypeId: formData.deliveryTypeId,
        deliveryTypeName: selectedType.name,
        pickupLocationId: formData.pickupLocationId,
        pickupLocation: selectedLocation ? `${selectedLocation.company} - ${selectedLocation.name}` : undefined,
        deliveryLocation: formData.deliveryLocation,
        deliveryLatitude: formData.deliveryLatitude,
        deliveryLongitude: formData.deliveryLongitude,
        requestedDate: formData.requestedDate,
        totalUnits: formData.totalUnits ? Number(formData.totalUnits) : undefined,
        poSalesDocketNumber: formData.poSalesDocketNumber || undefined,
        deliveryWindow: formData.deliveryWindow || undefined,
        sqm: formData.sqm ? Number(formData.sqm) : undefined,
        weightKg: formData.weightKg ? Number(formData.weightKg) : undefined,
        siteContactName: formData.siteContactName,
        siteContactPhone: formData.siteContactPhone,
        deliveryNotes: formData.deliveryNotes || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        status: 'PENDING_APPROVAL',
        nonStandardDelivery: hasNonStandard ? {
          longWalk: formData.nonStandardDelivery.longWalk || false,
          longWalkDistance: formData.nonStandardDelivery.longWalkDistance ? Number(formData.nonStandardDelivery.longWalkDistance) : undefined,
          passUp: formData.nonStandardDelivery.passUp || false,
          passDown: formData.nonStandardDelivery.passDown || false,
          stairs: formData.nonStandardDelivery.stairs || false,
          stairsCount: formData.nonStandardDelivery.stairsCount ? Number(formData.nonStandardDelivery.stairsCount) : undefined,
          fourManNeeded: formData.nonStandardDelivery.fourManNeeded || false,
          moreThan2000Sqm: formData.nonStandardDelivery.moreThan2000Sqm || false,
          zoneC: formData.nonStandardDelivery.zoneC || false,
          other: formData.nonStandardDelivery.other || false,
          otherDetails: formData.nonStandardDelivery.otherDetails || undefined
        } : undefined
      });

      toast({
        title: "Success!",
        description: "Your delivery request has been submitted and is ready for scheduling.",
      });

      setFormData({
        deliveryTypeId: '', pickupLocationId: '', deliveryLocation: '', 
        deliveryLatitude: null, deliveryLongitude: null,
        requestedDate: '', 
        totalUnits: '', poSalesDocketNumber: '', deliveryWindow: '',
        sqm: '', weightKg: '', siteContactName: '', siteContactPhone: '', deliveryNotes: '',
        nonStandardDelivery: {
          longWalk: false, longWalkDistance: '', passUp: false, passDown: false, stairs: false,
          stairsCount: '', fourManNeeded: false, moreThan2000Sqm: false, zoneC: false, other: false,
          otherDetails: ''
        }
      });
      setAttachments([]);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to create job:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Request a New Delivery</h1>
      <p className="text-gray-600 mb-6">Fill out the details below to schedule a new plasterboard delivery.</p>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="deliveryTypeId" className="block text-sm font-medium text-gray-700 mb-1">Delivery Type *</label>
                <Select name="deliveryTypeId" onValueChange={(value) => handleSelectChange('deliveryTypeId', value)} value={formData.deliveryTypeId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isUnitsDelivery && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Number of Units</label>
                  <Input name="totalUnits" type="number" value={formData.totalUnits} onChange={handleChange} placeholder="e.g., 150" />
                </div>
              )}

              <div>
                <label htmlFor="pickupLocationId" className="block text-sm font-medium text-gray-700 mb-1">Pickup Location *</label>
                <Select name="pickupLocationId" onValueChange={(value) => handleSelectChange('pickupLocationId', value)} value={formData.pickupLocationId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pickup location..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {pickupLocations.map(location => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.company} - {location.name}
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              {formData.pickupLocationId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO/Sales/Docket Number</label>
                  <Input name="poSalesDocketNumber" value={formData.poSalesDocketNumber} onChange={handleChange} placeholder="e.g., PO12345 or DOC789" />
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="deliveryLocation" className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
              <Input
                id="deliveryLocation"
                name="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={handleChange}
                placeholder="Enter delivery address"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="requestedDate" className="block text-sm font-medium text-gray-700 mb-1">Requested Date *</label>
                <Input id="requestedDate" name="requestedDate" type="date" value={formData.requestedDate} onChange={handleChange} required />
              </div>

              {formData.requestedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Window</label>
                  <Select name="deliveryWindow" onValueChange={(value) => handleSelectChange('deliveryWindow', value)} value={formData.deliveryWindow}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery window..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First AM (6-9am)">First AM (6-9am)</SelectItem>
                      <SelectItem value="Second AM (9am-12pm)">Second AM (9am-12pm)</SelectItem>
                      <SelectItem value="Lunch (12-3pm)">Lunch (12-3pm)</SelectItem>
                      <SelectItem value="Afternoon (3-6pm)">Afternoon (3-6pm)</SelectItem>
                      <SelectItem value="Any Time">Any Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label htmlFor="sqm" className="block text-sm font-medium text-gray-700 mb-1">Total Square Meters (m²)</label>
                <Input id="sqm" name="sqm" type="number" value={formData.sqm} onChange={handleChange} placeholder="e.g., 850" />
              </div>
              <div>
                <label htmlFor="weightKg" className="block text-sm font-medium text-gray-700 mb-1">Total Weight (kg)</label>
                <Input id="weightKg" name="weightKg" type="number" value={formData.weightKg} onChange={handleChange} placeholder="e.g., 12000" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="siteContactName" className="block text-sm font-medium text-gray-700 mb-1">Site Contact Name *</label>
                <Input id="siteContactName" name="siteContactName" value={formData.siteContactName} onChange={handleChange} placeholder="e.g., John Smith" required />
              </div>

              <div>
                <label htmlFor="siteContactPhone" className="block text-sm font-medium text-gray-700 mb-1">Site Contact Phone *</label>
                <Input id="siteContactPhone" name="siteContactPhone" value={formData.siteContactPhone} onChange={handleChange} placeholder="e.g., 0412 345 678" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Non-Standard Delivery Requirements (Optional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="nonStandardDelivery.longWalk"
                    name="nonStandardDelivery.longWalk"
                    checked={formData.nonStandardDelivery.longWalk}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nonStandardDelivery.longWalk" className="text-sm font-medium text-gray-700">
                    Long Walk
                  </label>
                </div>
                {formData.nonStandardDelivery.longWalk && (
                  <Input
                    type="number"
                    name="nonStandardDelivery.longWalkDistance"
                    placeholder="Distance in meters"
                    value={formData.nonStandardDelivery.longWalkDistance}
                    onChange={handleChange}
                    className="col-span-1 sm:col-start-2"
                  />
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="nonStandardDelivery.passUp"
                    name="nonStandardDelivery.passUp"
                    checked={formData.nonStandardDelivery.passUp}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nonStandardDelivery.passUp" className="text-sm font-medium text-gray-700">
                    Pass Up
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="nonStandardDelivery.passDown"
                    name="nonStandardDelivery.passDown"
                    checked={formData.nonStandardDelivery.passDown}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nonStandardDelivery.passDown" className="text-sm font-medium text-gray-700">
                    Pass Down
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="nonStandardDelivery.stairs"
                    name="nonStandardDelivery.stairs"
                    checked={formData.nonStandardDelivery.stairs}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nonStandardDelivery.stairs" className="text-sm font-medium text-gray-700">
                    Stairs
                  </label>
                </div>
                {formData.nonStandardDelivery.stairs && (
                  <Input
                    type="number"
                    name="nonStandardDelivery.stairsCount"
                    placeholder="Number of stairs"
                    value={formData.nonStandardDelivery.stairsCount}
                    onChange={handleChange}
                    className="col-span-1 sm:col-start-2"
                  />
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="nonStandardDelivery.fourManNeeded"
                    name="nonStandardDelivery.fourManNeeded"
                    checked={formData.nonStandardDelivery.fourManNeeded}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nonStandardDelivery.fourManNeeded" className="text-sm font-medium text-gray-700">
                    Four Man Needed
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="nonStandardDelivery.moreThan2000Sqm"
                    name="nonStandardDelivery.moreThan2000Sqm"
                    checked={formData.nonStandardDelivery.moreThan2000Sqm}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nonStandardDelivery.moreThan2000Sqm" className="text-sm font-medium text-gray-700">
                    More than 2000m²
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="nonStandardDelivery.zoneC"
                    name="nonStandardDelivery.zoneC"
                    checked={formData.nonStandardDelivery.zoneC}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nonStandardDelivery.zoneC" className="text-sm font-medium text-gray-700">
                    Zone C
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="nonStandardDelivery.other"
                    name="nonStandardDelivery.other"
                    checked={formData.nonStandardDelivery.other}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nonStandardDelivery.other" className="text-sm font-medium text-gray-700">
                    Other (Please specify)
                  </label>
                </div>
                {formData.nonStandardDelivery.other && (
                  <Textarea
                    name="nonStandardDelivery.otherDetails"
                    placeholder="Provide details for other non-standard requirements"
                    value={formData.nonStandardDelivery.otherDetails}
                    onChange={handleChange}
                    className="col-span-full sm:col-span-2"
                  />
                )}
              </div>
            </div>

            <div>
              <label htmlFor="deliveryNotes" className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes</label>
              <Textarea id="deliveryNotes" name="deliveryNotes" value={formData.deliveryNotes} onChange={handleChange} placeholder="e.g., Site access via Gate 3. Call upon arrival." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (Optional)</label>
              <p className="text-xs text-gray-500 mb-2">Upload site plans, floor plans, or other relevant documents</p>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingAttachment}
                  asChild
                >
                  <label className="cursor-pointer flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      multiple
                      onChange={handleAttachmentUpload}
                      className="hidden"
                      disabled={uploadingAttachment}
                    />
                    {uploadingAttachment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </>
                    )}
                  </label>
                </Button>
                
                {attachments.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {attachments.map((url, index) => {
                      const urlParts = url.split('/');
                      const fileNameWithExtension = urlParts[urlParts.length - 1];
                      const fileName = decodeURIComponent(fileNameWithExtension) || `File ${index + 1}`;
                      return (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm text-gray-700 truncate flex-1">{fileName}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(index)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 ml-2"
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-6">
            <Button type="submit" disabled={loading || uploadingAttachment} className="w-full md:w-auto">
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}