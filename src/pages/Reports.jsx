import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Truck, 
  Clock, 
  CheckCircle2, 
  Download,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, parseISO, differenceInDays, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { createPageUrl } from '@/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const TRUCKS = ['All', 'ACCO1', 'ACCO2', 'FUSO', 'ISUZU', 'UD'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deliveryTypes, setDeliveryTypes] = useState([]);
  
  // Filters
  const [dateRange, setDateRange] = useState('30days');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTruck, setSelectedTruck] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
  
  // Computed data
  const [kpis, setKpis] = useState({
    totalJobs: 0,
    completedJobs: 0,
    totalSqm: 0,
    podUploadRate: 0,
    difficultDeliveries: 0
  });
  
  const [chartData, setChartData] = useState({
    sqmTrends: [],
    customerActivity: [],
    sqmLeaderboard: [],
    truckPerformance: [],
    statusBreakdown: []
  });

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        if (user.role !== 'admin' && user.appRole !== 'dispatcher' && user.appRole !== 'manager') {
          window.location.href = createPageUrl('Dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking access:', error);
        window.location.href = createPageUrl('Dashboard');
      }
    };
    
    checkAccess();
  }, []);

  useEffect(() => {
    if (dateRange === 'custom') return;
    
    const today = new Date();
    let start = today;
    
    switch (dateRange) {
      case '7days':
        start = subDays(today, 7);
        break;
      case '30days':
        start = subDays(today, 30);
        break;
      case '90days':
        start = subDays(today, 90);
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        break;
      case 'lastMonth':
        start = startOfMonth(subDays(today, 30));
        setEndDate(format(endOfMonth(subDays(today, 30)), 'yyyy-MM-dd'));
        break;
      default:
        start = subDays(today, 30);
    }
    
    setStartDate(format(start, 'yyyy-MM-dd'));
    if (dateRange !== 'lastMonth') {
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  }, [dateRange]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        const [allJobs, allAssignments, allCustomers, allDeliveryTypes] = await Promise.all([
          base44.entities.Job.list(),
          base44.entities.Assignment.list(),
          base44.entities.Customer.list(),
          base44.entities.DeliveryType.list()
        ]);
        
        setJobs(allJobs);
        setAssignments(allAssignments);
        setCustomers(allCustomers);
        setDeliveryTypes(allDeliveryTypes);
        
        calculateMetrics(allJobs, allAssignments, allCustomers, allDeliveryTypes);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser) {
      fetchData();
    }
  }, [currentUser, startDate, endDate, selectedTruck, selectedCustomer]);

  const calculateMetrics = (allJobs, allAssignments, allCustomers, allDeliveryTypes) => {
    // Filter jobs by date range
    const filteredJobs = allJobs.filter(job => {
      const jobDate = job.requestedDate || job.created_date;
      const inDateRange = jobDate >= startDate && jobDate <= endDate;
      const matchesTruck = selectedTruck === 'All' || 
        allAssignments.some(a => a.jobId === job.id && a.truckId === selectedTruck);
      const matchesCustomer = selectedCustomer === 'All' || job.customerId === selectedCustomer;
      
      return inDateRange && matchesTruck && matchesCustomer;
    });

    // Calculate KPIs
    const totalJobs = filteredJobs.length;
    const completedJobs = filteredJobs.filter(j => j.status === 'DELIVERED').length;
    const difficultDeliveries = filteredJobs.filter(j => j.isDifficultDelivery).length;
    
    // Total SQM
    const totalSqm = filteredJobs.reduce((sum, job) => sum + (job.sqm || 0), 0);
    
    // POD Upload Rate
    const jobsWithPOD = filteredJobs.filter(j => j.podFiles && j.podFiles.length > 0).length;
    const podUploadRate = totalJobs > 0 ? (jobsWithPOD / totalJobs) * 100 : 0;

    setKpis({
      totalJobs,
      completedJobs,
      totalSqm: Math.round(totalSqm),
      podUploadRate: Math.round(podUploadRate),
      difficultDeliveries
    });

    // SQM Trends - Week by Week
    try {
      const weeks = eachWeekOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
      }, { weekStartsOn: 1 }); // Monday as start of week

      const sqmByWeek = {};
      weeks.forEach(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'MMM dd');
        sqmByWeek[weekKey] = 0;
      });

      filteredJobs.forEach(job => {
        const jobDate = parseISO(job.requestedDate || job.created_date);
        const weekStart = startOfWeek(jobDate, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'MMM dd');
        
        if (sqmByWeek.hasOwnProperty(weekKey)) {
          sqmByWeek[weekKey] += (job.sqm || 0);
        }
      });

      const sqmTrends = Object.entries(sqmByWeek).map(([week, sqm]) => ({
        week,
        sqm: Math.round(sqm)
      }));

      setChartData(prev => ({ ...prev, sqmTrends }));
    } catch (error) {
      console.error('Error calculating SQM trends:', error);
      setChartData(prev => ({ ...prev, sqmTrends: [] }));
    }

    // Customer activity (top 10)
    const jobsByCustomer = {};
    filteredJobs.forEach(job => {
      const customerName = job.customerName || 'Unknown';
      jobsByCustomer[customerName] = (jobsByCustomer[customerName] || 0) + 1;
    });
    
    const customerActivity = Object.entries(jobsByCustomer)
      .map(([name, count]) => ({ name, jobs: count }))
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 10);

    // SQM Delivered Leaderboard (by truck)
    const sqmByTruck = {};
    TRUCKS.slice(1).forEach(truck => {
      sqmByTruck[truck] = 0;
    });
    
    allAssignments.forEach(assignment => {
      const job = filteredJobs.find(j => j.id === assignment.jobId);
      if (job && assignment.date >= startDate && assignment.date <= endDate && job.status === 'DELIVERED') {
        sqmByTruck[assignment.truckId] = (sqmByTruck[assignment.truckId] || 0) + (job.sqm || 0);
      }
    });
    
    const sqmLeaderboard = Object.entries(sqmByTruck)
      .map(([name, sqm]) => ({ name, sqm: Math.round(sqm) }))
      .sort((a, b) => b.sqm - a.sqm);

    // Truck performance (job count)
    const jobsByTruck = {};
    TRUCKS.slice(1).forEach(truck => {
      jobsByTruck[truck] = 0;
    });
    
    allAssignments.forEach(assignment => {
      const job = filteredJobs.find(j => j.id === assignment.jobId);
      if (job && assignment.date >= startDate && assignment.date <= endDate) {
        jobsByTruck[assignment.truckId] = (jobsByTruck[assignment.truckId] || 0) + 1;
      }
    });
    
    const truckPerformance = Object.entries(jobsByTruck).map(([name, jobs]) => ({ name, jobs }));

    // Status breakdown
    const jobsByStatus = {};
    filteredJobs.forEach(job => {
      const status = job.status || 'UNKNOWN';
      jobsByStatus[status] = (jobsByStatus[status] || 0) + 1;
    });
    
    const statusBreakdown = Object.entries(jobsByStatus).map(([name, value]) => ({ 
      name: name.replace(/_/g, ' '), 
      value 
    }));

    setChartData(prev => ({
      ...prev,
      customerActivity,
      sqmLeaderboard,
      truckPerformance,
      statusBreakdown
    }));
  };

  const exportToCSV = () => {
    const filteredJobs = jobs.filter(job => {
      const jobDate = job.requestedDate || job.created_date;
      const inDateRange = jobDate >= startDate && jobDate <= endDate;
      const matchesTruck = selectedTruck === 'All' || 
        assignments.some(a => a.jobId === job.id && a.truckId === selectedTruck);
      const matchesCustomer = selectedCustomer === 'All' || job.customerId === selectedCustomer;
      
      return inDateRange && matchesTruck && matchesCustomer;
    });

    const headers = ['Job ID', 'Customer', 'Delivery Type', 'Requested Date', 'Status', 'Truck', 'SQM', 'POD Uploaded', 'Location'];
    const rows = filteredJobs.map(job => {
      const assignment = assignments.find(a => a.jobId === job.id);
      return [
        job.id,
        job.customerName,
        job.deliveryTypeName,
        job.requestedDate,
        job.status,
        assignment?.truckId || 'Unassigned',
        job.sqm || 0,
        (job.podFiles && job.podFiles.length > 0) ? 'Yes' : 'No',
        job.deliveryLocation
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery_report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const exportToPDF = async () => {
    // Generate a summary report
    const reportContent = `
DELIVERY ANALYTICS REPORT
Date Range: ${format(parseISO(startDate), 'MMM dd, yyyy')} - ${format(parseISO(endDate), 'MMM dd, yyyy')}
Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}

KEY PERFORMANCE INDICATORS
- Total Jobs: ${kpis.totalJobs}
- Completed Jobs: ${kpis.completedJobs}
- Total SQM Delivered: ${kpis.totalSqm.toLocaleString()} m²
- POD Upload Rate: ${kpis.podUploadRate}%
- Difficult Deliveries: ${kpis.difficultDeliveries}

TOP CUSTOMERS
${chartData.customerActivity.slice(0, 5).map((c, i) => `${i + 1}. ${c.name}: ${c.jobs} jobs`).join('\n')}

SQM DELIVERED LEADERBOARD
${chartData.sqmLeaderboard.map((t, i) => `${i + 1}. ${t.name}: ${t.sqm.toLocaleString()} m²`).join('\n')}

TRUCK PERFORMANCE (Job Count)
${chartData.truckPerformance.map(t => `${t.name}: ${t.jobs} jobs`).join('\n')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery_report_${startDate}_to_${endDate}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  if (!currentUser || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Performance insights and data visualization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Truck</label>
              <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRUCKS.map(truck => (
                    <SelectItem key={truck} value={truck}>{truck}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Customer</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Customers</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalJobs}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.completedJobs}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total SQM</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalSqm.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">POD Upload Rate</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold text-gray-900">{kpis.podUploadRate}%</p>
                  {kpis.podUploadRate >= 90 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : kpis.podUploadRate >= 70 ? (
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
              <FileCheck className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Difficult Deliveries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.difficultDeliveries}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SQM Trends Week by Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Total SQM - Week by Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.sqmTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sqm" fill="#3b82f6" name="Square Meters" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SQM Delivered Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-600" />
              SQM Delivered Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.sqmLeaderboard}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sqm" fill="#f59e0b" name="Square Meters" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.customerActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="jobs" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Truck Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-indigo-600" />
              Truck Performance (Job Count)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.truckPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="jobs" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            Job Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {chartData.statusBreakdown.map((status, index) => (
              <div key={status.name} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                  {status.value}
                </p>
                <p className="text-sm text-gray-600 mt-1">{status.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}