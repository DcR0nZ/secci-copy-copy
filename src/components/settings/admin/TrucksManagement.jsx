import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Truck, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function TrucksManagement({ user }) {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    isActive: true
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTrucks();
  }, [user.tenantId]);

  const loadTrucks = async () => {
    try {
      const truckList = await base44.entities.Truck.filter({ tenantId: user.tenantId });
      setTrucks(truckList);
    } catch (error) {
      console.error('Failed to load trucks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTruck(null);
    setFormData({
      name: '',
      capacity: '',
      isActive: true
    });
    setDialogOpen(true);
  };

  const handleEdit = (truck) => {
    setEditingTruck(truck);
    setFormData({
      name: truck.name,
      capacity: truck.capacity.toString(),
      isActive: truck.isActive
    });
    setDialogOpen(true);
  };

  const handleDelete = async (truck) => {
    if (!confirm(`Are you sure you want to delete ${truck.name}?`)) return;

    try {
      // Check if truck is assigned to future jobs
      const today = new Date().toISOString().split('T')[0];
      const assignments = await base44.entities.Assignment.filter({
        truckId: truck.name,
        date: { $gte: today }
      });

      if (assignments.length > 0) {
        toast({
          title: 'Cannot Delete',
          description: `${truck.name} is assigned to ${assignments.length} future job(s). Please reassign them first.`,
          variant: 'destructive'
        });
        return;
      }

      await base44.entities.Truck.delete(truck.id);

      // Log audit
      await base44.entities.AuditLog.create({
        tenantId: user.tenantId,
        actorUserId: user.id,
        actorName: user.display_name || user.full_name || user.email,
        action: 'truck_deleted',
        targetId: truck.id,
        metadata: { truckName: truck.name }
      });

      toast({
        title: 'Truck Deleted',
        description: `${truck.name} has been removed`
      });

      loadTrucks();
    } catch (error) {
      console.error('Failed to delete truck:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete truck',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Truck name is required',
        variant: 'destructive'
      });
      return;
    }

    const capacity = parseFloat(formData.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Capacity must be a positive number',
        variant: 'destructive'
      });
      return;
    }

    // Check for duplicate names
    const duplicate = trucks.find(
      t => t.name.toLowerCase() === formData.name.trim().toLowerCase() && 
           (!editingTruck || t.id !== editingTruck.id)
    );

    if (duplicate) {
      toast({
        title: 'Validation Error',
        description: 'A truck with this name already exists',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const truckData = {
        tenantId: user.tenantId,
        name: formData.name.trim(),
        capacity,
        isActive: formData.isActive
      };

      if (editingTruck) {
        await base44.entities.Truck.update(editingTruck.id, truckData);
        
        await base44.entities.AuditLog.create({
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.display_name || user.full_name || user.email,
          action: 'truck_updated',
          targetId: editingTruck.id,
          metadata: { truckName: formData.name }
        });

        toast({
          title: 'Truck Updated',
          description: `${formData.name} has been updated`
        });
      } else {
        await base44.entities.Truck.create(truckData);

        await base44.entities.AuditLog.create({
          tenantId: user.tenantId,
          actorUserId: user.id,
          actorName: user.display_name || user.full_name || user.email,
          action: 'truck_created',
          metadata: { truckName: formData.name }
        });

        toast({
          title: 'Truck Created',
          description: `${formData.name} has been added`
        });
      }

      setDialogOpen(false);
      loadTrucks();
    } catch (error) {
      console.error('Failed to save truck:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save truck',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Manage trucks available for scheduling
          </p>
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Truck
          </Button>
        </div>

        {trucks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No trucks configured yet</p>
              <Button onClick={handleAdd} className="mt-4" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add First Truck
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trucks.map(truck => (
              <Card key={truck.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{truck.name}</h4>
                        <p className="text-sm text-gray-600">{truck.capacity} tonnes</p>
                      </div>
                    </div>
                    <Badge variant={truck.isActive ? 'default' : 'secondary'}>
                      {truck.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(truck)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(truck)}
                      className="flex-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTruck ? 'Edit Truck' : 'Add Truck'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="truck-name">Truck Name *</Label>
              <Input
                id="truck-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., ACCO1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (tonnes) *</Label>
              <Input
                id="capacity"
                type="number"
                step="0.1"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                placeholder="e.g., 14"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active</Label>
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingTruck ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}