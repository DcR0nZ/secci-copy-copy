import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { base44 } from '@/api/base44Client';
import AddressAutocomplete from './AddressAutocomplete';

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
    siteContactName: '',
    siteContactPhone: '',
    deliveryNotes: ''
  });
  const [loading, setLoading] = useState(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.deliveryLocation || !formData.deliveryLatitude || !formData.deliveryLongitude) {
      toast({
        title: "Missing Location Coordinates",
        description: "Please select an address from the suggestions.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      const selectedCustomer = customers.find(c => c.id === formData.customerId);
      const selectedType = deliveryTypes.find(t => t.id === formData.deliveryTypeId);
      const selectedLocation = pickupLocations.find(l => l.id === formData.pickupLocationId);

      await base44.entities.Job.create({
        customerId: formData.customerId,
        customerName: selectedCustomer.customerName,
        deliveryTypeId: formData.deliveryTypeId,
        deliveryTypeName: selectedType.name,
        pickupLocationId: formData.pickupLocationId,
        pickupLocation: `${selectedLocation.company} - ${selectedLocation.name}`,
        deliveryLocation: formData.deliveryLocation,
        deliveryLatitude: formData.deliveryLatitude,
        deliveryLongitude: formData.deliveryLongitude,
        requestedDate: formData.requestedDate,
        siteContactName: formData.siteContactName,
        siteContactPhone: formData.siteContactPhone,
        deliveryNotes: formData.deliveryNotes || undefined,
        status: 'APPROVED'
      });

      toast({ title: "Job Created!", description: "Job created successfully." });
      onJobCreated();
      onOpenChange(false);
      
      setFormData({
        customerId: '', deliveryTypeId: '', pickupLocationId: '', deliveryLocation: '', 
        deliveryLatitude: null, deliveryLongitude: null, requestedDate: '', 
        siteContactName: '', siteContactPhone: '', deliveryNotes: ''
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create job.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => {
        if (e.target.closest('.pac-container')) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="h-[65vh] pr-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              
              <div>
                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <Select name="customerId" onValueChange={(value) => handleSelectChange('customerId', value)} value={formData.customerId} required>
                  <SelectTrigger id="customerId">
                    <SelectValue placeholder="Select a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.customerName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="deliveryTypeId" className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
                <Select name="deliveryTypeId" onValueChange={(value) => handleSelectChange('deliveryTypeId', value)} value={formData.deliveryTypeId} required>
                  <SelectTrigger id="deliveryTypeId">
                    <SelectValue placeholder="Select delivery type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="pickupLocationId" className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                <Select name="pickupLocationId" onValueChange={(value) => handleSelectChange('pickupLocationId', value)} value={formData.pickupLocationId} required>
                  <SelectTrigger id="pickupLocationId">
                    <SelectValue placeholder="Select pickup location..." />
                  </SelectTrigger>
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
                    ✓ Coordinates captured ({formData.deliveryLatitude.toFixed(4)}, {formData.deliveryLongitude.toFixed(4)})
                  </p>
                )}
                {formData.deliveryLocation && (!formData.deliveryLatitude || !formData.deliveryLongitude) && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠ Select an address from dropdown
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
  );
}