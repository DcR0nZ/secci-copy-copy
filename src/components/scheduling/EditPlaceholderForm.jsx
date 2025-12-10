import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

const TRUCKS = [
  { id: 'ACCO1', name: 'ACCO1' },
  { id: 'ACCO2', name: 'ACCO2' },
  { id: 'FUSO', name: 'FUSO' },
  { id: 'ISUZU', name: 'ISUZU' },
  { id: 'UD', name: 'UD' }
];

const DELIVERY_WINDOWS = [
  { id: 'first-am', label: '6-8am (1st AM)' },
  { id: 'second-am', label: '8-10am (2nd AM)' },
  { id: 'lunch', label: '10am-12pm (LUNCH)' },
  { id: 'first-pm', label: '12-2pm (1st PM)' },
  { id: 'second-pm', label: '2-4pm (2nd PM)' }
];

const COLOR_OPTIONS = [
  { value: 'gray', label: 'Gray', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  { value: 'green', label: 'Green', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' }
];

export default function EditPlaceholderForm({ placeholder, onSaved, onCancel }) {
  const [label, setLabel] = useState(placeholder.label);
  const [color, setColor] = useState(placeholder.color);
  const [truckId, setTruckId] = useState(placeholder.truckId);
  const [timeSlotId, setTimeSlotId] = useState(placeholder.timeSlotId);
  const [slotPosition, setSlotPosition] = useState(placeholder.slotPosition || 1);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!label.trim() || !truckId || !timeSlotId) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await base44.entities.Placeholder.update(placeholder.id, {
        label: label.trim(),
        color,
        truckId,
        timeSlotId,
        slotPosition: parseInt(slotPosition)
      });
      onSaved();
    } catch (error) {
      console.error('Error updating placeholder:', error);
      alert('Failed to update placeholder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this placeholder?')) return;
    
    setDeleting(true);
    try {
      await base44.entities.Placeholder.delete(placeholder.id);
      onSaved();
    } catch (error) {
      console.error('Error deleting placeholder:', error);
      alert('Failed to delete placeholder');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="label">Label/Note *</Label>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="truck">Truck *</Label>
          <Select value={truckId} onValueChange={setTruckId} required>
            <SelectTrigger id="truck">
              <SelectValue placeholder="Select truck..." />
            </SelectTrigger>
            <SelectContent>
              {TRUCKS.map(truck => (
                <SelectItem key={truck.id} value={truck.id}>{truck.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="timeslot">Time Window *</Label>
          <Select value={timeSlotId} onValueChange={setTimeSlotId} required>
            <SelectTrigger id="timeslot">
              <SelectValue placeholder="Select time window..." />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_WINDOWS.map(window => (
                <SelectItem key={window.id} value={window.id}>{window.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="slotPosition">Delivery Slot *</Label>
          <Select value={slotPosition.toString()} onValueChange={(val) => setSlotPosition(parseInt(val))} required>
            <SelectTrigger id="slotPosition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Slot 1 (First)</SelectItem>
              <SelectItem value="3">Slot 2 (Second)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="color">Color</Label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger id="color">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLOR_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${option.bg} border ${option.border}`} />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-between gap-2">
        <Button 
          type="button" 
          variant="destructive" 
          onClick={handleDelete}
          disabled={saving || deleting}
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving || deleting}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || deleting}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  );
}