import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { DndContext, DragOverlay, closestCorners, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Truck, Users, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import RosterCard from './RosterCard';

export default function RostersTab({ user }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState(null);

  const tenantId = user.tenantId || 'sec';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', tenantId],
    queryFn: () => base44.entities.Truck.filter({ tenantId, isActive: true }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', tenantId],
    queryFn: async () => {
      const allUsers = await base44.asServiceRole.entities.User.list();
      return allUsers.filter(u => 
        u.tenantId === tenantId && 
        u.isTimesheetEnabled !== false &&
        (u.appRole === 'driver' || u.appRole === 'dispatcher')
      );
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['rosterAssignments', tenantId, selectedDate],
    queryFn: () => base44.entities.RosterAssignment.filter({ tenantId, dateKey: selectedDate }),
  });

  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return emp.full_name?.toLowerCase().includes(query) || emp.email?.toLowerCase().includes(query);
  });

  const getEmployeesForTruck = (truckId) => {
    const assignedIds = assignments
      .filter(a => a.truckId === truckId)
      .sort((a, b) => a.position - b.position)
      .map(a => a.userId);
    
    return filteredEmployees.filter(emp => assignedIds.includes(emp.id));
  };

  const getUnassignedEmployees = () => {
    const assignedIds = assignments
      .filter(a => a.truckId)
      .map(a => a.userId);
    
    return filteredEmployees.filter(emp => !assignedIds.includes(emp.id));
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const userId = active.id;
    const targetTruckId = over.id === 'unassigned' ? null : over.id;

    try {
      const existingAssignment = assignments.find(a => a.userId === userId);
      const targetTruck = trucks.find(t => t.id === targetTruckId);

      if (existingAssignment) {
        await base44.entities.RosterAssignment.update(existingAssignment.id, {
          truckId: targetTruckId,
          truckName: targetTruck?.name || null
        });
      } else {
        const employee = employees.find(e => e.id === userId);
        await base44.entities.RosterAssignment.create({
          tenantId,
          dateKey: selectedDate,
          truckId: targetTruckId,
          truckName: targetTruck?.name || null,
          userId: employee.id,
          userName: employee.full_name,
          position: 0
        });
      }

      queryClient.invalidateQueries({ queryKey: ['rosterAssignments'] });
      
      toast({
        title: "Roster Updated",
        description: `Assignment updated successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update roster",
        variant: "destructive",
      });
    }
  };

  const activeEmployee = activeId ? employees.find(e => e.id === activeId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
            <CalendarIcon className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none bg-transparent text-sm font-medium focus:outline-none"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}>
            Today
          </Button>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Unassigned Pool */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employees
                </span>
                <Badge variant="secondary">{getUnassignedEmployees().length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SortableContext id="unassigned" items={getUnassignedEmployees().map(e => e.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 min-h-[200px]">
                  {getUnassignedEmployees().map(employee => (
                    <RosterCard key={employee.id} employee={employee} />
                  ))}
                  {getUnassignedEmployees().length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-8">All assigned</p>
                  )}
                </div>
              </SortableContext>
            </CardContent>
          </Card>

          {/* Truck Columns */}
          {trucks.map(truck => (
            <Card key={truck.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    {truck.name}
                  </span>
                  <Badge variant="secondary">{getEmployeesForTruck(truck.id).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SortableContext id={truck.id} items={getEmployeesForTruck(truck.id).map(e => e.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2 min-h-[200px]">
                    {getEmployeesForTruck(truck.id).map(employee => (
                      <RosterCard key={employee.id} employee={employee} />
                    ))}
                    {getEmployeesForTruck(truck.id).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">No assignments</p>
                    )}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          ))}
        </div>

        <DragOverlay>
          {activeEmployee ? (
            <div className="bg-white p-3 rounded-lg border-2 border-blue-500 shadow-lg">
              <p className="font-medium">{activeEmployee.full_name}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}