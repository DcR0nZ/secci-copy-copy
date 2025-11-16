import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Package, Clock, Navigation, AlertTriangle, CheckCircle2, Truck as TruckIcon, Radio, AlertCircle, ExternalLink, RefreshCw, WifiOff } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import JobDetailsDialog from '../components/scheduling/JobDetailsDialog';
import LocationTracker from '../components/tracking/LocationTracker';
import { useToast } from '@/components/ui/use-toast';
import { updateJobStatus } from '@/functions/updateJobStatus';
import { useOffline } from '../components/offline/OfflineManager';
import { getJobCardStyles } from '../components/scheduling/DeliveryTypeColorUtils';
import DeliveryTypeLegend from '../components/scheduling/DeliveryTypeLegend';
import { useQuery } from '@tanstack/react-query';

const STATUS_OPTIONS = [
  { value: 'EN_ROUTE', label: 'En Route', icon: TruckIcon, color: 'bg-blue-600' },
  { value: 'ARRIVED', label: 'Arrived', icon: MapPin, color: 'bg-green-600' },
  { value: 'UNLOADING', label: 'Unloading', icon: Package, color: 'bg-purple-600' },
  { value: 'PROBLEM', label: 'Problem', icon: AlertCircle, color: 'bg-red-600' },
  { value: 'COMPLETED', label: 'Completed', icon: CheckCircle2, color: 'bg-emerald-600' }
];

export default function DriverMyRuns() {
  const [currentUser, setCurrentUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [problemDetails, setProblemDetails] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [changingTruck, setChangingTruck] = useState(false);

  const { toast } = useToast();
  const { isOnline, cacheJobs, cacheAssignments, getCachedJobs, getCachedAssignments } = useOffline();

  // Fetch delivery types for color coding
  const { data: deliveryTypes = [] } = useQuery({
    queryKey: ['deliveryTypes'],
    queryFn: () => base44.entities.DeliveryType.list(),
    staleTime: 60000,
  });

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      if (user.truck) {
        let allAssignments, allJobs;

        if (isOnline) {
          // Online - fetch from server, filtering out cancelled jobs for drivers
          [allAssignments, allJobs] = await Promise.all([
            base44.entities.Assignment.list(),
            base44.entities.Job.filter({
              status: { $in: ['PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'DELIVERED'] }
            })
          ]);

          // Cache for offline use
          await cacheAssignments(allAssignments);
          await cacheJobs(allJobs);
        } else {
          // Offline - use cached data
          [allAssignments, allJobs] = await Promise.all([
            getCachedAssignments(),
            getCachedJobs()
          ]);

          // Filter out cancelled jobs from cached data as well
          allJobs = allJobs.filter(job =>
            job.status !== 'CANCELLED'
          );

          if (allJobs.length === 0) {
            toast({
              title: "No Offline Data",
              description: "Please connect to internet at least once to cache your schedule.",
              variant: "destructive",
            });
          }
        }

        const myAssignments = allAssignments.filter(a => a.truckId === user.truck);
        setAssignments(myAssignments);

        const myJobIds = myAssignments.map(a => a.jobId);
        const myJobs = allJobs.filter(j => myJobIds.includes(j.id));
        setJobs(myJobs);
      }
    } catch (error) {
      console.error('Error fetching data:', error);

      if (!isOnline) {
        // Try to load from cache
        try {
          const cachedAssignments = await getCachedAssignments();
          let cachedJobs = await getCachedJobs();

          // Filter out cancelled jobs from cached data
          cachedJobs = cachedJobs.filter(job => job.status !== 'CANCELLED');

          if (currentUser?.truck) {
            const myAssignments = cachedAssignments.filter(a => a.truckId === currentUser.truck);
            setAssignments(myAssignments);

            const myJobIds = myAssignments.map(a => a.jobId);
            const myJobs = cachedJobs.filter(j => myJobIds.includes(j.id));
            setJobs(myJobs);
          }
        } catch (cacheError) {
          console.error('Error loading cached data:', cacheError);
        }
      }
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isOnline]);

  const handleRefresh = async () => {
    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Cannot refresh while offline. Showing cached data.",
      });
      return;
    }

    setRefreshing(true);
    await fetchData(false);

    toast({
      title: "Refreshed",
      description: "Schedule updated successfully.",
    });
  };

  const getJobsForDate = (dateString) => {
    const dateAssignments = assignments.filter(a => a.date === dateString);
    return dateAssignments.map(a => ({
      ...jobs.find(j => j.id === a.jobId),
      assignment: a
    })).filter(item => item.id);
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setJobDialogOpen(true);
  };

  const handleStatusUpdate = (job, status) => {
    setSelectedJob(job);
    setSelectedStatus(status);
    setStatusDialogOpen(true);
    setProblemDetails('');
  };

  const confirmStatusUpdate = async () => {
    if (!selectedJob || !selectedStatus) return;

    if (selectedStatus === 'PROBLEM' && !problemDetails.trim()) {
      toast({
        title: "Problem Details Required",
        description: "Please describe the problem before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Status updates require internet connection.",
        variant: "destructive"
      });
      return;
    }

    setUpdatingStatus(true);
    try {
      let locationData = {};
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (e) {
          console.log('Could not get location for status update');
        }
      }

      await updateJobStatus({
        jobId: selectedJob.id,
        driverStatus: selectedStatus,
        problemDetails: selectedStatus === 'PROBLEM' ? problemDetails : undefined,
        ...locationData
      });

      toast({
        title: "Status Updated!",
        description: `Job status changed to ${STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}`,
      });

      setStatusDialogOpen(false);
      setProblemDetails('');
      await fetchData(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update job status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleJobUpdated = () => {
    fetchData(false);
  };

  const handleTruckChange = async (newTruckId) => {
    setChangingTruck(true);
    try {
      await base44.auth.updateMe({ truck: newTruckId });
      setCurrentUser(prev => ({ ...prev, truck: newTruckId }));
      
      toast({
        title: "Truck Updated",
        description: `Switched to ${newTruckId}`,
      });

      await fetchData(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update truck assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setChangingTruck(false);
    }
  };

  const handleStartNavigation = (job) => {
    if (!job.deliveryLatitude || !job.deliveryLongitude) {
      const address = encodeURIComponent(job.deliveryLocation);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank');
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${job.deliveryLatitude},${job.deliveryLongitude}`,
        '_blank'
      );
    }

    if (isOnline) {
      updateJobStatus({
        jobId: job.id,
        driverStatus: 'EN_ROUTE',
        navigationStarted: true
      });

      fetchData(false);
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

  const todayJobs = getJobsForDate(today);
  const tomorrowJobs = getJobsForDate(tomorrow);

  const upcomingDates = [...new Set(assignments.map(a => a.date))]
    .filter(date => date > tomorrow)
    .sort()
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser?.truck) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">No truck assigned to your account. Please contact your dispatcher.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const JobCard = ({ job }) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === job.driverStatus);
    const StatusIcon = statusOption?.icon || Radio;
    const deliveryType = deliveryTypes.find(dt => dt.id === job.deliveryTypeId);
    const cardStyles = getJobCardStyles(deliveryType, job);

    return (
      <Card
        className="hover:shadow-lg transition-all border-l-4"
        style={{
          borderLeftColor: job.driverStatus === 'PROBLEM' ? '#DC2626' : cardStyles.border,
          backgroundColor: cardStyles.bg + '10' // 10% opacity background
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-semibold text-gray-900">{job.customerName}</h4>
                {deliveryType?.code && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1 shadow-sm"
                    style={{
                      backgroundColor: cardStyles.bg,
                      color: cardStyles.text,
                      border: `1px solid ${cardStyles.border}`
                    }}
                    aria-label={cardStyles.name}
                  >
                    {cardStyles.icon && <span>{cardStyles.icon}</span>}
                    {deliveryType.code}
                  </span>
                )}
                {job.driverStatus && (
                  <Badge className={statusOption?.color || 'bg-gray-600'}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusOption?.label || job.driverStatus}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{job.deliveryTypeName}</p>
            </div>
            <Button
              size="sm"
              onClick={() => handleJobClick(job)}
              variant="outline"
            >
              Details
            </Button>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{job.deliveryLocation}</span>
            </div>

            {job.assignment && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  {job.assignment.timeSlotId.replace(/-/g, ' ').toUpperCase()}
                </span>
              </div>
            )}

            {job.sqm && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{job.sqm.toLocaleString()} m²</span>
              </div>
            )}

            {job.siteContactName && (
              <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                <strong>Contact:</strong> {job.siteContactName} - {job.siteContactPhone}
              </div>
            )}

            {job.isDifficultDelivery && (
              <Badge className="bg-orange-500 text-white">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Difficult Delivery
              </Badge>
            )}
          </div>

          <Button
            onClick={() => handleStartNavigation(job)}
            className="w-full mb-2 bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Start Navigation
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>

          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.filter(s => s.value !== 'COMPLETED').map((statusOpt) => {
              const Icon = statusOpt.icon;
              const isActive = job.driverStatus === statusOpt.value;
              return (
                <Button
                  key={statusOpt.value}
                  onClick={() => handleStatusUpdate(job, statusOpt.value)}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={isActive ? statusOpt.color : ''}
                  disabled={!isOnline && statusOpt.value !== 'COMPLETED'}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {statusOpt.label}
                </Button>
              );
            })}
          </div>

          {job.driverStatus === 'PROBLEM' && job.problemDetails && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              <strong>Problem:</strong> {job.problemDetails}
            </div>
          )}

          {job.status === 'DELIVERED' && (
            <Badge className="w-full justify-center mt-2 bg-green-600 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              DELIVERY COMPLETED
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            My Runs
            {!isOnline && (
              <Badge className="bg-orange-500 text-white">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <Select
              value={currentUser.truck || ''}
              onValueChange={handleTruckChange}
              disabled={changingTruck || !isOnline}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select truck" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACCO1">ACCO1</SelectItem>
                <SelectItem value="ACCO2">ACCO2</SelectItem>
                <SelectItem value="FUSO">FUSO</SelectItem>
                <SelectItem value="ISUZU">ISUZU</SelectItem>
                <SelectItem value="UD">UD</SelectItem>
              </SelectContent>
            </Select>
            {!isOnline && jobs.length > 0 && (
              <span className="text-sm text-gray-600">Showing cached schedule</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DeliveryTypeLegend />
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={!isOnline || refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {!isOnline && jobs.length === 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6 text-center">
            <WifiOff className="h-12 w-12 text-orange-500 mx-auto mb-3" />
            <h3 className="font-semibold text-orange-900 mb-2">No Offline Data Available</h3>
            <p className="text-sm text-orange-700">
              Connect to internet at least once to cache your schedule for offline access.
            </p>
          </CardContent>
        </Card>
      )}

      <LocationTracker />

      {/* Today's Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Deliveries ({todayJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No deliveries scheduled for today</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {todayJobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tomorrow's Jobs */}
      {tomorrowJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Tomorrow's Deliveries ({tomorrowJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {tomorrowJobs.map(job => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Jobs */}
      {upcomingDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {upcomingDates.map(date => {
                const dateJobs = getJobsForDate(date);
                return (
                  <div key={date}>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {dateJobs.map(job => (
                        <JobCard key={job.id} job={job} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <JobDetailsDialog
        job={selectedJob}
        open={jobDialogOpen}
        onOpenChange={setJobDialogOpen}
        onJobUpdated={handleJobUpdated}
      />

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Job Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Customer: <strong>{selectedJob?.customerName}</strong></p>
              <p className="text-sm text-gray-600">New Status: <strong className="text-blue-600">{STATUS_OPTIONS.find(s => s.value === selectedStatus)?.label}</strong></p>
            </div>
            {selectedStatus === 'PROBLEM' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Problem Details *</label>
                <Textarea
                  value={problemDetails}
                  onChange={(e) => setProblemDetails(e.target.value)}
                  placeholder="Describe the problem (e.g., access blocked, wrong address, customer not available)..."
                  className="min-h-[100px]"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmStatusUpdate} disabled={updatingStatus || !isOnline}>
              {updatingStatus ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}