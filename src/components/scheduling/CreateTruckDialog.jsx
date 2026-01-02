import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function CreateTruckDialog({ open, onOpenChange, onCreated }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a truck name",
        variant: "destructive",
      });
      return;
    }

    if (!capacity || parseFloat(capacity) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid capacity",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const user = await base44.auth.me();
      const tenantId = user.tenantId || 'sec';

      await base44.entities.Truck.create({
        name: name.trim(),
        capacity: parseFloat(capacity),
        isActive: true,
        tenantId: tenantId
      });

      toast({
        title: "Success",
        description: "Truck created successfully",
      });

      setName('');
      setCapacity('');
      onOpenChange(false);
      
      if (onCreated) {
        onCreated();
      }
    } catch (error) {
      console.error('Error creating truck:', error);
      toast({
        title: "Error",
        description: "Failed to create truck. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Truck</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Truck Name *</Label>
              <Input
                id="name"
                placeholder="e.g. T005 - XYZ789"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">Enter a descriptive name for the truck</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (tonnes) *</Label>
              <Input
                id="capacity"
                type="number"
                step="0.1"
                placeholder="e.g. 12"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">Enter the weight capacity in tonnes</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Truck'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}