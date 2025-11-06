import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";
import { Plus, Upload, Download, Building2, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import CustomerCard from '../components/customers/CustomerCard';
import CustomerDetailsModal from '../components/customers/CustomerDetailsModal';

const STATUS_GROUPS = [
  { id: 'ACTIVE', label: 'Active Customers', color: 'bg-green-100' },
  { id: 'INACTIVE', label: 'Inactive Customers', color: 'bg-gray-100' }
];

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [pickupLocations, setPickupLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDetailsOpen, setDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    customerCode: '',
    customerName: '',
    contactPerson: '',
    contactNumber: '',
    contactEmail: '',
    usualSupplier: '',
    deliveryInstructions: '',
    buildingPlasteringCompany: '',
    regularSiteContactName: '',
    regularSiteContactNumber: '',
    status: 'ACTIVE'
  });
  const { toast } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const [allCustomers, allLocations] = await Promise.all([
        base44.entities.Customer.list('-created_date'),
        base44.entities.PickupLocation.list()
      ]);
      setCustomers(allCustomers);
      setPickupLocations(allLocations);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load customers.",
        variant: "destructive",
      });
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await base44.auth.me();
        
        if (user.role !== 'admin' && user.appRole !== 'dispatcher' && user.appRole !== 'manager' && user.appRole !== 'outreach') {
          window.location.href = createPageUrl('Dashboard');
          return;
        }
        
        fetchCustomers();
      } catch (error) {
        console.error('Error checking access:', error);
        window.location.href = createPageUrl('Dashboard');
      }
    };
    
    checkAccess();
  }, []);

  const getUniqueSheetTypes = () => {
    const sheetTypes = pickupLocations
      .map(loc => loc.sheetType)
      .filter(Boolean);
    return [...new Set(sheetTypes)];
  };

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        customerCode: customer.customerCode || '',
        customerName: customer.customerName || '',
        contactPerson: customer.contactPerson || '',
        contactNumber: customer.contactNumber || '',
        contactEmail: customer.contactEmail || '',
        usualSupplier: customer.usualSupplier || '',
        deliveryInstructions: customer.deliveryInstructions || '',
        buildingPlasteringCompany: customer.buildingPlasteringCompany || '',
        regularSiteContactName: customer.regularSiteContactName || '',
        regularSiteContactNumber: customer.regularSiteContactNumber || '',
        status: customer.status
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        customerCode: '',
        customerName: '',
        contactPerson: '',
        contactNumber: '',
        contactEmail: '',
        usualSupplier: '',
        deliveryInstructions: '',
        buildingPlasteringCompany: '',
        regularSiteContactName: '',
        regularSiteContactNumber: '',
        status: 'ACTIVE'
      });
    }
    setDialogOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await base44.entities.Customer.update(editingCustomer.id, formData);
        toast({
          title: "Customer Updated",
          description: "The customer has been successfully updated.",
        });
      } else {
        await base44.entities.Customer.create(formData);
        toast({
          title: "Customer Created",
          description: "The new customer has been successfully created.",
        });
      }
      setDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save customer. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save customer:", error);
    }
  };

  const handleCustomerUpdate = async (customerId, updateData) => {
    try {
      await base44.entities.Customer.update(customerId, updateData);
      toast({
        title: "Customer Updated",
        description: "Customer information has been successfully updated.",
      });
      fetchCustomers();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer.",
        variant: "destructive",
      });
      console.error("Failed to update customer:", error);
    }
  };

  const handleCustomerDelete = async (customerId) => {
    try {
      await base44.entities.Customer.delete(customerId);
      toast({
        title: "Customer Deleted",
        description: "Customer has been successfully deleted.",
      });
      fetchCustomers();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer.",
        variant: "destructive",
      });
      console.error("Failed to delete customer:", error);
    }
  };

  const handleCardClick = (customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  };

  const getCustomersForStatus = (status) => {
    return customers.filter(c => c.status === status);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  customerCode: { type: "string" },
                  customerName: { type: "string" },
                  contactPerson: { type: "string" },
                  contactNumber: { type: "string" },
                  contactEmail: { type: "string" },
                  usualSupplier: { type: "string" },
                  deliveryInstructions: { type: "string" },
                  buildingPlasteringCompany: { type: "string" },
                  regularSiteContactName: { type: "string" },
                  regularSiteContactNumber: { type: "string" }
                },
                required: ["customerCode", "customerName", "contactPerson", "contactNumber", "contactEmail"]
              }
            }
          }
        }
      });

      if (result.status === 'error') {
        throw new Error(result.details || 'Failed to parse CSV file');
      }

      let customersData = null;

      if (result.output) {
        if (Array.isArray(result.output)) {
          customersData = result.output;
        } else if (result.output.data && Array.isArray(result.output.data)) {
          customersData = result.output.data;
        } else if (result.output.customers && Array.isArray(result.output.customers)) {
          customersData = result.output.customers;
        }
      }

      if (!customersData || !Array.isArray(customersData)) {
        console.error('Unexpected output format:', result.output);
        throw new Error('Invalid data format in CSV file. Please ensure your CSV matches the template format.');
      }

      if (customersData.length === 0) {
        throw new Error('No valid customer records found in CSV file. Please check your data.');
      }

      const customersToCreate = customersData.map(c => ({
        customerCode: c.customerCode,
        customerName: c.customerName,
        contactPerson: c.contactPerson,
        contactNumber: c.contactNumber,
        contactEmail: c.contactEmail,
        usualSupplier: c.usualSupplier || '',
        deliveryInstructions: c.deliveryInstructions || '',
        buildingPlasteringCompany: c.buildingPlasteringCompany || '',
        regularSiteContactName: c.regularSiteContactName || '',
        regularSiteContactNumber: c.regularSiteContactNumber || '',
        status: 'ACTIVE'
      }));

      await base44.entities.Customer.bulkCreate(customersToCreate);

      toast({
        title: "Bulk Upload Successful",
        description: `Successfully imported ${customersToCreate.length} customers.`,
      });

      fetchCustomers();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to import customers from CSV.",
        variant: "destructive",
      });
      console.error("Bulk upload error:", error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const csvContent = "customerCode,customerName,contactPerson,contactNumber,contactEmail,usualSupplier,deliveryInstructions,buildingPlasteringCompany,regularSiteContactName,regularSiteContactNumber\nCUST001,ABC Construction,John Smith,07 1234 5678,john@abc.com,Plasterboard Pty Ltd,Gate 3 access only,ABC Plastering,Jane Doe,07 1111 2222\nCUST002,XYZ Builders,Mike Johnson,07 8765 4321,mike@xyz.com,Boral Gypsum,Call on arrival,XYZ Building,Sarah Lee,07 3333 4444";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Header - Sticky */}
        <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900">Customers</h1>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
          <p className="text-sm text-gray-600 mb-2">Manage customer companies and their information</p>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="flex-1">
              <Download className="h-4 w-4 mr-1" />
              Template
            </Button>
            <Button variant="outline" size="sm" disabled={uploading} asChild className="flex-1">
              <label className="cursor-pointer flex items-center justify-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Upload className="h-4 w-4 mr-1" />
                {uploading ? 'Uploading...' : 'Upload CSV'}
              </label>
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="px-4 py-4 pb-24">
          <div className="space-y-4">
            {STATUS_GROUPS.map((statusGroup) => {
              const statusCustomers = getCustomersForStatus(statusGroup.id);
              
              return (
                <Card key={statusGroup.id} className={`${statusGroup.color} border-2`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-indigo-600" />
                        <span>{statusGroup.label}</span>
                      </span>
                      <Badge variant="secondary" className="bg-white">
                        {statusCustomers.length} {statusCustomers.length === 1 ? 'customer' : 'customers'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3" style={{ touchAction: 'pan-y' }}>
                      {statusCustomers.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No customers in this category</p>
                      ) : (
                        statusCustomers.map((customer) => (
                          <CustomerCard
                            key={customer.id}
                            customer={customer}
                            onClick={() => handleCardClick(customer)}
                          />
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <CustomerDetailsModal
          customer={selectedCustomer}
          pickupLocations={pickupLocations}
          open={isDetailsOpen}
          onOpenChange={setDetailsOpen}
          onUpdate={handleCustomerUpdate}
          onDelete={handleCustomerDelete}
        />

        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 py-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Code *</label>
                  <Input
                    name="customerCode"
                    value={formData.customerCode}
                    onChange={handleChange}
                    placeholder="e.g., CUST001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <Input
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    placeholder="e.g., ABC Construction"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
                  <Input
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="e.g., John Smith"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                  <Input
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    placeholder="e.g., 07 1234 5678"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                  <Input
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    placeholder="e.g., contact@abc.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usual Supplier</label>
                  <Select
                    value={formData.usualSupplier}
                    onValueChange={(value) => handleSelectChange('usualSupplier', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {getUniqueSheetTypes().map(sheetType => (
                          <SelectItem key={sheetType} value={sheetType}>
                            {sheetType}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building/Plastering Company</label>
                  <Input
                    name="buildingPlasteringCompany"
                    value={formData.buildingPlasteringCompany}
                    onChange={handleChange}
                    placeholder="e.g., ABC Plastering"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Regular Site Contact Name</label>
                  <Input
                    name="regularSiteContactName"
                    value={formData.regularSiteContactName}
                    onChange={handleChange}
                    placeholder="e.g., Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Regular Site Contact Number</label>
                  <Input
                    name="regularSiteContactNumber"
                    value={formData.regularSiteContactNumber}
                    onChange={handleChange}
                    placeholder="e.g., 07 1111 2222"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Instructions</label>
                  <Textarea
                    name="deliveryInstructions"
                    value={formData.deliveryInstructions}
                    onChange={handleChange}
                    placeholder="e.g., Use Gate 3 access, call on arrival"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">
                  {editingCustomer ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sticky Header */}
      <div className="flex-shrink-0 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage customer companies and their information</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={downloadTemplate} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
            <Button variant="outline" disabled={uploading} asChild className="flex-1 sm:flex-none">
              <label className="cursor-pointer flex items-center justify-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Bulk Upload CSV'}
              </label>
            </Button>
            <Button onClick={() => handleOpenDialog()} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch" style={{ touchAction: 'pan-y' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {STATUS_GROUPS.map((statusGroup) => {
            const statusCustomers = getCustomersForStatus(statusGroup.id);
            
            return (
              <Card key={statusGroup.id} className={`${statusGroup.color} border-2`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                      <span>{statusGroup.label}</span>
                    </span>
                    <Badge variant="secondary" className="bg-white">
                      {statusCustomers.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statusCustomers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No customers in this category</p>
                    ) : (
                      statusCustomers.map((customer) => (
                        <CustomerCard
                          key={customer.id}
                          customer={customer}
                          onClick={() => handleCardClick(customer)}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <CustomerDetailsModal
        customer={selectedCustomer}
        pickupLocations={pickupLocations}
        open={isDetailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={handleCustomerUpdate}
        onDelete={handleCustomerDelete}
      />

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Code *</label>
                <Input
                  name="customerCode"
                  value={formData.customerCode}
                  onChange={handleChange}
                  placeholder="e.g., CUST001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <Input
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="e.g., ABC Construction"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
                <Input
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  placeholder="e.g., John Smith"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                <Input
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="e.g., 07 1234 5678"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                <Input
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  placeholder="e.g., contact@abc.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usual Supplier</label>
                <Select
                  value={formData.usualSupplier}
                  onValueChange={(value) => handleSelectChange('usualSupplier', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px]">
                      {getUniqueSheetTypes().map(sheetType => (
                        <SelectItem key={sheetType} value={sheetType}>
                          {sheetType}
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building/Plastering Company</label>
                <Input
                  name="buildingPlasteringCompany"
                  value={formData.buildingPlasteringCompany}
                  onChange={handleChange}
                  placeholder="e.g., ABC Plastering"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regular Site Contact Name</label>
                <Input
                  name="regularSiteContactName"
                  value={formData.regularSiteContactName}
                  onChange={handleChange}
                  placeholder="e.g., Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regular Site Contact Number</label>
                <Input
                  name="regularSiteContactNumber"
                  value={formData.regularSiteContactNumber}
                  onChange={handleChange}
                  placeholder="e.g., 07 1111 2222"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Instructions</label>
                <Textarea
                  name="deliveryInstructions"
                  value={formData.deliveryInstructions}
                  onChange={handleChange}
                  placeholder="e.g., Use Gate 3 access, call on arrival"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">
                {editingCustomer ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}