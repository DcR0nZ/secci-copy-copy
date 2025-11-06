import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Loader2, FileText, Sparkles, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { extractJobDataWithGemini } from '@/functions/extractJobDataWithGemini';
import { sendToZapier } from '@/functions/sendToZapier';
import AddressAutocomplete from './AddressAutocomplete';

const TRUCKS = [
  { id: 'ACCO1', name: 'ACCO1' },
  { id: 'ACCO2', name: 'ACCO2' },
  { id: 'FUSO', name: 'FUSO' },
  { id: 'ISUZU', name: 'ISUZU' },
  { id: 'UD', name: 'UD' }
];

const DELIVERY_WINDOWS = [
  { id: 'first-am', label: '6-8am (1st AM)' },
  { id: 'second-am', label: '8-10am (2nd AM)' },
  { id: 'lunch', label: '10am-12pm (LUNCH)' },
  { id: 'first-pm', label: '12-2pm (1st PM)' },
  { id: 'second-pm', label: '2-4pm (2nd PM)' }
];

export default function CreateJobForm({ open, onOpenChange, onJobCreated }) {
  const [customers, setCustomers] = useState([]);
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  const [pickupLocations, setPickupLocations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    customerId: '',
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
    scheduleTruckId: '',
    scheduleDate: '',
    scheduleTimeSlot: '',
    scheduleSlotPosition: '1',
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
  const [docketNumbers, setDocketNumbers] = useState([]);
  const [docketNotes, setDocketNotes] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [extractionDocument, setExtractionDocument] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [extractedDocumentUrl, setExtractedDocumentUrl] = useState(null);
  const [useZapierExtraction, setUseZapierExtraction] = useState(false);
  const [extractionSessionId, setExtractionSessionId] = useState(null);
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setLoading(true);
        const [customers, types, locations, user] = await Promise.all([
          base44.entities.Customer.filter({ status: 'ACTIVE' }),
          base44.entities.DeliveryType.list(),
          base44.entities.PickupLocation.filter({ status: 'ACTIVE' }),
          base44.auth.me()
        ]);
        setCustomers(customers);
        setDeliveryTypes(types);
        setPickupLocations(locations);
        setCurrentUser(user);
        setLoading(false);
      };
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (formData.customerId && customers.length > 0 && pickupLocations.length > 0) {
      const selectedCustomer = customers.find(c => c.id === formData.customerId);
      
      if (selectedCustomer) {
        const updates = {};
        
        if (selectedCustomer.regularSiteContactName && !formData.siteContactName) {
          updates.siteContactName = selectedCustomer.regularSiteContactName;
        }
        
        if (selectedCustomer.regularSiteContactNumber && !formData.siteContactPhone) {
          updates.siteContactPhone = selectedCustomer.regularSiteContactNumber;
        }
        
        if (selectedCustomer.deliveryInstructions && !formData.deliveryNotes) {
          updates.deliveryNotes = selectedCustomer.deliveryInstructions;
        }
        
        if (selectedCustomer.usualSupplier && !formData.pickupLocationId) {
          const matchingLocation = pickupLocations.find(
            loc => loc.sheetType?.toLowerCase() === selectedCustomer.usualSupplier.toLowerCase()
          );
          if (matchingLocation) {
            updates.pickupLocationId = matchingLocation.id;
          }
        }
        
        if (Object.keys(updates).length > 0) {
          setFormData(prev => ({ ...prev, ...updates }));
        }
      }
    }
  }, [formData.customerId, customers, pickupLocations, formData.siteContactName, formData.siteContactPhone, formData.deliveryNotes, formData.pickupLocationId]);

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF or image file (JPG, PNG).",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    setExtractionDocument(file);
    setExtractedData(null);
    setExtractedDocumentUrl(null);
    e.target.value = '';
    setExtractionSessionId(null);
  };

  const handleRemoveDocument = () => {
    setExtractionDocument(null);
    setExtractedData(null);
    setExtractedDocumentUrl(null);
    setExtractionSessionId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      
      if (name === 'sqm') {
        const sqmValue = parseFloat(newValue);
        const currentNonStandard = { ...prev.nonStandardDelivery };

        if (!isNaN(sqmValue) && sqmValue >= 2000) {
          currentNonStandard.moreThan2000Sqm = true;
          currentNonStandard.fourManNeeded = true;
        } else if (isNaN(sqmValue) || sqmValue < 2000) {
          currentNonStandard.moreThan2000Sqm = false;
          currentNonStandard.fourManNeeded = false;
        }
        updated.nonStandardDelivery = currentNonStandard;
      }
      
      if (name === 'totalUnits') {
        const numUnits = parseInt(value) || 0;
        if (numUnits > 0 && numUnits <= 20) {
          const currentDockets = docketNumbers.slice(0, numUnits);
          const currentNotes = docketNotes.slice(0, numUnits);

          setDocketNumbers([...currentDockets, ...Array(Math.max(0, numUnits - currentDockets.length)).fill('')]);
          setDocketNotes([...currentNotes, ...Array(Math.max(0, numUnits - currentNotes.length)).fill('')]);
        } else {
          setDocketNumbers([]);
          setDocketNotes([]);
        }
      }
      
      return updated;
    });
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInteractOutside = (e) => {
    const target = e.target;
    if (target.closest('.pac-container')) {
      e.preventDefault();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.deliveryLocation || !formData.deliveryLatitude || !formData.deliveryLongitude) {
      toast({
        title: "Missing Location Coordinates",
        description: "Please select an address from the suggestions to ensure accurate GPS coordinates.",
        variant: "destructive",
      });
      return;
    }
    
    toast({ title: "Job Created!", description: "This is a simplified version." });
    onOpenChange(false);
  };

  const selectedDeliveryType = deliveryTypes.find(t => t.id === formData.deliveryTypeId);
  const isUnitsDelivery = selectedDeliveryType?.name?.toLowerCase().includes('unit');
  const canScheduleDirectly = currentUser && (currentUser.role === 'admin' || currentUser.appRole === 'dispatcher');
  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  if (!currentUser) return null;

  return (
    <>
      <Dialog open={open && !showConfirmation} onOpenChange={onOpenChange}>
        <DialogContent 
          className="sm:max-w-[600px]"
          onInteractOutside={handleInteractOutside}
        >
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <ScrollArea className="h-[65vh] pr-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                
                <div>
                  <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <Select name="customerId" onValueChange={(value) => handleSelectChange('customerId', value)} value={formData.customerId} required>
                    <SelectTrigger id="customerId"><SelectValue placeholder="Select a customer..." /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customerName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="deliveryTypeId" className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
                  <Select name="deliveryTypeId" onValueChange={(value) => handleSelectChange('deliveryTypeId', value)} value={formData.deliveryTypeId} required>
                    <SelectTrigger id="deliveryTypeId"><SelectValue placeholder="Select delivery type..." /></SelectTrigger>
                    <SelectContent>
                      {deliveryTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="pickupLocationId" className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                  <Select name="pickupLocationId" onValueChange={(value) => handleSelectChange('pickupLocationId', value)} value={formData.pickupLocationId} required>
                    <SelectTrigger id="pickupLocationId"><SelectValue placeholder="Select pickup location..." /></SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {pickupLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.company} - {l.name}</SelectItem>)}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="deliveryLocation" className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <AddressAutocomplete
                    id="deliveryLocation"
                    value={formData.deliveryLocation}
                    onChange={(data) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        deliveryLocation: data.address,
                        deliveryLatitude: data.latitude,
                        deliveryLongitude: data.longitude
                      }));
                    }}
                    placeholder="Start typing address..."
                    required
                  />
                  {formData.deliveryLatitude && formData.deliveryLongitude && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Location coordinates captured ({formData.deliveryLatitude.toFixed(4)}, {formData.deliveryLongitude.toFixed(4)})
                    </p>
                  )}
                  {formData.deliveryLocation && (!formData.deliveryLatitude || !formData.deliveryLongitude) && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠ Please select an address from the dropdown to capture GPS coordinates
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="requestedDate" className="block text-sm font-medium text-gray-700 mb-1">Requested Date</label>
                  <Input id="requestedDate" name="requestedDate" type="date" value={formData.requestedDate} onChange={handleChange} required />
                </div>

                <div>
                  <label htmlFor="siteContactName" className="block text-sm font-medium text-gray-700 mb-1">Site Contact Name</label>
                  <Input id="siteContactName" name="siteContactName" value={formData.siteContactName} onChange={handleChange} placeholder="e.g., John Smith" required />
                </div>

                <div>
                  <label htmlFor="siteContactPhone" className="block text-sm font-medium text-gray-700 mb-1">Site Contact Phone</label>
                  <Input id="siteContactPhone" name="siteContactPhone" value={formData.siteContactPhone} onChange={handleChange} placeholder="e.g., 0412 345 678" required />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="deliveryNotes" className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes</label>
                  <Textarea id="deliveryNotes" name="deliveryNotes" value={formData.deliveryNotes} onChange={handleChange} placeholder="e.g., Site access via Gate 3." />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Job'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Confirm Job Details</DialogTitle>
          </DialogHeader>
          <p>Confirmation content</p>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setShowConfirmation(false)} disabled={loading}>
              Go Back
            </Button>
            <Button type="button" onClick={() => {}} disabled={loading}>
              {loading ? 'Creating...' : 'Confirm & Create Job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}