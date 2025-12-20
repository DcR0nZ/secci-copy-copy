import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TrucksManagement({ user }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [formData, setFormData] = useState({ name: '', capacity: '' });
  const [saving, setSaving] = useState(false);

  const tenantId = user.tenantId || 'sec';

  const { data: trucks = [], isLoading } = useQuery({
    queryKey: ['tenantTrucks', tenantId],
    queryFn: () => base44.entities.Truck.filter({ tenantId }),
  });

  const handleAdd = () => {
    setSelectedTruck(null);
    setFormData({ name: '', capacity: '' });
    setEditDialogOpen(true);
  };

  const handleEdit = (truck) => {
    setSelectedTruck(truck);
    setFormData({ name: truck.name, capacity: truck.capacity.toString() });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.capacity) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const truckData = {
        tenantId,
        name: formData.name,
        capacity: parseFloat(formData.capacity),
        isActive: true
      };

      if (selectedTruck) {
        await base44.entities.Truck.update(selectedTruck.id, truckData);
        toast({ title: "Success", description: "Truck updated successfully" });
      } else {
        await base44.entities.Truck.create(truckData);
        toast({ title: "Success", description: "Truck added successfully" });
      }

      queryClient.invalidateQueries({ queryKey: ['tenantTrucks'] });
      setEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save truck",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Truck.delete(selectedTruck.id);
      queryClient.invalidateQueries({ queryKey: ['tenantTrucks'] });
      toast({ title: "Success", description: "Truck deleted successfully" });
      setDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete truck",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (truck) => {
    try {
      await base44.entities.Truck.update(truck.id, {
        ...truck,
        isActive: !truck.isActive
      });
      queryClient.invalidateQueries({ queryKey: ['tenantTrucks'] });
      toast({
        title: "Success",
        description: `Truck ${truck.isActive ? 'deactivated' : 'activated'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update truck status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading trucks...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">{trucks.length} truck(s) in fleet</p>
          <Button onClick={handleAdd} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Truck
          </Button>
        </div>

        {trucks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No trucks added yet. Click "Add Truck" to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {trucks.map((truck) => (
              <Card key={truck.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded">
                        <Truck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{truck.name}</h4>
                          <Badge className={truck.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {truck.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Capacity: {truck.capacity}t</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(truck)}
                      >
                        {truck.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(truck)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedTruck(truck);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTruck ? 'Edit Truck' : 'Add Truck'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Truck Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ACCO1, HIAB2"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Capacity (tonnes)</label>
              <Input
                type="number"
                step="0.1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="e.g., 12.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Truck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTruck?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}