import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, Mail, Building2, Truck, Trash2, UserCog } from 'lucide-react';
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
import { base44 } from '@/api/base44Client';

const TRUCKS = [
  { id: 'ACCO1', name: 'ACCO1' },
  { id: 'ACCO2', name: 'ACCO2' },
  { id: 'FUSO', name: 'FUSO' },
  { id: 'ISUZU', name: 'ISUZU' },
  { id: 'UD', name: 'UD' }
];

export default function UserDetailsModal({
  user,
  open,
  onOpenChange,
  onUpdate,
  onDelete
}) {
  const [editedUser, setEditedUser] = useState({
    full_name: '',
    email: '',
    role: 'user',
    appRole: 'customer',
    customerId: null,
    customerName: null,
    additionalCustomerIds: [],
    truck: null,
    tenantId: 'plasterboard_dispatch'
  });
  const [customers, setCustomers] = useState([]);
  const [additionalCustomers, setAdditionalCustomers] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      setEditedUser({
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || 'user',
        appRole: user.appRole || 'customer',
        customerId: user.customerId || null,
        customerName: user.customerName || null,
        additionalCustomerIds: user.additionalCustomerIds || [],
        truck: user.truck || null,
        tenantId: user.tenantId || 'plasterboard_dispatch'
      });

      const fetchData = async () => {
        setIsDataLoading(true);
        try {
          const [allCustomers, allTenants] = await Promise.all([
            base44.entities.Customer.list(),
            base44.entities.Tenant.list()
          ]);
          
          setCustomers(allCustomers);
          setTenants(allTenants);

          if (user.additionalCustomerIds && user.additionalCustomerIds.length > 0) {
            const additional = allCustomers.filter(c => user.additionalCustomerIds.includes(c.id));
            setAdditionalCustomers(additional);
          } else {
            setAdditionalCustomers([]);
          }
        } catch (error) {
          console.error("Failed to fetch data:", error);
        } finally {
          setIsDataLoading(false);
        }
      };
      fetchData();
    } else if (!open) {
      setEditedUser({
        full_name: '', email: '', role: 'user', appRole: 'customer', customerId: null,
        customerName: null, additionalCustomerIds: [], truck: null, tenantId: 'plasterboard_dispatch'
      });
      setCustomers([]);
      setAdditionalCustomers([]);
      setTenants([]);
      setIsDataLoading(false);
      setIsSaving(false);
    }
  }, [open, user]);

  if (!user) return null;

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      globalAdmin: 'bg-red-100 text-red-800',
      tenantAdmin: 'bg-orange-100 text-orange-800',
      customer: 'bg-blue-100 text-blue-800',
      dispatcher: 'bg-purple-100 text-purple-800',
      driver: 'bg-green-100 text-green-800',
      manager: 'bg-yellow-100 text-yellow-800',
      outreach: 'bg-indigo-100 text-indigo-800',
      outreachOperator: 'bg-pink-100 text-pink-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        full_name: editedUser.full_name,
        email: editedUser.email,
        appRole: editedUser.appRole,
        customerId: editedUser.customerId,
        customerName: editedUser.customerName,
        additionalCustomerIds: editedUser.additionalCustomerIds,
        truck: editedUser.truck,
        tenantId: editedUser.tenantId,
      };
      
      const oldRole = user.appRole;
      const newRole = editedUser.appRole;
      
      await onUpdate(user.id, payload);
      
      // Send notification if role changed
      if (oldRole !== newRole) {
        try {
          await base44.entities.Notification.create({
            userId: user.id,
            title: 'Your Role Has Been Updated',
            message: `Your role has been changed from ${oldRole || 'user'} to ${newRole}.`,
            type: 'role_change',
            isRead: false,
          });
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
        }
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update user:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAdditionalCustomer = (customerId) => {
    if (!customerId || editedUser.additionalCustomerIds.includes(customerId)) return;

    setEditedUser(prev => ({
      ...prev,
      additionalCustomerIds: [...prev.additionalCustomerIds, customerId]
    }));

    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setAdditionalCustomers(prev => [...prev, customer]);
    }
  };

  const handleRemoveAdditionalCustomer = (customerId) => {
    setEditedUser(prev => ({
      ...prev,
      additionalCustomerIds: prev.additionalCustomerIds.filter(id => id !== customerId)
    }));

    setAdditionalCustomers(prev => prev.filter(c => c.id !== customerId));
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await onDelete(user.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete user:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled = isDataLoading || isSaving;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] h-[90vh] sm:h-auto sm:max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Edit User: {user.full_name}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              </div>
              <Badge className={getRoleColor(user.role)}>
                {user.role}
              </Badge>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(90vh-220px)] sm:max-h-[calc(85vh-220px)] px-1">
            <div className="space-y-4 pr-3">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={editedUser.full_name}
                  onChange={(e) => setEditedUser(prev => ({ ...prev, full_name: e.target.value }))}
                  disabled={isDisabled}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editedUser.email}
                  onChange={(e) => setEditedUser(prev => ({ ...prev, email: e.target.value }))}
                  disabled={isDisabled}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="appRole">Application Role</Label>
                <Select
                  value={editedUser.appRole || 'customer'}
                  onValueChange={(value) => {
                    setEditedUser(prev => ({
                      ...prev,
                      appRole: value,
                      truck: value === 'driver' ? prev.truck : null,
                      customerId: value === 'driver' ? null : prev.customerId,
                      customerName: value === 'driver' ? null : prev.customerName,
                      additionalCustomerIds: value === 'driver' ? [] : prev.additionalCustomerIds,
                    }));
                  }}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="appRole" className="w-full">
                    <SelectValue placeholder="Select app role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="outreachOperator">Outreach Operator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="tenantAdmin">Tenant Admin</SelectItem>
                    <SelectItem value="globalAdmin">Global Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(editedUser.appRole === 'customer' || editedUser.appRole === 'manager') && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="primaryCustomer">Primary Customer</Label>
                    <Select
                      value={editedUser.customerId || 'null'}
                      onValueChange={(value) => {
                        const selectedCustomer = customers.find(c => c.id === value);
                        setEditedUser(prev => ({
                          ...prev,
                          customerId: value === 'null' ? null : value,
                          customerName: selectedCustomer ? selectedCustomer.customerName : null
                        }));
                      }}
                      disabled={isDisabled}
                    >
                      <SelectTrigger id="primaryCustomer" className="w-full">
                        <SelectValue placeholder="Select primary customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          <SelectItem value="null">
                            <span className="text-gray-500">Unlink Primary Customer</span>
                          </SelectItem>
                          {customers.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.customerName}
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Customers Access
                      <span className="text-xs text-gray-500 ml-2">(For multi-company accounts)</span>
                    </Label>

                    {additionalCustomers.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {additionalCustomers.map(customer => (
                          <div key={customer.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                            <span className="text-sm">{customer.customerName}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAdditionalCustomer(customer.id)}
                              disabled={isDisabled}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Select onValueChange={handleAddAdditionalCustomer} disabled={isDisabled}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Add another customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {customers
                            .filter(c =>
                              c.id !== editedUser.customerId &&
                              !editedUser.additionalCustomerIds.includes(c.id)
                            )
                            .map(customer => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.customerName}
                              </SelectItem>
                            ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {editedUser.appRole === 'driver' && (
                <div className="grid gap-2">
                  <Label htmlFor="assignedTruck">Assigned Truck</Label>
                  <Select
                    value={editedUser.truck || 'null'}
                    onValueChange={(value) => setEditedUser(prev => ({ ...prev, truck: value === 'null' ? null : value }))}
                    disabled={isDisabled}
                  >
                    <SelectTrigger id="assignedTruck" className="w-full">
                      <SelectValue placeholder="Assign truck..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">
                        <span className="text-gray-500">No Truck</span>
                      </SelectItem>
                      {TRUCKS.map(truck => (
                        <SelectItem key={truck.id} value={truck.id}>
                          {truck.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-2 pb-4">
                <Label htmlFor="tenantId">Tenant</Label>
                <Select
                  value={editedUser.tenantId}
                  onValueChange={(value) => setEditedUser(prev => ({ ...prev, tenantId: value }))}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="tenantId" className="w-full">
                    <SelectValue placeholder="Select tenant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map(tenant => (
                      <SelectItem key={tenant.id} value={tenant.tenantId}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDisabled}
              className="sm:mr-auto"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDisabled}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={handleSave}
              disabled={isDisabled}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisabled}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDisabled}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}