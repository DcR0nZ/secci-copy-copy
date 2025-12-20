import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { Clock, Play, Square, Send, Edit } from 'lucide-react';
import { format } from 'date-fns';
import GeofenceTracker from '../components/timesheet/GeofenceTracker';

export default function MyTimesheetPage() {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState('');
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [editMinutes, setEditMinutes] = useState('');
  const [editReason, setEditReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ['mySessions', today],
    queryFn: () => base44.entities.ShiftSession.filter({ 
      userId: user.id, 
      dateKey: today 
    }),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: timesheet } = useQuery({
    queryKey: ['myTimesheet', today],
    queryFn: async () => {
      const timesheets = await base44.entities.DailyTimesheet.filter({ 
        userId: user.id, 
        dateKey: today 
      });
      return timesheets[0] || null;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: settings } = useQuery({
    queryKey: ['timesheetSettings'],
    queryFn: async () => {
      const tenantId = user.tenantId || 'sec';
      const settingsList = await base44.entities.TimesheetSettings.filter({ tenantId });
      return settingsList[0] || null;
    },
    enabled: !!user,
  });

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutesWorked || 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const isOnShift = user?.userWorkStatus === 'ON_SHIFT';
  const hasOpenSession = sessions.some(s => !s.endAt);

  const handleToggleShift = async () => {
    if (!settings?.allowManualShiftToggle) {
      toast({
        title: "Manual toggle disabled",
        description: "Contact your administrator to enable manual shift toggle",
        variant: "destructive",
      });
      return;
    }

    const newStatus = isOnShift ? 'OFF_SHIFT' : 'ON_SHIFT';
    
    try {
      // Update user status
      await base44.auth.updateMe({
        userWorkStatus: newStatus,
        lastWorkStatusChangedAt: new Date().toISOString()
      });

      if (newStatus === 'ON_SHIFT') {
        // Start new session
        await base44.entities.ShiftSession.create({
          tenantId: user.tenantId || 'sec',
          userId: user.id,
          userName: user.full_name,
          dateKey: today,
          startAt: new Date().toISOString(),
          source: 'MANUAL'
        });
      } else {
        // End open session
        const openSession = sessions.find(s => !s.endAt);
        if (openSession) {
          const now = new Date();
          const start = new Date(openSession.startAt);
          const minutesWorked = Math.floor((now - start) / 60000);
          
          await base44.entities.ShiftSession.update(openSession.id, {
            endAt: now.toISOString(),
            minutesWorked
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['mySessions'] });
      queryClient.invalidateQueries({ queryKey: ['myTimesheet'] });
      
      toast({
        title: newStatus === 'ON_SHIFT' ? "Shift Started" : "Shift Ended",
        description: `You are now ${newStatus === 'ON_SHIFT' ? 'on' : 'off'} shift`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle shift status",
        variant: "destructive",
      });
    }
  };

  const handleSubmitDay = async () => {
    try {
      if (timesheet) {
        await base44.entities.DailyTimesheet.update(timesheet.id, {
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
          notes,
          minutesWorked: totalMinutes
        });
      } else {
        await base44.entities.DailyTimesheet.create({
          tenantId: user.tenantId || 'sec',
          userId: user.id,
          userName: user.full_name,
          dateKey: today,
          minutesWorked: totalMinutes,
          notes,
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString()
        });
      }

      queryClient.invalidateQueries({ queryKey: ['myTimesheet'] });
      
      toast({
        title: "Timesheet Submitted",
        description: "Your timesheet has been submitted for approval",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit timesheet",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const canEdit = !timesheet || timesheet.status === 'DRAFT';

  return (
    <>
      {settings?.geofenceEnabled && (
        <GeofenceTracker user={user} settings={settings} />
      )}
      
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Timesheet</h1>
          <p className="text-gray-600 mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>

        {/* Status Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Current Status</p>
                  <Badge className={`text-lg px-4 py-1 mt-1 ${isOnShift ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {isOnShift ? 'ON SHIFT' : 'OFF SHIFT'}
                  </Badge>
                </div>
              </div>
              
              {settings?.allowManualShiftToggle && (
                <Button
                  onClick={handleToggleShift}
                  size="lg"
                  className={isOnShift ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                >
                  {isOnShift ? (
                    <>
                      <Square className="h-5 w-5 mr-2" />
                      End Shift
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start Shift
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hours Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">
              {hours}h {minutes}m
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Total: {totalMinutes} minutes
            </p>
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No sessions today</p>
            ) : (
              sessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{session.source}</Badge>
                      {session.isEdited && <Badge className="bg-orange-100 text-orange-800">Edited</Badge>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(new Date(session.startAt), 'h:mm a')} - 
                      {session.endAt ? format(new Date(session.endAt), ' h:mm a') : ' Ongoing'}
                    </p>
                    {session.editReason && (
                      <p className="text-xs text-gray-500 mt-1">Note: {session.editReason}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{session.minutesWorked || 0} min</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about today's work..."
              rows={4}
              disabled={!canEdit}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={handleSubmitDay} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-5 w-5 mr-2" />
              Submit Timesheet
            </Button>
          </div>
        )}

        {timesheet?.status === 'SUBMITTED' && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <p className="text-yellow-800 font-medium">
                Timesheet submitted and awaiting approval
              </p>
            </CardContent>
          </Card>
        )}

        {timesheet?.status === 'APPROVED' && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-green-800 font-medium">
                Timesheet approved by {timesheet.approvedByName}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}