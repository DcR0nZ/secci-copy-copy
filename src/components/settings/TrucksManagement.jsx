import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Truck, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function TrucksManagement({ user }) {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [formData, setFormData] = useState({ name: '', capacity: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTrucks();
  }, [user]);

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const allTrucks = await base44.entities.TruckConfig.filter({ tenantId: user.tenantId || 'sec' });
      setTrucks(allTrucks);
    } catch (error) {
      console.error('Error loading trucks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (truck = null) => {
    if (truck) {
      setEditingTruck(truck);
      setFormData({ name: truck.name, capacity: truck.capacity, isActive: truck.isActive });
    } else {
      setEditingTruck(null);
      setFormData({ name: '', capacity: '', isActive: true });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.capacity) {
      toast({
        title: 'Validation error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    // Check for duplicate names
    const duplicate = trucks.find(t => 
      t.name.toLowerCase() === formData.name.toLowerCase() && 
      t.id !== editingTruck?.id
    );
    if (duplicate) {
      toast({
        title: 'Validation error',
        description: 'A truck with this name already exists',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const truckData = {
        ...formData,
        tenantId: user.tenantId || 'sec',
        capacity: parseFloat(formData.capacity)
      };

      if (editingTruck) {
        await base44.entities.TruckConfig.update(editingTruck.id, truckData);
        toast({ title: 'Truck updated', description: 'Truck has been updated successfully' });
      } else {
        await base44.entities.TruckConfig.create(truckData);
        toast({ title: 'Truck created', description: 'New truck has been added' });
      }

      // Log audit
      await base44.entities.AuditLog.create({
        tenantId: user.tenantId || 'sec',
        actorUserId: user.id,
        actorName: user.full_name || user.email,
        action: editingTruck ? 'updated_truck' : 'created_truck',
        targetId: editingTruck?.id,
        targetName: formData.name
      });

      setDialogOpen(false);
      fetchTrucks();
    } catch (error) {
      console.error('Error saving truck:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save truck',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (truck) => {
    if (!confirm(`Are you sure you want to delete ${truck.name}?`)) return;

    try {
      await base44.entities.TruckConfig.delete(truck.id);
      
      await base44.entities.AuditLog.create({
        tenantId: user.tenantId || 'sec',
        actorUserId: user.id,
        actorName: user.full_name || user.email,
        action: 'deleted_truck',
        targetId: truck.id,
        targetName: truck.name
      });

      toast({ title: 'Truck deleted', description: 'Truck has been removed' });
      fetchTrucks();
    } catch (error) {
      console.error('Error deleting truck:', error);
      toast({
        title: 'Delete failed',
        description: 'Failed to delete truck',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trucks Management</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Truck
          </Button>
        </CardHeader>
        <CardContent>
          {trucks.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No trucks configured yet</p>
          ) : (
            <div className="space-y-3">
              {trucks.map(truck => (
                <div key={truck.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-semibold">{truck.name}</p>
                      <p className="text-sm text-gray-500">{truck.capacity} kg capacity</p>
                    </div>
                    <Badge variant={truck.isActive ? 'default' : 'secondary'}>
                      {truck.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(truck)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(truck)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTruck ? 'Edit Truck' : 'Add New Truck'}</DialogTitle>
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
              <Label htmlFor="capacity">Weight Capacity (kg) *</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                placeholder="e.g., 14000"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-active"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="is-active" className="font-normal">Active (available for scheduling)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}