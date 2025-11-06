import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, User, Phone, Mail, MapPin, FileText, Edit, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CustomerDetailsModal({ 
  customer, 
  pickupLocations = [],
  open, 
  onOpenChange, 
  onUpdate,
  onDelete
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState(customer || {});

  React.useEffect(() => {
    if (customer) {
      setFormData(customer);
      setIsEditing(false);
    }
  }, [customer]);

  if (!customer) return null;

  const getStatusColor = (status) => {
    return status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const getUniqueSheetTypes = () => {
    const sheetTypes = pickupLocations
      .map(loc => loc.sheetType)
      .filter(Boolean);
    return [...new Set(sheetTypes)];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setUpdating(true);
    await onUpdate(customer.id, formData);
    setUpdating(false);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setUpdating(true);
    await onDelete(customer.id);
    setUpdating(false);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {customer.customerName}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">{customer.customerCode}</p>
              </div>
              <Badge className={getStatusColor(customer.status)}>
                {customer.status}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </h3>
                {!isEditing && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditing(true)}
                    disabled={updating}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name *</label>
                    <Input
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Customer Code *</label>
                    <Input
                      name="customerCode"
                      value={formData.customerCode}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person *</label>
                    <Input
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number *</label>
                    <Input
                      name="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email *</label>
                    <Input
                      name="contactEmail"
                      type="email"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Contact Person:</span>
                    <p className="font-medium">{customer.contactPerson}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-medium">{customer.contactNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{customer.contactEmail}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Details */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery Details
              </h3>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Usual Supplier</label>
                    <Select
                      value={formData.usualSupplier || ''}
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">Building/Plastering Company</label>
                    <Input
                      name="buildingPlasteringCompany"
                      value={formData.buildingPlasteringCompany || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Regular Site Contact Name</label>
                    <Input
                      name="regularSiteContactName"
                      value={formData.regularSiteContactName || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Regular Site Contact Number</label>
                    <Input
                      name="regularSiteContactNumber"
                      value={formData.regularSiteContactNumber || ''}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Instructions</label>
                    <Textarea
                      name="deliveryInstructions"
                      value={formData.deliveryInstructions || ''}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleSelectChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  {customer.usualSupplier && (
                    <div>
                      <span className="text-gray-500">Usual Supplier:</span>
                      <p className="font-medium">{customer.usualSupplier}</p>
                    </div>
                  )}
                  {customer.buildingPlasteringCompany && (
                    <div>
                      <span className="text-gray-500">Building/Plastering Company:</span>
                      <p className="font-medium">{customer.buildingPlasteringCompany}</p>
                    </div>
                  )}
                  {customer.regularSiteContactName && (
                    <div>
                      <span className="text-gray-500">Regular Site Contact:</span>
                      <p className="font-medium">{customer.regularSiteContactName} - {customer.regularSiteContactNumber}</p>
                    </div>
                  )}
                  {customer.deliveryInstructions && (
                    <div>
                      <span className="text-gray-500">Delivery Instructions:</span>
                      <p className="font-medium">{customer.deliveryInstructions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => {
                  setFormData(customer);
                  setIsEditing(false);
                }} disabled={updating}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updating}>
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={updating}
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customer.customerName}? This action cannot be undone and may affect related jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={updating}
              className="bg-red-600 hover:bg-red-700"
            >
              {updating ? 'Deleting...' : 'Delete Customer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}