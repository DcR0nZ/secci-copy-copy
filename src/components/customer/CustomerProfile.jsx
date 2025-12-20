import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Building2, Mail, Phone, MapPin, Save } from 'lucide-react';

export default function CustomerProfile({ user }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customerData } = useQuery({
    queryKey: ['customerProfile', user?.customerId],
    queryFn: async () => {
      if (!user.customerId) return null;
      const customers = await base44.entities.Customer.filter({ id: user.customerId });
      return customers[0] || null;
    },
    enabled: !!user?.customerId,
  });

  const [formData, setFormData] = useState({
    contactPerson: user?.full_name || '',
    contactNumber: customerData?.contactNumber || '',
    contactEmail: user?.email || '',
    deliveryInstructions: customerData?.deliveryInstructions || '',
    regularSiteContactName: customerData?.regularSiteContactName || '',
    regularSiteContactNumber: customerData?.regularSiteContactNumber || ''
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update user profile
      await base44.auth.updateMe({
        full_name: formData.contactPerson
      });

      // Update customer record
      if (customerData) {
        await base44.entities.Customer.update(customerData.id, {
          ...customerData,
          contactPerson: formData.contactPerson,
          contactNumber: formData.contactNumber,
          contactEmail: formData.contactEmail,
          deliveryInstructions: formData.deliveryInstructions,
          regularSiteContactName: formData.regularSiteContactName,
          regularSiteContactNumber: formData.regularSiteContactNumber
        });
      }

      queryClient.invalidateQueries({ queryKey: ['customerProfile'] });
      
      toast({
        title: "Profile Updated",
        description: "Your contact information has been saved successfully.",
      });

      setEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Company Info (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Company Name</p>
            <p className="text-gray-900 mt-1">{customerData?.customerName || 'Not available'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Customer Code</p>
            <p className="text-gray-900 mt-1">{customerData?.customerCode || 'Not available'}</p>
          </div>
          {customerData?.usualSupplier && (
            <div>
              <p className="text-sm font-medium text-gray-600">Usual Supplier</p>
              <p className="text-gray-900 mt-1">{customerData.usualSupplier}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information (Editable) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
            {!editing && (
              <Button onClick={() => setEditing(true)} variant="outline">
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block">
              Contact Person
            </label>
            {editing ? (
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Full name"
              />
            ) : (
              <p className="text-gray-900">{formData.contactPerson || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </label>
            {editing ? (
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="email@example.com"
              />
            ) : (
              <p className="text-gray-900">{formData.contactEmail || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </label>
            {editing ? (
              <Input
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="Phone number"
              />
            ) : (
              <p className="text-gray-900">{formData.contactNumber || 'Not set'}</p>
            )}
          </div>

          {editing && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button onClick={() => setEditing(false)} variant="outline">
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Delivery Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block">
              General Delivery Instructions
            </label>
            {editing ? (
              <Textarea
                value={formData.deliveryInstructions}
                onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                placeholder="Add any general instructions for deliveries..."
                rows={4}
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {formData.deliveryInstructions || 'No instructions set'}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block">
              Regular Site Contact Name
            </label>
            {editing ? (
              <Input
                value={formData.regularSiteContactName}
                onChange={(e) => setFormData({ ...formData, regularSiteContactName: e.target.value })}
                placeholder="Name of regular on-site contact"
              />
            ) : (
              <p className="text-gray-900">{formData.regularSiteContactName || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-2 block">
              Regular Site Contact Number
            </label>
            {editing ? (
              <Input
                value={formData.regularSiteContactNumber}
                onChange={(e) => setFormData({ ...formData, regularSiteContactNumber: e.target.value })}
                placeholder="Phone number"
              />
            ) : (
              <p className="text-gray-900">{formData.regularSiteContactNumber || 'Not set'}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}