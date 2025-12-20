import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import {
  Truck,
  MapPin,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Map
} from 'lucide-react';
import FleetMapView from '../components/fleet/FleetMapView';
import TruckMaintenanceHistory from '../components/fleet/TruckMaintenanceHistory';
import MaintenanceOverview from '../components/fleet/MaintenanceOverview';

export default function FleetManagementPage() {
  const [selectedTruck, setSelectedTruck] = useState(null);

  const { data: trucks = [], isLoading: trucksLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => base44.entities.Truck.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['fleetLocations'],
    queryFn: async () => {
      const allLocations = await base44.entities.LocationUpdate.list('-created_date');
      // Get latest location per truck
      const latestByTruck = {};
      allLocations.forEach(loc => {
        if (loc.truckId && (!latestByTruck[loc.truckId] || 
            new Date(loc.timestamp) > new Date(latestByTruck[loc.truckId].timestamp))) {
          latestByTruck[loc.truckId] = loc;
        }
      });
      return Object.values(latestByTruck);
    },
    refetchInterval: 30000,
  });

  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => base44.entities.Maintenance.list('-created_date'),
  });

  const activeTrucks = trucks.filter(t => t.isActive);
  const inactiveTrucks = trucks.filter(t => !t.isActive);

  const getMaintenanceStats = (truckId) => {
    const truckMaintenance = maintenanceRecords.filter(m => m.truckId === truckId);
    const openIssues = truckMaintenance.filter(m => m.status !== 'completed' && m.status !== 'resolved').length;
    const criticalIssues = truckMaintenance.filter(m => 
      m.severity === 'critical' && (m.status !== 'completed' && m.status !== 'resolved')
    ).length;
    return { openIssues, criticalIssues };
  };

  const getTruckLocation = (truckId) => {
    return locations.find(l => l.truckId === truckId);
  };

  if (trucksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fleet Management</h1>
        <p className="text-gray-600 mt-1">Monitor trucks, track maintenance, and view fleet location</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <Truck className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map className="h-4 w-4 mr-2" />
            Live Map
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Wrench className="h-4 w-4 mr-2" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Fleet Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Trucks</p>
                    <p className="text-3xl font-bold text-green-600">{activeTrucks.length}</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Out of Service</p>
                    <p className="text-3xl font-bold text-gray-600">{inactiveTrucks.length}</p>
                  </div>
                  <Clock className="h-10 w-10 text-gray-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Open Issues</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {maintenanceRecords.filter(m => m.status !== 'completed' && m.status !== 'resolved').length}
                    </p>
                  </div>
                  <Wrench className="h-10 w-10 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Critical Issues</p>
                    <p className="text-3xl font-bold text-red-600">
                      {maintenanceRecords.filter(m => 
                        m.severity === 'critical' && m.status !== 'completed' && m.status !== 'resolved'
                      ).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trucks List */}
          <Card>
            <CardHeader>
              <CardTitle>Fleet Roster</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeTrucks.map(truck => {
                  const location = getTruckLocation(truck.id);
                  const stats = getMaintenanceStats(truck.id);
                  
                  return (
                    <Card key={truck.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="bg-blue-100 p-3 rounded-lg">
                              <Truck className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg">{truck.name}</h3>
                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                                {stats.criticalIssues > 0 && (
                                  <Badge className="bg-red-100 text-red-800">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {stats.criticalIssues} Critical
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-4 text-sm text-gray-600">
                                <span>Capacity: {truck.capacity}t</span>
                                {location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    Last seen {new Date(location.timestamp).toLocaleTimeString()}
                                  </span>
                                )}
                                {stats.openIssues > 0 && (
                                  <span className="text-orange-600">
                                    {stats.openIssues} open {stats.openIssues === 1 ? 'issue' : 'issues'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedTruck(truck)}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <FleetMapView trucks={trucks} locations={locations} />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <MaintenanceOverview 
            trucks={trucks} 
            maintenanceRecords={maintenanceRecords}
          />
        </TabsContent>
      </Tabs>

      {selectedTruck && (
        <TruckMaintenanceHistory
          truck={selectedTruck}
          open={!!selectedTruck}
          onClose={() => setSelectedTruck(null)}
        />
      )}
    </div>
  );
}