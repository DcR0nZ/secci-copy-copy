import React, { useState } from 'react';
import { Pencil, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
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

const COLOR_OPTIONS = [
  { value: 'gray', label: 'Gray', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  { value: 'green', label: 'Green', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' }
];

export default function PlaceholderBlock({ placeholder, onUpdated, isDragging }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [label, setLabel] = useState(placeholder.label);
  const [color, setColor] = useState(placeholder.color);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const colorOption = COLOR_OPTIONS.find(opt => opt.value === placeholder.color) || COLOR_OPTIONS[0];

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;

    setSaving(true);
    try {
      await base44.entities.Placeholder.update(placeholder.id, {
        label: label.trim(),
        color
      });
      setShowEdit(false);
      onUpdated();
    } catch (error) {
      console.error('Error updating placeholder:', error);
      alert('Failed to update placeholder');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.Placeholder.delete(placeholder.id);
      setShowDelete(false);
      onUpdated();
    } catch (error) {
      console.error('Error deleting placeholder:', error);
      alert('Failed to delete placeholder');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div
        className={`${colorOption.bg} ${colorOption.border} border-2 rounded p-2 shadow-sm text-xs transition-all group relative ${isDragging ? 'opacity-50 scale-105 z-50' : ''}`}
        style={{
          minHeight: '60px',
          width: '100%',
          boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : undefined
        }}
      >
        <div className="flex items-start justify-between gap-1 h-full">
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className={`font-medium ${colorOption.text} text-[11px]`}>
              {placeholder.label}
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 bg-white/80 hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEdit(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 bg-white/80 hover:bg-white text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDelete(true);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <GripVertical className="h-2.5 w-2.5 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Placeholder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-label">Label/Note</Label>
                <Input
                  id="edit-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-color">Color</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger id="edit-color">
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Placeholder?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this placeholder? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}