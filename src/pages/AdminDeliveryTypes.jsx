
import React, { useState, useEffect, useCallback } from 'react';
import { DeliveryType } from '@/entities/DeliveryType';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function AdminDeliveryTypesPage() {
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    defaultDurationMin: '',
    requiresCrane: false,
    requiresManitou: false,
    requiresBarge: false
  });
  const { toast } = useToast();

  const fetchDeliveryTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allTypes = await DeliveryType.list('-created_date');
      console.log('Fetched delivery types:', allTypes);
      setDeliveryTypes(allTypes);
    } catch (err) {
      console.error('Error fetching delivery types:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: `Failed to load delivery types: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDeliveryTypes();
  }, [fetchDeliveryTypes]);

  const handleOpenDialog = (deliveryType = null) => {
    if (deliveryType) {
      setEditingType(deliveryType);
      setFormData({
        name: deliveryType.name || '',
        description: deliveryType.description || '',
        code: deliveryType.code || '',
        defaultDurationMin: deliveryType.defaultDurationMin || '',
        requiresCrane: deliveryType.requiresCrane || false,
        requiresManitou: deliveryType.requiresManitou || false,
        requiresBarge: deliveryType.requiresBarge || false
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        description: '',
        code: '',
        defaultDurationMin: '',
        requiresCrane: false,
        requiresManitou: false,
        requiresBarge: false
      });
    }
    setDialogOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDelete = async (deliveryType) => {
    if (!confirm(`Are you sure you want to delete "${deliveryType.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await DeliveryType.delete(deliveryType.id);
      toast({
        title: "Delivery Type Deleted",
        description: "The delivery type has been successfully deleted.",
      });
      fetchDeliveryTypes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete delivery type. It may be in use by existing jobs.",
        variant: "destructive",
      });
      console.error("Failed to delete delivery type:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        // Convert to Number, use undefined if empty to avoid sending 0 or null strings
        defaultDurationMin: formData.defaultDurationMin !== '' ? Number(formData.defaultDurationMin) : undefined,
      };

      if (editingType) {
        await DeliveryType.update(editingType.id, dataToSubmit);
        toast({
          title: "Delivery Type Updated",
          description: "The delivery type has been successfully updated.",
        });
      } else {
        await DeliveryType.create(dataToSubmit);
        toast({
          title: "Delivery Type Created",
          description: "The new delivery type has been successfully created.",
        });
      }
      setDialogOpen(false);
      fetchDeliveryTypes(); // Re-fetch to update the list
    } catch (saveError) {
      toast({
        title: "Error",
        description: `Failed to save delivery type: ${saveError.message}. Please try again.`,
        variant: "destructive",
      });
      console.error("Failed to save delivery type:", saveError);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading delivery types...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">Error loading delivery types: {error}</p>
        <Button onClick={fetchDeliveryTypes} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sticky Header */}
      <div className="flex-shrink-0 pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Delivery Types</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage delivery types and their configurations</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Delivery Type
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-x-auto overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
        <Card>
          <CardContent className="p-0">
            {deliveryTypes.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <p>No delivery types found. Click "Add Delivery Type" to create one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="min-w-[100px]">Code</TableHead>
                      <TableHead className="min-w-[150px]">Name</TableHead>
                      <TableHead className="min-w-[250px]">Description</TableHead>
                      <TableHead className="min-w-[150px]">Time on Site (per docket)</TableHead>
                      <TableHead className="min-w-[200px]">Equipment</TableHead>
                      <TableHead className="min-w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryTypes.map(type => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.code}</TableCell>
                        <TableCell>{type.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{type.description}</TableCell>
                        <TableCell>{type.defaultDurationMin ? `${type.defaultDurationMin} min` : '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {type.requiresCrane && (
                              <Badge variant="outline" className="text-xs">Crane</Badge>
                            )}
                            {type.requiresManitou && (
                              <Badge variant="outline" className="text-xs">Manitou</Badge>
                            )}
                            {type.requiresBarge && (
                              <Badge variant="outline" className="text-xs">Barge</Badge>
                            )}
                            {!type.requiresCrane && !type.requiresManitou && !type.requiresBarge && (
                              <span className="text-gray-400 text-xs">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(type)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(type)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Delivery Type' : 'Add New Delivery Type'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <Input
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g., CRANE"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Crane Delivery"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Description of this delivery type..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Duration (minutes)</label>
                <Input
                  name="defaultDurationMin"
                  type="number"
                  value={formData.defaultDurationMin}
                  onChange={handleChange}
                  placeholder="e.g., 60"
                />
              </div>
              {/* Removed Max Lift Weight (kg) field */}
              <div className="md:col-span-2 space-y-3">
                <label className="block text-sm font-medium text-gray-700">Equipment Requirements</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requiresCrane"
                    name="requiresCrane"
                    checked={formData.requiresCrane}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requiresCrane" className="text-sm text-gray-700">
                    Requires Crane
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requiresManitou"
                    name="requiresManitou"
                    checked={formData.requiresManitou}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requiresManitou" className="text-sm text-gray-700">
                    Requires Manitou
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requiresBarge"
                    name="requiresBarge"
                    checked={formData.requiresBarge}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requiresBarge" className="text-sm text-gray-700">
                    Requires Barge
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">
                {editingType ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
