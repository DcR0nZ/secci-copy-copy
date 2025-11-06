
import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Package, Truck, Cloud, Droplets, Clock as ClockIcon, CheckCircle, Camera, AlertTriangle } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { createPageUrl } from '@/utils';
import LocationTracker from '../components/tracking/LocationTracker';

export default function DriverDashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayStats, setTodayStats] = useState({
    totalSqm: 0,
    totalDeliveries: 0,
    completedDeliveries: 0,
    waitingForPOD: 0,
    difficultDeliveries: 0
  });
  const [fleetStats, setFleetStats] = useState({
    totalSqm: 0,
    totalDeliveries: 0
  });
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [updatingTruck, setUpdatingTruck] = useState(false);

  const TRUCKS = [
    { id: 'ACCO1', name: 'ACCO1' },
    { id: 'ACCO2', name: 'ACCO2' },
    { id: 'FUSO', name: 'FUSO' },
    { id: 'ISUZU', name: 'ISUZU' },
    { id: 'UD', name: 'UD' }
  ];

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Separate function to fetch only weather, memoized with useCallback
  const fetchWeatherOnly = useCallback(async () => {
    try {
      const response = await base44.functions.invoke('getWeather');
      if (response.data && response.data.data) {
        setWeather(response.data.data);
        setWeatherError(null);
      } else if (response.data && response.data.error) {
        setWeatherError(response.data.error);
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      setWeatherError('Failed to load weather data');
    }
  }, []); // Dependencies are stable (setWeather, setWeatherError are stable from useState)

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      // Check if user is a driver or machine operator
      const isDriver = user.appRole === 'driver';
      const isMachineOperator = user.appRole === 'outreachOperator';
      
      if (!isDriver && !isMachineOperator) {
        window.location.href = createPageUrl('DailyJobBoard');
        return;
      }

      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

      // Fetch ALL assignments for today (fleet-wide)
      const [allTodayAssignments, allJobs] = await Promise.all([
        base44.entities.Assignment.list(),
        base44.entities.Job.list()
      ]);

      // Filter to today's assignments
      const todayAssignments = allTodayAssignments.filter(a => a.date === today);

      // Calculate fleet-wide stats
      const fleetJobIds = todayAssignments.map(a => a.jobId);
      const fleetJobs = allJobs.filter(job => fleetJobIds.includes(job.id));
      const fleetTotalSqm = fleetJobs.reduce((sum, job) => sum + (job.sqm || 0), 0);

      setFleetStats({
        totalSqm: fleetTotalSqm,
        totalDeliveries: fleetJobs.length
      });

      // If user is a driver but no truck assigned, or if machine operator, reset driver-specific data
      if (isDriver && !user.truck) {
        setLoading(false);
        // Reset driver-specific stats if no truck is assigned
        setTodayStats({
          totalSqm: 0,
          totalDeliveries: 0,
          completedDeliveries: 0,
          waitingForPOD: 0,
          difficultDeliveries: 0
        });
        // Weather is now handled by visibility change listener, not reset here.
        return;
      }

      let myAssignments = [];
      if (isDriver && user.truck) {
        myAssignments = todayAssignments.filter(a => a.truckId === user.truck);
      } else if (isMachineOperator && user.machineName) {
        myAssignments = todayAssignments.filter(a => a.machineName === user.machineName);
      }
      
      // Get jobs for today's assignments
      const jobIds = myAssignments.map(a => a.jobId);
      const todayJobs = allJobs.filter(job => jobIds.includes(job.id));

      // Calculate driver-specific stats
      const totalSqm = todayJobs.reduce((sum, job) => sum + (job.sqm || 0), 0);
      const completedDeliveries = todayJobs.filter(job => job.status === 'DELIVERED').length;
      const waitingForPOD = todayJobs.filter(job =>
        job.status === 'DELIVERED' && (!job.podFiles || job.podFiles.length === 0)
      ).length;
      const difficultDeliveries = todayJobs.filter(job => job.isDifficultDelivery).length;

      setTodayStats({
        totalSqm,
        totalDeliveries: todayJobs.length,
        completedDeliveries,
        waitingForPOD,
        difficultDeliveries
      });

      // Fetch weather only if page is visible on initial load
      if (!document.hidden) {
        await fetchWeatherOnly();
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchWeatherOnly]); // fetchData depends on fetchWeatherOnly

  useEffect(() => {
    fetchData();

    // Listen for page visibility changes
    const handleVisibilityChange = () => {
      // Only fetch weather when page becomes visible AND weather data is not already present
      if (!document.hidden && !weather) {
        fetchWeatherOnly();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, weather, fetchWeatherOnly]); // Added weather and fetchWeatherOnly to dependencies

  const handleTruckChange = async (newTruckId) => {
    setUpdatingTruck(true);
    try {
      await base44.auth.updateMe({ truck: newTruckId === '' ? null : newTruckId });
      await fetchData();
    } catch (error) {
      console.error('Failed to update truck assignment:', error);
    } finally {
      setUpdatingTruck(false);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getWeatherIcon = (condition) => {
    if (condition?.toLowerCase().includes('rain')) {
      return <Droplets className="h-8 w-8 text-blue-500" />;
    }
    return <Cloud className="h-8 w-8 text-gray-500" />;
  };

  if (loading && !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (currentUser && currentUser.appRole !== 'driver' && currentUser.appRole !== 'outreachOperator') {
    return (
      <div className="text-center p-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Driver/Operator Access Only</h2>
            <p className="text-gray-600">
              This dashboard is only available to drivers and machine operators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isDriver = currentUser.appRole === 'driver';
  const isMachineOperator = currentUser.appRole === 'outreachOperator';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header Section */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {getGreeting()}, {currentUser?.full_name?.split(' ')[0] || 'there'}
            </h1>
            {isDriver && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gray-600">Truck:</span>
                <select
                  value={currentUser.truck || ''}
                  onChange={(e) => handleTruckChange(e.target.value)}
                  disabled={updatingTruck}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-semibold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">Select a truck...</option>
                  {TRUCKS.map(truck => (
                    <option key={truck.id} value={truck.id}>{truck.name}</option>
                  ))}
                </select>
                {updatingTruck && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
            )}
            {isMachineOperator && currentUser.machineName && (
              <p className="text-gray-600 mt-2">Machine: {currentUser.machineName}</p>
            )}
          </div>

          {/* Location Tracker */}
          {(isDriver || isMachineOperator) && (
            <LocationTracker trackingType={isMachineOperator ? 'machine' : 'driver'} />
          )}

          {!currentUser.truck && isDriver ? (
            <Card className="max-w-md">
              <CardContent className="pt-6 text-center">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Truck Selected</h2>
                <p className="text-gray-600">
                  Please select a truck from the dropdown above to view your dashboard and assignments.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Clock and Weather Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Clock Card */}
                <Card className="bg-gradient-to-br from-blue-500 to-blue-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="text-white">
                        <p className="text-sm font-medium opacity-90">Current Time</p>
                        <p className="text-5xl font-bold mt-2">
                          {format(currentTime, 'h:mm')}
                          <span className="text-2xl ml-2">{format(currentTime, 'a')}</span>
                        </p>
                        <p className="text-lg mt-2 opacity-90">
                          {format(currentTime, 'EEEE, MMMM d, yyyy')}
                        </p>
                      </div>
                      <ClockIcon className="h-16 w-16 text-white opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                {/* Weather Card */}
                <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700">
                  <CardContent className="p-6">
                    <div className="text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium opacity-90">Brisbane Weather</p>
                          {weather ? (
                            <>
                              <div className="flex items-baseline mt-2">
                                <p className="text-5xl font-bold">{Math.round(weather.temp)}°</p>
                                <span className="text-2xl ml-2">C</span>
                              </div>
                              <p className="text-lg mt-2 capitalize opacity-90">{weather.description}</p>
                              <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center gap-2">
                                  <Droplets className="h-4 w-4" />
                                  <span className="text-sm">{weather.rain_chance}% Rain</span>
                                </div>
                                <div className="text-sm">
                                  Humidity: {weather.humidity}%
                                </div>
                              </div>
                            </>
                          ) : weatherError ? (
                            <p className="text-lg mt-2">{weatherError}</p>
                          ) : (
                            <p className="text-lg mt-2">Loading weather...</p>
                          )}
                        </div>
                        <div>
                          {weather && getWeatherIcon(weather.description)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats Section */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Fleet Total SQM */}
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200 bg-blue-50" onClick={() => window.location.href = createPageUrl('DailyJobBoard')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-blue-800">
                        Fleet Total SQM Today
                      </CardTitle>
                      <Truck className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-900">{fleetStats.totalSqm.toLocaleString()}</div>
                      <p className="text-xs text-blue-700 mt-1">Across all {TRUCKS.length} trucks ({fleetStats.totalDeliveries} deliveries)</p>
                    </CardContent>
                  </Card>

                  {/* Total Deliveries Today */}
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = createPageUrl('DriverMyRuns')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        My Deliveries Today
                      </CardTitle>
                      <Truck className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{todayStats.totalDeliveries}</div>
                      <p className="text-xs text-gray-500 mt-1">Assigned to your {isDriver ? 'truck' : 'machine'}</p>
                    </CardContent>
                  </Card>

                  {/* Total SQM Today */}
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = createPageUrl('DriverMyRuns')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        My Total SQM Today
                      </CardTitle>
                      <Package className="h-5 w-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{todayStats.totalSqm.toLocaleString()}</div>
                      <p className="text-xs text-gray-500 mt-1">Square meters to deliver</p>
                    </CardContent>
                  </Card>

                  {/* Completed Deliveries */}
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = createPageUrl('DriverMyRuns')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Completed Deliveries
                      </CardTitle>
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{todayStats.completedDeliveries}</div>
                      <p className="text-xs text-gray-500 mt-1">Successfully delivered today</p>
                    </CardContent>
                  </Card>

                  {/* Waiting for POD Photos */}
                  {todayStats.waitingForPOD > 0 && (
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-amber-200" onClick={() => window.location.href = createPageUrl('DailyJobBoard')}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-700">
                          Waiting for POD Photos
                        </CardTitle>
                        <Camera className="h-5 w-5 text-amber-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-amber-900">{todayStats.waitingForPOD}</div>
                        <p className="text-xs text-amber-600 mt-1">Upload proof of delivery</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Difficult Deliveries */}
                  {todayStats.difficultDeliveries > 0 && (
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-orange-200" onClick={() => window.location.href = createPageUrl('DriverMyRuns')}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-700">
                          Difficult Deliveries
                        </CardTitle>
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-orange-900">{todayStats.difficultDeliveries}</div>
                        <p className="text-xs text-orange-600 mt-1">Requires special attention</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => window.location.href = createPageUrl('DriverMyRuns')}
                    className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
                  >
                    <Truck className="h-6 w-6 text-blue-600 mb-2" />
                    <p className="font-semibold text-gray-900">My Runs</p>
                    <p className="text-sm text-gray-600">View today's deliveries</p>
                  </button>

                  <button
                    onClick={() => window.location.href = createPageUrl('DailyJobBoard')}
                    className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
                  >
                    <Calendar className="h-6 w-6 text-green-600 mb-2" />
                    <p className="font-semibold text-gray-900">Daily Job Board</p>
                    <p className="text-sm text-gray-600">Full schedule overview</p>
                  </button>

                  {todayStats.waitingForPOD > 0 && (
                    <button
                      onClick={() => window.location.href = createPageUrl('DailyJobBoard')}
                      className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg text-left transition-colors border border-amber-200"
                    >
                      <Camera className="h-6 w-6 text-amber-600 mb-2" />
                      <p className="font-semibold text-gray-900">Upload POD Photos</p>
                      <p className="text-sm text-gray-600">{todayStats.waitingForPOD} delivery(s) waiting</p>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
