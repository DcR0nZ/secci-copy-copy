import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  Package,
  Phone,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import MobilePODCapture from '../components/driver/MobilePODCapture';
import MobileJobDetails from '../components/driver/MobileJobDetails';
import TurnByTurnNavigation from '../components/driver/TurnByTurnNavigation';
import OfflineSyncManager, { OfflineUtils } from '../components/driver/OfflineSyncManager';
import GeofenceTracker from '../components/driver/GeofenceTracker';
import DriverChat from '../components/driver/DriverChat';

export default function DriverMobilePage() {
  const [user, setUser] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showPOD, setShowPOD] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['mobileDriverJobs'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      try {
        const response = await base44.functions.invoke('mobileDriverJobsList', {
          userId: currentUser.id,
          truck: currentUser.truck
        });
        
        const fetchedJobs = response.data.jobs || [];
        
        // Cache jobs for offline use
        OfflineUtils.cacheJobs(fetchedJobs);
        
        return fetchedJobs;
      } catch (error) {
        // If offline, return cached jobs
        console.log('Using cached jobs - offline mode');
        return OfflineUtils.getCachedJobs();
      }
    },
    refetchInterval: 30000,
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const todayJobs = jobs.filter(job => {
    const today = new Date().toDateString();
    const jobDate = job.assignment ? new Date(job.assignment.date).toDateString() : null;
    return jobDate === today;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'NOT_STARTED': return 'bg-gray-100 text-gray-800';
      case 'EN_ROUTE': return 'bg-blue-100 text-blue-800';
      case 'ARRIVED': return 'bg-purple-100 text-purple-800';
      case 'UNLOADING': return 'bg-orange-100 text-orange-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PROBLEM': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'EN_ROUTE': return <Navigation className="h-4 w-4" />;
      case 'ARRIVED': return <MapPin className="h-4 w-4" />;
      case 'UNLOADING': return <Package className="h-4 w-4" />;
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      case 'PROBLEM': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleStatusUpdate = async (job, newStatus) => {
    try {
      const response = await base44.functions.invoke('mobileUpdateJobStatus', {
        jobId: job.id,
        status: newStatus,
        driverStatus: newStatus,
        userId: user.id,
        userName: user.full_name
      });

      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['mobileDriverJobs'] });
        toast({
          title: "Status Updated",
          description: `Job marked as ${newStatus.replace('_', ' ').toLowerCase()}.`,
        });
      }
    } catch (error) {
      // Queue for offline sync
      OfflineUtils.queueStatusUpdate({
        jobId: job.id,
        status: newStatus,
        driverStatus: newStatus,
        userId: user.id,
        userName: user.full_name
      });
      
      toast({
        title: "Queued for Sync",
        description: "Status will update when online.",
      });
    }
  };

  const handleNavigate = (job) => {
    // Use in-app navigation if coordinates available
    if (job.deliveryLatitude && job.deliveryLongitude && currentLocation) {
      setSelectedJob(job);
      setShowNavigation(true);
      handleStatusUpdate(job, 'EN_ROUTE');
    } else {
      // Fallback to external navigation
      const address = encodeURIComponent(job.deliveryLocation);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /android/i.test(navigator.userAgent);

      let url;
      if (isIOS) {
        url = `maps://maps.apple.com/?daddr=${address}`;
      } else if (isAndroid) {
        url = `google.navigation:q=${address}`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
      }

      window.location.href = url;
      handleStatusUpdate(job, 'EN_ROUTE');
    }
  };

  const handleCallContact = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showNavigation && selectedJob && currentLocation) {
    return (
      <TurnByTurnNavigation
        job={selectedJob}
        currentLocation={currentLocation}
        onClose={() => {
          setShowNavigation(false);
          setSelectedJob(null);
        }}
      />
    );
  }

  if (showPOD && selectedJob) {
    return (
      <MobilePODCapture
        job={selectedJob}
        user={user}
        onComplete={() => {
          setShowPOD(false);
          setSelectedJob(null);
          queryClient.invalidateQueries({ queryKey: ['mobileDriverJobs'] });
        }}
        onCancel={() => {
          setShowPOD(false);
          setSelectedJob(null);
        }}
      />
    );
  }

  if (showDetails && selectedJob) {
    return (
      <MobileJobDetails
        job={selectedJob}
        onBack={() => {
          setShowDetails(false);
          setSelectedJob(null);
        }}
        onNavigate={() => handleNavigate(selectedJob)}
        onCall={() => handleCallContact(selectedJob.siteContactPhone)}
        onStatusUpdate={(status) => handleStatusUpdate(selectedJob, status)}
        onCompletePOD={() => setShowPOD(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Offline Sync Manager */}
      {user && (
        <OfflineSyncManager
          userId={user.id}
          truck={user.truck}
          onJobsUpdate={() => queryClient.invalidateQueries({ queryKey: ['mobileDriverJobs'] })}
        />
      )}

      {/* Geofence Tracker */}
      {user && jobs.length > 0 && (
        <GeofenceTracker
          jobs={todayJobs}
          user={user}
          onStatusChange={handleStatusUpdate}
        />
      )}

      {/* Driver Chat */}
      {user && (
        <DriverChat
          user={user}
          isOpen={showChat}
          onToggle={() => setShowChat(!showChat)}
        />
      )}

      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-bold">Today's Deliveries</h1>
        <p className="text-sm text-blue-100">
          {todayJobs.length} {todayJobs.length === 1 ? 'delivery' : 'deliveries'}
        </p>
      </div>

      {/* Jobs List */}
      <div className="p-4 space-y-3">
        {todayJobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">No deliveries scheduled for today</p>
            </CardContent>
          </Card>
        ) : (
          todayJobs.map((job, index) => (
            <Card
              key={job.id}
              className="overflow-hidden cursor-pointer active:scale-98 transition-transform"
              onClick={() => {
                setSelectedJob(job);
                setShowDetails(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 text-blue-700 font-bold rounded-full h-8 w-8 flex items-center justify-center text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">{job.customerName}</h3>
                      <p className="text-xs text-gray-600">
                        {job.deliveryTypeName}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(job.driverStatus)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(job.driverStatus)}
                      <span className="text-xs">
                        {(job.driverStatus || 'NOT_STARTED').replace('_', ' ')}
                      </span>
                    </span>
                  </Badge>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{job.deliveryLocation}</p>
                  </div>
                  
                  {job.siteContactName && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <p className="text-sm text-gray-700">{job.siteContactName}</p>
                    </div>
                  )}

                  {job.estimatedArrivalTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <p className="text-sm text-gray-700">ETA: {job.estimatedArrivalTime}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate(job);
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    Navigate
                  </Button>
                  
                  {job.driverStatus !== 'COMPLETED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        setShowPOD(true);
                      }}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedJob(job);
                      setShowDetails(true);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}