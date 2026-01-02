import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

const PERMISSION_GROUPS = {
  'Job Management': [
    { key: 'canCreateJobs', label: 'Create Jobs', description: 'Create new delivery jobs' },
    { key: 'canEditJobs', label: 'Edit Jobs', description: 'Modify existing jobs' },
    { key: 'canDeleteJobs', label: 'Delete Jobs', description: 'Delete jobs from the system' },
    { key: 'canViewAllJobs', label: 'View All Jobs', description: 'View jobs across all customers' },
  ],
  'Scheduling': [
    { key: 'canScheduleJobs', label: 'Schedule Jobs', description: 'Assign jobs to trucks and time slots' },
    { key: 'canViewSchedulingBoard', label: 'View Scheduling Board', description: 'Access the scheduling board' },
  ],
  'Operations': [
    { key: 'canViewDashboard', label: 'View Dashboard', description: 'Access the main dashboard' },
    { key: 'canViewLiveTracking', label: 'View Live Tracking', description: 'Track active deliveries in real-time' },
    { key: 'canUpdateJobStatus', label: 'Update Job Status', description: 'Change job status (driver function)' },
    { key: 'canSubmitPOD', label: 'Submit Proof of Delivery', description: 'Submit POD photos and signatures' },
  ],
  'Reporting': [
    { key: 'canViewReports', label: 'View Reports', description: 'Access reports and analytics' },
  ],
  'Timesheets': [
    { key: 'canViewOwnTimesheet', label: 'View Own Timesheet', description: 'View and submit own timesheet' },
    { key: 'canViewTimesheets', label: 'View All Timesheets', description: 'View all employee timesheets' },
    { key: 'canApproveTimesheets', label: 'Approve Timesheets', description: 'Approve employee timesheets' },
  ],
  'Administration': [
    { key: 'canManageFleet', label: 'Manage Fleet', description: 'Add/edit trucks and vehicles' },
    { key: 'canManageUsers', label: 'Manage Users', description: 'Create and manage user accounts' },
    { key: 'canManageCustomers', label: 'Manage Customers', description: 'Add/edit customer information' },
    { key: 'canManageLocations', label: 'Manage Locations', description: 'Add/edit pickup locations' },
    { key: 'canManageDeliveryTypes', label: 'Manage Delivery Types', description: 'Configure delivery types' },
    { key: 'canManageTenantSettings', label: 'Manage Tenant Settings', description: 'Configure tenant-wide settings' },
  ],
};

export default function EditRoleDialog({ open, onOpenChange, role, onUpdated }) {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (role) {
      setRoleName(role.roleName || '');
      setDescription(role.description || '');
      setIsDefault(role.isDefault || false);
      setPermissions(role.permissions || {});
    }
  }, [role]);

  const handlePermissionToggle = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!roleName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a role name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await base44.entities.TenantRole.update(role.id, {
        roleName: roleName.trim(),
        description: description.trim(),
        permissions,
        isDefault,
      });

      toast({
        title: "Success",
        description: "Role updated successfully",
      });

      onOpenChange(false);
      
      if (onUpdated) {
        onUpdated();
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="roleName">Role Name *</Label>
                <Input
                  id="roleName"
                  placeholder="e.g. Senior Dispatcher, Lead Driver"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this role does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                  disabled={loading}
                />
                <Label htmlFor="isDefault">Set as default role for new users</Label>
              </div>

              <div className="space-y-4">
                <Label>Permissions</Label>
                {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                  <div key={group} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-sm mb-3">{group}</h4>
                    <div className="space-y-3">
                      {perms.map(perm => (
                        <div key={perm.key} className="flex items-start space-x-3">
                          <Checkbox
                            id={perm.key}
                            checked={permissions[perm.key] || false}
                            onCheckedChange={() => handlePermissionToggle(perm.key)}
                            disabled={loading}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={perm.key}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {perm.label}
                            </Label>
                            <p className="text-xs text-gray-500 mt-1">{perm.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}