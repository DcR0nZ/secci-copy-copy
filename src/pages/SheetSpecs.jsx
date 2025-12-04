import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, Search, Upload, Download, Loader2 } from 'lucide-react';

const CATEGORIES = ['Plasterboard', 'Fibre Cement', 'Insulation', 'Steel', 'Timber', 'Accessories', 'Other'];

const emptyForm = {
  productCode: '',
  description: '',
  lengthMm: '',
  widthMm: '',
  thicknessMm: '',
  weightKg: '',
  m2PerUnit: '',
  category: '',
  supplier: '',
  status: 'ACTIVE'
};

export default function SheetSpecsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: specs = [], isLoading } = useQuery({
    queryKey: ['itemSpecs'],
    queryFn: () => base44.entities.ItemSpec.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ItemSpec.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemSpecs'] });
      toast({ title: 'Item spec created' });
      handleClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ItemSpec.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemSpecs'] });
      toast({ title: 'Item spec updated' });
      handleClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ItemSpec.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemSpecs'] });
      toast({ title: 'Item spec deleted' });
    }
  });

  const handleOpen = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        productCode: item.productCode || '',
        description: item.description || '',
        lengthMm: item.lengthMm || '',
        widthMm: item.widthMm || '',
        thicknessMm: item.thicknessMm || '',
        weightKg: item.weightKg || '',
        m2PerUnit: item.m2PerUnit || '',
        category: item.category || '',
        supplier: item.supplier || '',
        status: item.status || 'ACTIVE'
      });
    } else {
      setEditingItem(null);
      setFormData(emptyForm);
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData(emptyForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      lengthMm: formData.lengthMm ? Number(formData.lengthMm) : undefined,
      widthMm: formData.widthMm ? Number(formData.widthMm) : undefined,
      thicknessMm: formData.thicknessMm ? Number(formData.thicknessMm) : undefined,
      weightKg: formData.weightKg ? Number(formData.weightKg) : undefined,
      m2PerUnit: formData.m2PerUnit ? Number(formData.m2PerUnit) : undefined
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this item spec?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Product Code', 'Description', 'Length (mm)', 'Width (mm)', 'Thickness (mm)', 'Weight (kg)', 'M² per Unit', 'Category', 'Supplier', 'Status'];
    const rows = specs.map(s => [
      s.productCode, s.description, s.lengthMm || '', s.widthMm || '', s.thicknessMm || '',
      s.weightKg || '', s.m2PerUnit || '', s.category || '', s.supplier || '', s.status
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sheet_specs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      
      if (lines.length < 2) {
        toast({ title: 'Invalid CSV', description: 'File must have headers and at least one data row', variant: 'destructive' });
        e.target.value = '';
        return;
      }

      // Parse headers - handle various formats
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      
      // Helper to find column index with multiple possible names
      const findCol = (...names) => {
        for (const name of names) {
          // Try exact match first
          const exactIdx = headers.findIndex(h => h === name.toLowerCase());
          if (exactIdx !== -1) return exactIdx;
          // Then try contains match
          const idx = headers.findIndex(h => h.includes(name.toLowerCase()));
          if (idx !== -1) return idx;
        }
        return -1;
      };
      
      console.log('CSV Headers found:', headers);
      console.log('m² column index:', findCol('m²', 'm2', 'sqm', 'square', 'area'));

      const descCol = findCol('description');
      const thicknessCol = findCol('thickness');
      const widthCol = findCol('width');
      const lengthCol = findCol('length');
      const weightCol = findCol('weight', 'sheet_weight');
      const m2Col = findCol('m²', 'm2', 'sqm', 'square', 'area');
      const categoryCol = findCol('category');
      const supplierCol = findCol('supplier');
      const productCodeCol = findCol('product code', 'productcode', 'code', 'sku');
      const statusCol = findCol('status');

      if (descCol === -1) {
        toast({ title: 'Missing required column', description: 'CSV must have a "description" column', variant: 'destructive' });
        e.target.value = '';
        return;
      }

      const items = [];
      for (let i = 1; i < lines.length; i++) {
        // Handle CSV values that might contain commas in quotes
        const values = [];
        let current = '';
        let inQuotes = false;
        for (const char of lines[i]) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const getValue = (idx) => idx !== -1 && values[idx] ? values[idx].replace(/"/g, '').trim() : '';
        const getNumber = (idx) => {
          const val = getValue(idx);
          const num = parseFloat(val);
          return !isNaN(num) ? num : undefined;
        };

        const description = getValue(descCol);
        if (!description) continue;

        const item = {
          description,
          productCode: getValue(productCodeCol) || description.substring(0, 50),
          thicknessMm: getNumber(thicknessCol),
          widthMm: getNumber(widthCol),
          lengthMm: getNumber(lengthCol),
          weightKg: getNumber(weightCol),
          m2PerUnit: getNumber(m2Col),
          category: getValue(categoryCol) || undefined,
          supplier: getValue(supplierCol) || undefined,
          status: getValue(statusCol) || 'ACTIVE'
        };

        items.push(item);
      }

      if (items.length === 0) {
        toast({ title: 'No valid items', description: 'No valid rows found in the CSV', variant: 'destructive' });
        e.target.value = '';
        return;
      }

      await base44.entities.ItemSpec.bulkCreate(items);
      queryClient.invalidateQueries({ queryKey: ['itemSpecs'] });
      toast({ title: 'Import successful', description: `Imported ${items.length} items` });
    } catch (error) {
      console.error('CSV import error:', error);
      toast({ title: 'Import failed', description: error.message || 'Failed to import CSV', variant: 'destructive' });
    }
    e.target.value = '';
  };

  const filteredSpecs = specs.filter(s => {
    const matchesSearch = !search || 
      s.productCode?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      s.supplier?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sheet Specs</h1>
          <p className="text-gray-600">Manage product specifications for sheet items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </label>
          </Button>
          <Button onClick={() => handleOpen()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item Spec
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by code, description, or supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Thickness_mm</TableHead>
                <TableHead>Width_mm</TableHead>
                <TableHead>Length_mm</TableHead>
                <TableHead>Sheet_weight_kg</TableHead>
                <TableHead>m²</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSpecs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No item specs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSpecs.map(spec => (
                  <TableRow key={spec.id}>
                    <TableCell>{spec.description}</TableCell>
                    <TableCell>{spec.thicknessMm || '-'}</TableCell>
                    <TableCell>{spec.widthMm || '-'}</TableCell>
                    <TableCell>{spec.lengthMm || '-'}</TableCell>
                    <TableCell>{spec.weightKg || '-'}</TableCell>
                    <TableCell>{spec.m2PerUnit || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(spec)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(spec.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item Spec' : 'Add Item Spec'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Product Code *</label>
                <Input
                  value={formData.productCode}
                  onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Length (mm)</label>
                <Input
                  type="number"
                  value={formData.lengthMm}
                  onChange={(e) => setFormData({ ...formData, lengthMm: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Width (mm)</label>
                <Input
                  type="number"
                  value={formData.widthMm}
                  onChange={(e) => setFormData({ ...formData, widthMm: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Thickness (mm)</label>
                <Input
                  type="number"
                  value={formData.thicknessMm}
                  onChange={(e) => setFormData({ ...formData, thicknessMm: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Weight (kg)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.weightKg}
                  onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">M² per Unit</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.m2PerUnit}
                  onChange={(e) => setFormData({ ...formData, m2PerUnit: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Supplier</label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}