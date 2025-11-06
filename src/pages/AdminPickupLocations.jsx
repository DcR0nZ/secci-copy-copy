import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from "@/components/ui/use-toast";
import { Plus, Search, MapPin, Filter } from 'lucide-react';
import PickupLocationCard from '../components/locations/PickupLocationCard';
import PickupLocationDetailsModal from '../components/locations/PickupLocationDetailsModal';

export default function AdminPickupLocationsPage() {
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    shortname: '',
    company: '',
    sheetType: '',
    address: '',
    status: 'ACTIVE'
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, statusFilter, locations]);

  const fetchLocations = async () => {
    try {
      const allLocations = await base44.entities.PickupLocation.list();
      setLocations(allLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Error",
        description: "Failed to load pickup locations.",
        variant: "destructive",
      });
    }
  };

  const handleSearch = () => {
    let filtered = [...locations];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(loc =>
        loc.name.toLowerCase().includes(query) ||
        loc.company.toLowerCase().includes(query) ||
        loc.address.toLowerCase().includes(query) ||
        (loc.shortname && loc.shortname.toLowerCase().includes(query)) ||
        (loc.sheetType && loc.sheetType.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(loc => loc.status === statusFilter);
    }

    setFilteredLocations(filtered);
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      shortname: location.shortname || '',
      company: location.company,
      sheetType: location.sheetType || '',
      address: location.address,
      status: location.status
    });
    setFormOpen(true);
  };

  const handleDelete = async (locationId) => {
    try {
      await base44.entities.PickupLocation.delete(locationId);
      toast({
        title: "Location Deleted",
        description: "Pickup location has been deleted successfully.",
      });
      fetchLocations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete pickup location.",
        variant: "destructive",
      });
      console.error("Failed to delete location:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingLocation) {
        await base44.entities.PickupLocation.update(editingLocation.id, formData);
        toast({
          title: "Location Updated",
          description: "Pickup location has been updated successfully.",
        });
      } else {
        await base44.entities.PickupLocation.create(formData);
        toast({
          title: "Location Created",
          description: "New pickup location has been created successfully.",
        });
      }
      
      setFormOpen(false);
      setEditingLocation(null);
      setFormData({
        name: '',
        shortname: '',
        company: '',
        sheetType: '',
        address: '',
        status: 'ACTIVE'
      });
      fetchLocations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save pickup location. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save location:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pickup Locations</h1>
          <p className="text-gray-600 mt-1">Manage supplier pickup locations and warehouses</p>
        </div>
        <Button onClick={() => {
          setEditingLocation(null);
          setFormData({
            name: '',
            shortname: '',
            company: '',
            sheetType: '',
            address: '',
            status: 'ACTIVE'
          });
          setFormOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, company, address, short name, or sheet type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredLocations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-center">
              {searchQuery || statusFilter !== 'ALL' ? 'No locations found matching your filters.' : 'No pickup locations yet. Add your first location to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((location) => (
            <PickupLocationCard
              key={location.id}
              location={location}
              onClick={() => {
                setSelectedLocation(location);
                setDetailsModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Pickup Location' : 'Add New Pickup Location'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Company/Supplier *
                </label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="e.g., CSR Gyprock"
                  required
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name *
                </label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Brendale Warehouse"
                  required
                />
              </div>

              <div>
                <label htmlFor="shortname" className="block text-sm font-medium text-gray-700 mb-1">
                  Short Name
                </label>
                <Input
                  id="shortname"
                  name="shortname"
                  value={formData.shortname}
                  onChange={handleChange}
                  placeholder="e.g., BRE, GYPR"
                />
                <p className="text-xs text-gray-500 mt-1">Optional short code for quick identification</p>
              </div>

              <div>
                <label htmlFor="sheetType" className="block text-sm font-medium text-gray-700 mb-1">
                  Sheet Type
                </label>
                <Input
                  id="sheetType"
                  name="sheetType"
                  value={formData.sheetType}
                  onChange={handleChange}
                  placeholder="e.g., Gyprock, Villaboard"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Full address including suburb and postcode"
                  required
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <Select 
                  name="status" 
                  value={formData.status} 
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (editingLocation ? 'Update Location' : 'Create Location')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PickupLocationDetailsModal
        location={selectedLocation}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}