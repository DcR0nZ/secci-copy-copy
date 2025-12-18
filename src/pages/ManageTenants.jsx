import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Edit, Trash2, Users, Briefcase, TrendingUp, BarChart3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import TenantDetailsDialog from '../components/tenants/TenantDetailsDialog';

export default function ManageTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    description: '',
    status: 'ACTIVE',
    defaultAppRole: 'dispatcher',
    contactEmail: '',
    contactPhone: '',
    logo: '',
    settings: {
      canCreateJobs: true,
      canViewAllJobs: false,
      requiresApproval: false
    }
  });

  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);

        if (user.appRole !== 'globalAdmin') {
          window.location.href = '/';
          return;
        }

        const [fetchedTenants, allUsers, allJobs] = await Promise.all([
          base44.entities.Tenant.list(),
          base44.entities.User.list(),
          base44.entities.Job.list()
        ]);

        setTenants(fetchedTenants);
        setUsers(allUsers);
        setJobs(allJobs);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tenant data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const getTenantStats = (tenantId) => {
    const tenantUsers = users.filter(u => u.tenantId === tenantId);
    const tenantJobs = jobs.filter(j => j.tenantId === tenantId || j.taggedTenantIds?.includes(tenantId));
    const activeTenantJobs = tenantJobs.filter(j => j.status !== 'CANCELLED');
    const completedJobs = tenantJobs.filter(j => j.status === 'DELIVERED');

    return {
      userCount: tenantUsers.length,
      totalJobs: tenantJobs.length,
      activeJobs: activeTenantJobs.length,
      completedJobs: completedJobs.length,
      totalSqm: activeTenantJobs.reduce((sum, job) => sum + (job.sqm || 0), 0)
    };
  };

  const handleOpenForm = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        tenantId: tenant.tenantId,
        name: tenant.name,
        description: tenant.description || '',
        status: tenant.status,
        defaultAppRole: tenant.defaultAppRole || 'dispatcher',
        contactEmail: tenant.contactEmail || '',
        contactPhone: tenant.contactPhone || '',
        logo: tenant.logo || '',
        settings: tenant.settings || {
          canCreateJobs: true,
          canViewAllJobs: false,
          requiresApproval: false
        }
      });
    } else {
      setEditingTenant(null);
      setFormData({
        tenantId: '',
        name: '',
        description: '',
        status: 'ACTIVE',
        defaultAppRole: 'dispatcher',
        contactEmail: '',
        contactPhone: '',
        logo: '',
        settings: {
          canCreateJobs: true,
          canViewAllJobs: false,
          requiresApproval: false
        }
      });
    }
    setFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTenant) {
        await base44.entities.Tenant.update(editingTenant.id, formData);
        toast({
          title: 'Tenant Updated',
          description: `${formData.name} has been updated successfully.`
        });
      } else {
        // Check if tenantId already exists
        const existing = tenants.find(t => t.tenantId === formData.tenantId);
        if (existing) {
          toast({
            title: 'Error',
            description: 'A tenant with this ID already exists',
            variant: 'destructive'
          });
          setLoading(false);
          return;
        }

        await base44.entities.Tenant.create(formData);
        toast({
          title: 'Tenant Created',
          description: `${formData.name} has been created successfully.`
        });
      }

      // Refresh data
      const updatedTenants = await base44.entities.Tenant.list();
      setTenants(updatedTenants);
      setFormOpen(false);
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tenant',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tenant) => {
    if (!confirm(`Are you sure you want to delete ${tenant.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await base44.entities.Tenant.delete(tenant.id);
      toast({
        title: 'Tenant Deleted',
        description: `${tenant.name} has been deleted.`
      });

      const updatedTenants = await base44.entities.Tenant.list();
      setTenants(updatedTenants);
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete tenant',
        variant: 'destructive'
      });
    }
  };

  const refreshTenants = async () => {
    const updatedTenants = await base44.entities.Tenant.list();
    setTenants(updatedTenants);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser || currentUser.appRole !== 'globalAdmin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Access denied. Global Admin privileges required.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Tenants</h1>
            <p className="text-gray-600 mt-1">Create and manage tenant organizations</p>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map(tenant => {
            const stats = getTenantStats(tenant.tenantId);
            
            return (
              <Card 
                key={tenant.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedTenant(tenant)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{tenant.name}</CardTitle>
                        <p className="text-xs text-gray-500 mt-1">ID: {tenant.tenantId}</p>
                      </div>
                    </div>
                    <Badge className={tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {tenant.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {tenant.description && (
                    <p className="text-sm text-gray-600 mb-4">{tenant.description}</p>
                  )}

                  {/* Analytics */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Users</span>
                      </div>
                      <span className="font-semibold text-gray-900">{stats.userCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Total Jobs</span>
                      </div>
                      <span className="font-semibold text-gray-900">{stats.totalJobs}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Active Jobs</span>
                      </div>
                      <span className="font-semibold text-gray-900">{stats.activeJobs}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Total m²</span>
                      </div>
                      <span className="font-semibold text-gray-900">{stats.totalSqm.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {(tenant.contactEmail || tenant.contactPhone) && (
                    <div className="border-t pt-3 mb-4 space-y-1">
                      {tenant.contactEmail && (
                        <p className="text-xs text-gray-600">📧 {tenant.contactEmail}</p>
                      )}
                      {tenant.contactPhone && (
                        <p className="text-xs text-gray-600">📞 {tenant.contactPhone}</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenForm(tenant);
                      }}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Quick Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(tenant);
                      }}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {tenants.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No tenants created yet</p>
              <Button onClick={() => handleOpenForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Tenant
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Tenant Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTenant ? 'Edit Tenant' : 'Create New Tenant'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant ID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.tenantId}
                    onChange={(e) => setFormData(prev => ({ ...prev, tenantId: e.target.value }))}
                    placeholder="e.g., sec"
                    disabled={!!editingTenant}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier (cannot be changed after creation)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., South East Carters"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this tenant..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default App Role</label>
                  <Select
                    value={formData.defaultAppRole}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, defaultAppRole: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dispatcher">Dispatcher</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="contact@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="0400 000 000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <Input
                  value={formData.logo}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Permissions & Settings</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="canCreateJobs"
                      checked={formData.settings.canCreateJobs}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, canCreateJobs: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="canCreateJobs" className="text-sm text-gray-700">
                      Can create jobs
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="canViewAllJobs"
                      checked={formData.settings.canViewAllJobs}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, canViewAllJobs: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="canViewAllJobs" className="text-sm text-gray-700">
                      Can view all jobs (across tenants)
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="requiresApproval"
                      checked={formData.settings.requiresApproval}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, requiresApproval: e.target.checked }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="requiresApproval" className="text-sm text-gray-700">
                      New jobs require approval
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingTenant ? 'Update Tenant' : 'Create Tenant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tenant Details Dialog */}
      {selectedTenant && (
        <TenantDetailsDialog
          tenant={selectedTenant}
          stats={getTenantStats(selectedTenant.tenantId)}
          onClose={() => setSelectedTenant(null)}
          onUpdate={refreshTenants}
        />
      )}
    </>
  );
}