import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';

export default function TimesheetReviewTab({ user }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  const tenantId = user.tenantId || 'sec';

  const { data: timesheets = [] } = useQuery({
    queryKey: ['dailyTimesheets', tenantId, selectedDate],
    queryFn: () => base44.entities.DailyTimesheet.filter({ tenantId, dateKey: selectedDate }),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['allSessions', tenantId, selectedDate],
    queryFn: () => base44.entities.ShiftSession.filter({ tenantId, dateKey: selectedDate }),
  });

  const filteredTimesheets = timesheets.filter(ts => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return ts.userName?.toLowerCase().includes(query);
  });

  const getSessionsForUser = (userId) => {
    return sessions.filter(s => s.userId === userId);
  };

  const handleApprove = async (timesheetId) => {
    try {
      const timesheet = timesheets.find(ts => ts.id === timesheetId);
      
      await base44.entities.DailyTimesheet.update(timesheetId, {
        ...timesheet,
        status: 'APPROVED',
        approvedByUserId: user.id,
        approvedByName: user.full_name,
        approvedAt: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['dailyTimesheets'] });
      
      toast({
        title: "Timesheet Approved",
        description: "Timesheet has been approved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve timesheet",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimesheets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No timesheets for this date
                  </TableCell>
                </TableRow>
              ) : (
                filteredTimesheets.map(timesheet => {
                  const userSessions = getSessionsForUser(timesheet.userId);
                  const hours = Math.floor(timesheet.minutesWorked / 60);
                  const minutes = timesheet.minutesWorked % 60;

                  return (
                    <TableRow key={timesheet.id}>
                      <TableCell className="font-medium">{timesheet.userName}</TableCell>
                      <TableCell>{userSessions.length} session(s)</TableCell>
                      <TableCell>{hours}h {minutes}m</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(timesheet.status)}>
                          {timesheet.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-gray-600 truncate">
                          {timesheet.notes || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {timesheet.status === 'SUBMITTED' && (
                          <Button
                            size="sm"
                            onClick={() => handleApprove(timesheet.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}