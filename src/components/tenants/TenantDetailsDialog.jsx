import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  Settings, 
  Users, 
  Briefcase, 
  Edit, 
  Save, 
  X,
  TrendingUp,
  BarChart3,
  CheckCircle,
  Mail,
  Phone,
  Globe
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function TenantDetailsDialog({ tenant, stats, onClose, onUpdate }) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant.name,
    description: tenant.description || '',
    status: tenant.status,
    defaultAppRole: tenant.defaultAppRole || 'dispatcher',
    contactEmail: tenant.contactEmail || '',
    contactPhone: tenant.contactPhone || '',
    logo: tenant.logo || '',
    settings: {
      canCreateJobs: tenant.settings?.canCreateJobs ?? true,
      canViewAllJobs: tenant.settings?.canViewAllJobs ?? false,
      requiresApproval: tenant.settings?.requiresApproval ?? false
    }
  });

  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Tenant.update(tenant.id, formData);
      toast({
        title: 'Tenant Updated',
        description: `${formData.name} has been updated successfully.`
      });
      setEditMode(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tenant',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: tenant.name,
      description: tenant.description || '',
      status: tenant.status,
      defaultAppRole: tenant.defaultAppRole || 'dispatcher',
      contactEmail: tenant.contactEmail || '',
      contactPhone: tenant.contactPhone || '',
      logo: tenant.logo || '',
      settings: {
        canCreateJobs: tenant.settings?.canCreateJobs ?? true,
        canViewAllJobs: tenant.settings?.canViewAllJobs ?? false,
        requiresApproval: tenant.settings?.requiresApproval ?? false
      }
    });
    setEditMode(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl">{tenant.name}</DialogTitle>
                <p className="text-sm text-gray-500">Tenant ID: {tenant.tenantId}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {tenant.status}
              </Badge>
              {!editMode ? (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tenant Name</Label>
                    {editMode ? (
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">{tenant.name}</p>
                    )}
                  </div>
                  <div>
                    <Label>Tenant ID</Label>
                    <p className="text-sm text-gray-500 mt-1">{tenant.tenantId} (cannot be changed)</p>
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  {editMode ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 mt-1">{tenant.description || 'No description provided'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    {editMode ? (
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">{tenant.status}</p>
                    )}
                  </div>
                  <div>
                    <Label>Default App Role</Label>
                    {editMode ? (
                      <Select
                        value={formData.defaultAppRole}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, defaultAppRole: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dispatcher">Dispatcher</SelectItem>
                          <SelectItem value="driver">Driver</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1 capitalize">{tenant.defaultAppRole || 'dispatcher'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contact Email
                    </Label>
                    {editMode ? (
                      <Input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                        placeholder="contact@example.com"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">{tenant.contactEmail || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact Phone
                    </Label>
                    {editMode ? (
                      <Input
                        value={formData.contactPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="0400 000 000"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">{tenant.contactPhone || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Logo URL
                  </Label>
                  {editMode ? (
                    <Input
                      value={formData.logo}
                      onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 mt-1">{tenant.logo || 'Not provided'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Permissions & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Can Create Jobs</Label>
                    <p className="text-sm text-gray-500">Allow users to create new jobs</p>
                  </div>
                  <Switch
                    checked={formData.settings.canCreateJobs}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, canCreateJobs: checked }
                    }))}
                    disabled={!editMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Can View All Jobs</Label>
                    <p className="text-sm text-gray-500">View jobs across all tenants</p>
                  </div>
                  <Switch
                    checked={formData.settings.canViewAllJobs}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, canViewAllJobs: checked }
                    }))}
                    disabled={!editMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Requires Approval</Label>
                    <p className="text-sm text-gray-500">New jobs need admin approval before scheduling</p>
                  </div>
                  <Switch
                    checked={formData.settings.requiresApproval}
                    onCheckedChange={(checked) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, requiresApproval: checked }
                    }))}
                    disabled={!editMode}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.userCount}</div>
                  <p className="text-xs text-muted-foreground">Active users in this tenant</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalJobs}</div>
                  <p className="text-xs text-muted-foreground">All jobs created</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeJobs}</div>
                  <p className="text-xs text-muted-foreground">Currently active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedJobs}</div>
                  <p className="text-xs text-muted-foreground">Successfully delivered</p>
                </CardContent>
              </Card>

              <Card className="col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Square Meters</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSqm.toLocaleString()} m²</div>
                  <p className="text-xs text-muted-foreground">Total area across active jobs</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}