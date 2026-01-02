import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Toaster } from '@/components/ui/toaster';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  Menu,
  Truck,
  Users,
  Briefcase,
  Settings,
  LayoutGrid,
  Calendar,
  User as UserIcon,
  MapPin,
  Plus,
  CloudRain,
  Library,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
  Home,
  BarChart3,
  Bell,
  Clock,
  ChevronDown
} from 'lucide-react';

import ChatWidget from './components/chat/ChatWidget';
import { OfflineProvider } from './components/offline/OfflineManager';
import ReturnedJobAlert from './components/scheduling/ReturnedJobAlert';
import UserAvatarDropdown from './components/layout/UserAvatarDropdown';
import NotificationBell from './components/notifications/NotificationBell';

const NavIconLink = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          to={to}
          onClick={onClick}
          className={`flex items-center justify-center h-10 w-10 rounded-lg transition-all ${
            isActive
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <Icon className="h-5 w-5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-medium">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

const MobileNavLink = ({ to, icon: Icon, children, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-5 w-5 mr-3" />
      {children}
    </Link>
  );
};

const MobileSubNavLink = ({ to, children, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ml-8 ${
        isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
};

const AdminNav = ({ onNavigate }) => {
  const location = useLocation();
  const libraryPages = [
    createPageUrl('AdminJobs'),
    createPageUrl('JobsKanban'),
    createPageUrl('AdminCustomers'),
    createPageUrl('AdminUsers'),
    createPageUrl('AdminPickupLocations'),
    createPageUrl('AdminDeliveryTypes'),
    createPageUrl('SheetSpecs'),
    createPageUrl('DeliveryPartners')
  ];
  const isLibraryActive = libraryPages.includes(location.pathname);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  
  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        setIsGlobalAdmin(user?.appRole === 'globalAdmin');
      } catch (e) {
        setIsGlobalAdmin(false);
      }
    };
    checkUser();
  }, []);

  return (
    <>
      <NavIconLink to={createPageUrl('Dashboard')} icon={Home} label="Dashboard" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('SchedulingBoard')} icon={LayoutGrid} label="Scheduling" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('DailyJobBoard')} icon={Calendar} label="Daily Job Board" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('LiveTracking')} icon={MapPin} label="Live Tracking" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('Reports')} icon={BarChart3} label="Reports" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('Phonebook')} icon={Users} label="Phonebook" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('Notifications')} icon={Bell} label="Notifications" onClick={onNavigate} />
      
      <DropdownMenu>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center justify-center h-10 w-10 rounded-lg transition-all ${
                isLibraryActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}>
                <Library className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-medium">
            <p>Company Library</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminJobs'); }}>All Jobs</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminCustomers'); }}>Customers</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminUsers'); }}>System Users</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminPickupLocations'); }}>Pickup Locations</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminDeliveryTypes'); }}>Delivery Types</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('SheetSpecs'); }}>Sheet Specs</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('DeliveryPartners'); }}>Delivery Partners</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {isGlobalAdmin && <NavIconLink to={createPageUrl('ManageTenants')} icon={Settings} label="Manage Tenants" onClick={onNavigate} />}
      <NavIconLink to={createPageUrl('TimesheetsAndRosters')} icon={Clock} label="Timesheets" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('WeatherToday')} icon={CloudRain} label="Weather Today" onClick={onNavigate} />
    </>
  );
};

      const DispatcherNav = ({ onNavigate }) => {
  const location = useLocation();
  const libraryPages = [
    createPageUrl('AdminJobs'),
    createPageUrl('JobsKanban'),
    createPageUrl('AdminCustomers'),
    createPageUrl('AdminPickupLocations'),
    createPageUrl('AdminDeliveryTypes'),
    createPageUrl('DeliveryPartners')
  ];
  const isLibraryActive = libraryPages.includes(location.pathname);

  return (
    <>
      <NavIconLink to={createPageUrl('Dashboard')} icon={Home} label="Dashboard" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('SchedulingBoard')} icon={LayoutGrid} label="Scheduling" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('DailyJobBoard')} icon={Calendar} label="Daily Job Board" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('LiveTracking')} icon={MapPin} label="Live Tracking" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('Reports')} icon={BarChart3} label="Reports" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('Phonebook')} icon={Users} label="Phonebook" onClick={onNavigate} />

      <DropdownMenu>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center justify-center h-10 w-10 rounded-lg transition-all ${
                isLibraryActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}>
                <Library className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-medium">
            <p>Company Library</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminJobs'); }}>All Jobs</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('JobsKanban'); }}>Jobs Kanban</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminCustomers'); }}>Customers</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminPickupLocations'); }}>Pickup Locations</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminDeliveryTypes'); }}>Delivery Types</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('DeliveryPartners'); }}>Delivery Partners</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NavIconLink to={createPageUrl('TimesheetsAndRosters')} icon={Clock} label="Timesheets" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('WeatherToday')} icon={CloudRain} label="Weather Today" onClick={onNavigate} />
    </>
  );
};

      const DriverNav = ({ onNavigate }) => (
  <>
    <NavIconLink to={createPageUrl('Dashboard')} icon={Home} label="Dashboard" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('DriverMyRuns')} icon={Calendar} label="My Runs" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('MyTimesheet')} icon={Clock} label="My Timesheet" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('DailyJobBoard')} icon={LayoutGrid} label="Daily Job Board" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('Phonebook')} icon={Users} label="Phonebook" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('WeatherToday')} icon={CloudRain} label="Weather Today" onClick={onNavigate} />
  </>
);

const CustomerNav = ({ onNavigate }) => (
  <>
    <NavIconLink to={createPageUrl('AdminJobs')} icon={Briefcase} label="My Jobs" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('DailyJobBoard')} icon={Calendar} label="Daily Schedule" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('CustomerRequestDelivery')} icon={Plus} label="Request Delivery" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('Phonebook')} icon={Users} label="Phonebook" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('Notifications')} icon={Bell} label="Notifications" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('WeatherToday')} icon={CloudRain} label="Weather Today" onClick={onNavigate} />
    <NavIconLink to={createPageUrl('Settings')} icon={Settings} label="Settings" onClick={onNavigate} />
  </>
);

const ManagerNav = ({ onNavigate }) => {
  const location = useLocation();
  const libraryPages = [
    createPageUrl('AdminJobs'),
    createPageUrl('AdminCustomers')
  ];
  const isLibraryActive = libraryPages.includes(location.pathname);

  return (
    <>
      <NavIconLink to={createPageUrl('Dashboard')} icon={Home} label="Dashboard" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('DailyJobBoard')} icon={Calendar} label="Daily Job Board" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('Reports')} icon={BarChart3} label="Reports" onClick={onNavigate} />
      <NavIconLink to={createPageUrl('Phonebook')} icon={Users} label="Phonebook" onClick={onNavigate} />

      <DropdownMenu>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center justify-center h-10 w-10 rounded-lg transition-all ${
                isLibraryActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}>
                <Library className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-medium">
            <p>Company Library</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminJobs'); }}>All Jobs</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { onNavigate?.(); window.location.href = createPageUrl('AdminCustomers'); }}>Customers</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <NavIconLink to={createPageUrl('WeatherToday')} icon={CloudRain} label="Weather Today" onClick={onNavigate} />
    </>
  );
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [returnedJobs, setReturnedJobs] = useState([]);
  const [showReturnedAlert, setShowReturnedAlert] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        if (!mounted) return;
        
        setUser(currentUser);

        // Check for returned jobs that need alerts (for admin, dispatcher, manager, customer)
        const shouldCheckReturned = currentUser.role === 'admin' || 
          currentUser.appRole === 'dispatcher' || 
          currentUser.appRole === 'tenantAdmin' ||
          currentUser.appRole === 'manager' ||
          currentUser.appRole === 'customer';
        
        if (shouldCheckReturned) {
          try {
            const allJobs = await base44.entities.Job.filter({ status: 'RETURNED' });
            
            // Filter jobs that this user should see alerts for
            const jobsForUser = allJobs.filter(job => {
              // Skip if user already dismissed this alert
              const dismissedBy = job.returnAlertDismissedBy || [];
              if (dismissedBy.includes(currentUser.id)) return false;
              
              // Skip if user chose "remind later" in the same session
              // (returnAlertRemindLater is cleared on new login, so this works)
              const remindLater = job.returnAlertRemindLater || [];
              // For remind later, we show it again (it's stored to track per-session dismissal)
              // But we want to show it on next login, so we actually DON'T filter these out
              
              // Check if user should see this job
              if (currentUser.role === 'admin' || currentUser.appRole === 'dispatcher' || currentUser.appRole === 'tenantAdmin') {
                return true; // Admin, dispatchers, and tenant admins see all
              }
              if (currentUser.appRole === 'manager' || currentUser.appRole === 'customer') {
                // Customers and managers only see their own jobs
                return job.customerId === currentUser.customerId;
              }
              return false;
            });
            
            if (jobsForUser.length > 0) {
              setReturnedJobs(jobsForUser);
              setShowReturnedAlert(true);
            }
          } catch (e) {
            console.error('Failed to check returned jobs:', e);
          }
        }

        const needsCustomerId = currentUser.appRole === 'customer' || currentUser.appRole === 'manager' || !currentUser.appRole;
        const isPending = currentUser && currentUser.role !== 'admin' && needsCustomerId && !currentUser.customerId;

        if (isPending && currentPageName !== 'AccessPending') {
          window.location.href = createPageUrl('AccessPending');
          return;
        }

        // Explicit driver redirect - drivers ALWAYS go to Dashboard on login
        if (currentUser.appRole === 'driver') {
          const isRootPath = location.pathname === '/' || location.pathname === '/app';
          const isLoginCallback = location.search.includes('code=') || location.search.includes('state=');
          
          if ((isRootPath || isLoginCallback) && currentPageName !== 'Dashboard') {
            window.location.href = createPageUrl('Dashboard');
            return;
          }
        }

        const isRootPath = location.pathname === '/' || location.pathname === '/app';
        const isLoginCallback = location.search.includes('code=') || location.search.includes('state=');
        
        if ((isRootPath || isLoginCallback) && !isPending && currentPageName !== 'Dashboard' && currentPageName !== 'AdminJobs' && currentPageName !== 'DailyJobBoard') {
          let dashboardUrl;
          
          if (currentUser.role === 'admin') {
            dashboardUrl = createPageUrl('Dashboard');
          } else if (currentUser.appRole === 'dispatcher') {
            dashboardUrl = createPageUrl('Dashboard');
          } else if (currentUser.appRole === 'driver') {
            dashboardUrl = createPageUrl('Dashboard');
          } else if (currentUser.appRole === 'manager') {
            dashboardUrl = createPageUrl('Dashboard');
          } else if (currentUser.appRole === 'customer') {
            dashboardUrl = createPageUrl('AdminJobs');
          } else if (currentUser.appRole === 'outreach' || currentUser.appRole === 'outreachOperator') {
            dashboardUrl = createPageUrl('Dashboard');
          } else {
            dashboardUrl = createPageUrl('DailyJobBoard');
          }
          
          window.location.href = dashboardUrl;
          return;
        }
      } catch (e) {
        console.error('Authentication error:', e);
        if (!mounted) return;
        
        setError(e);
        if (!window.location.search.includes('code=') && !window.location.search.includes('state=')) {
          const nextUrl = window.location.href;
          base44.auth.redirectToLogin(nextUrl);
        }
        return;
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const handleMobileNavigate = () => {
    setMobileMenuOpen(false);
  };

  const renderNavLinks = (onNavigate) => {
    if (!user) return null;
    const needsCustomerId = user.appRole === 'customer' || user.appRole === 'manager' || !user.appRole;
    const isPending = !!(user && user.role !== 'admin' && needsCustomerId && !user.customerId);

    if (isPending) return null;

    if (user.role === 'admin') {
      return <AdminNav onNavigate={onNavigate} />;
    }

    const appRole = user.appRole;

    switch (appRole) {
      case 'globalAdmin':
        return <AdminNav onNavigate={onNavigate} />;
      case 'tenantAdmin':
        return <AdminNav onNavigate={onNavigate} />;
      case 'dispatcher':
        return <DispatcherNav onNavigate={onNavigate} />;
      case 'driver':
        return <DriverNav onNavigate={onNavigate} />;
      case 'manager':
        return <ManagerNav onNavigate={onNavigate} />;
      case 'customer':
      default:
        return <CustomerNav onNavigate={onNavigate} />;
    }
  };

  const renderMobileNavLinks = (onNavigate) => {
    if (!user) return null;
    const needsCustomerId = user.appRole === 'customer' || user.appRole === 'manager' || !user.appRole;
    const isPending = !!(user && user.role !== 'admin' && needsCustomerId && !user.customerId);

    if (isPending) return null;

    const isCustomer = user.role !== 'admin' && (user.appRole === 'customer' || !user.appRole);
    const isDriver = user.role !== 'admin' && user.appRole === 'driver';
    const appRole = user.appRole;

    if (user.role === 'admin' || appRole === 'globalAdmin' || appRole === 'tenantAdmin') {
      return (
        <>
          <MobileNavLink to={createPageUrl('Dashboard')} icon={Home} onClick={onNavigate}>Dashboard</MobileNavLink>
          <MobileNavLink to={createPageUrl('SchedulingBoard')} icon={LayoutGrid} onClick={onNavigate}>Scheduling</MobileNavLink>
          <MobileNavLink to={createPageUrl('DailyJobBoard')} icon={Calendar} onClick={onNavigate}>Daily Job Board</MobileNavLink>
          <MobileNavLink to={createPageUrl('LiveTracking')} icon={MapPin} onClick={onNavigate}>Live Tracking</MobileNavLink>
          <MobileNavLink to={createPageUrl('Reports')} icon={BarChart3} onClick={onNavigate}>Reports</MobileNavLink>
          <MobileNavLink to={createPageUrl('Phonebook')} icon={Users} onClick={onNavigate}>Phonebook</MobileNavLink>
          <MobileNavLink to={createPageUrl('Notifications')} icon={Bell} onClick={onNavigate}>Notifications</MobileNavLink>
          <MobileNavLink to={createPageUrl('AdminJobs')} icon={Library} onClick={onNavigate}>All Jobs</MobileNavLink>
          <MobileNavLink to={createPageUrl('TimesheetsAndRosters')} icon={Clock} onClick={onNavigate}>Timesheets</MobileNavLink>
          <MobileNavLink to={createPageUrl('WeatherToday')} icon={CloudRain} onClick={onNavigate}>Weather Today</MobileNavLink>
          <MobileNavLink to={createPageUrl('Settings')} icon={Settings} onClick={onNavigate}>Settings</MobileNavLink>
        </>
      );
    }

    if (appRole === 'dispatcher') {
      return (
        <>
          <MobileNavLink to={createPageUrl('Dashboard')} icon={Home} onClick={onNavigate}>Dashboard</MobileNavLink>
          <MobileNavLink to={createPageUrl('SchedulingBoard')} icon={LayoutGrid} onClick={onNavigate}>Scheduling</MobileNavLink>
          <MobileNavLink to={createPageUrl('DailyJobBoard')} icon={Calendar} onClick={onNavigate}>Daily Job Board</MobileNavLink>
          <MobileNavLink to={createPageUrl('LiveTracking')} icon={MapPin} onClick={onNavigate}>Live Tracking</MobileNavLink>
          <MobileNavLink to={createPageUrl('Reports')} icon={BarChart3} onClick={onNavigate}>Reports</MobileNavLink>
          <MobileNavLink to={createPageUrl('Phonebook')} icon={Users} onClick={onNavigate}>Phonebook</MobileNavLink>
          <MobileNavLink to={createPageUrl('Notifications')} icon={Bell} onClick={onNavigate}>Notifications</MobileNavLink>
          <MobileNavLink to={createPageUrl('AdminJobs')} icon={Library} onClick={onNavigate}>All Jobs</MobileNavLink>
          <MobileNavLink to={createPageUrl('TimesheetsAndRosters')} icon={Clock} onClick={onNavigate}>Timesheets</MobileNavLink>
          <MobileNavLink to={createPageUrl('WeatherToday')} icon={CloudRain} onClick={onNavigate}>Weather Today</MobileNavLink>
          <MobileNavLink to={createPageUrl('Settings')} icon={Settings} onClick={onNavigate}>Settings</MobileNavLink>
        </>
      );
    }

    if (isDriver) {
      return (
        <>
          <MobileNavLink to={createPageUrl('Dashboard')} icon={Home} onClick={onNavigate}>Dashboard</MobileNavLink>
          <MobileNavLink to={createPageUrl('DriverMyRuns')} icon={Calendar} onClick={onNavigate}>My Runs</MobileNavLink>
          <MobileNavLink to={createPageUrl('MyTimesheet')} icon={Clock} onClick={onNavigate}>My Timesheet</MobileNavLink>
          <MobileNavLink to={createPageUrl('DailyJobBoard')} icon={LayoutGrid} onClick={onNavigate}>Daily Job Board</MobileNavLink>
          <MobileNavLink to={createPageUrl('Phonebook')} icon={Users} onClick={onNavigate}>Phonebook</MobileNavLink>
          <MobileNavLink to={createPageUrl('Notifications')} icon={Bell} onClick={onNavigate}>Notifications</MobileNavLink>
          <MobileNavLink to={createPageUrl('WeatherToday')} icon={CloudRain} onClick={onNavigate}>Weather Today</MobileNavLink>
          <MobileNavLink to={createPageUrl('Settings')} icon={Settings} onClick={onNavigate}>Settings</MobileNavLink>
        </>
      );
    }

    if (appRole === 'manager') {
      return (
        <>
          <MobileNavLink to={createPageUrl('Dashboard')} icon={Home} onClick={onNavigate}>Dashboard</MobileNavLink>
          <MobileNavLink to={createPageUrl('DailyJobBoard')} icon={Calendar} onClick={onNavigate}>Daily Job Board</MobileNavLink>
          <MobileNavLink to={createPageUrl('Reports')} icon={BarChart3} onClick={onNavigate}>Reports</MobileNavLink>
          <MobileNavLink to={createPageUrl('Phonebook')} icon={Users} onClick={onNavigate}>Phonebook</MobileNavLink>
          <MobileNavLink to={createPageUrl('Notifications')} icon={Bell} onClick={onNavigate}>Notifications</MobileNavLink>
          <MobileNavLink to={createPageUrl('AdminJobs')} icon={Library} onClick={onNavigate}>All Jobs</MobileNavLink>
          <MobileNavLink to={createPageUrl('WeatherToday')} icon={CloudRain} onClick={onNavigate}>Weather Today</MobileNavLink>
          <MobileNavLink to={createPageUrl('Settings')} icon={Settings} onClick={onNavigate}>Settings</MobileNavLink>
        </>
      );
    }

    return (
      <>
        <MobileNavLink to={createPageUrl('AdminJobs')} icon={Briefcase} onClick={onNavigate}>My Jobs</MobileNavLink>
        <MobileNavLink to={createPageUrl('DailyJobBoard')} icon={Calendar} onClick={onNavigate}>Daily Schedule</MobileNavLink>
        <MobileNavLink to={createPageUrl('CustomerRequestDelivery')} icon={Plus} onClick={onNavigate}>Request Delivery</MobileNavLink>
        <MobileNavLink to={createPageUrl('Phonebook')} icon={Users} onClick={onNavigate}>Phonebook</MobileNavLink>
        <MobileNavLink to={createPageUrl('Notifications')} icon={Bell} onClick={onNavigate}>Notifications</MobileNavLink>
        <MobileNavLink to={createPageUrl('WeatherToday')} icon={CloudRain} onClick={onNavigate}>Weather Today</MobileNavLink>
        <MobileNavLink to={createPageUrl('Settings')} icon={Settings} onClick={onNavigate}>Settings</MobileNavLink>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  const needsCustomerId = user.appRole === 'customer' || user.appRole === 'manager' || !user.appRole;
  const isPending = !!(user && user.role !== 'admin' && needsCustomerId && !user.customerId);

  if (isPending && currentPageName === 'AccessPending') {
    return (
      <OfflineProvider>
        <div className="min-h-screen w-full bg-gray-50 overflow-auto">
          <main className="p-6">
            {children}
          </main>
        </div>
      </OfflineProvider>
    );
  }

  const isCustomer = user.role !== 'admin' && (user.appRole === 'customer' || !user.appRole);
  const isDriver = user.role !== 'admin' && user.appRole === 'driver';

  const getToolbarTitle = () => {
    if (user?.appRole === 'globalAdmin') {
      return 'Global Admin';
    }
    if (isCustomer && user.customerName) {
      return user.customerName;
    }
    if (isDriver) {
      return 'Drivers';
    }
    return 'Dispatch';
  };

  return (
    <TooltipProvider>
      <OfflineProvider>
        <style>{`
          html, body, #root {
            height: 100%;
            margin: 0;
            padding: 0;
          }
          
          .pac-container {
            z-index: 999999 !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
            border-radius: 0.375rem !important;
            border: 1px solid #e5e7eb !important;
            margin-top: 4px !important;
            background: white !important;
          }
          
          .pac-item {
            padding: 8px 12px !important;
            cursor: pointer !important;
            border: none !important;
            background: white !important;
            line-height: 1.5 !important;
          }
          
          .pac-item:hover {
            background-color: #f3f4f6 !important;
          }
          
          .pac-item-selected,
          .pac-item-selected:hover {
            background-color: #e5e7eb !important;
          }
          
          .pac-icon {
            margin-right: 8px !important;
          }
          
          .pac-item-query {
            font-weight: 600 !important;
            color: #111827 !important;
          }
          
          .pac-container * {
            pointer-events: auto !important;
          }
        `}</style>
        
        <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden">
          {/* Desktop Top Toolbar */}
          <div className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm z-30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Truck className="h-7 w-7 text-blue-600" />
                <span className="font-semibold text-lg text-gray-900">{getToolbarTitle()}</span>
              </div>
              {user && (
                <div className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                  {user.appRole === 'globalAdmin' ? 'All Tenants' : (() => {
                    const tenantId = user.tenantId || 'sec';
                    const tenantNames = {
                      'sec': 'South East Carters',
                      'bayside_plasterboard': 'Bayside Plasterboard',
                      'outreach_hire': 'Outreach Hire'
                    };
                    return tenantNames[tenantId] || 'South East Carters';
                  })()}
                </div>
              )}
            </div>

            <nav className="flex items-center gap-2">
              {renderNavLinks(() => {})}
            </nav>

            <div className="flex items-center gap-2">
              <UserAvatarDropdown user={user} />
            </div>
          </div>

          {/* Main Content Wrapper */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between z-30">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="touch-manipulation active:bg-gray-100"
                    aria-label="Open menu"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center flex-shrink-0 px-4 pt-5">
                      <Truck className="h-8 w-8 text-blue-600" />
                      <span className="ml-3 font-semibold text-xl">
                        {getToolbarTitle()}
                      </span>
                    </div>
                    
                    {isCustomer && user.customerName && (
                      <div className="px-4 py-2 mx-2 my-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-600 font-medium text-center">Customer Portal</p>
                      </div>
                    )}
                    
                    <nav className="mt-5 flex-1 px-5 space-y-2 overflow-y-auto">
                      {renderMobileNavLinks(handleMobileNavigate)}
                    </nav>
                    <div className="p-5 flex-shrink-0">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-600 hover:bg-gray-100"
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="h-5 w-5 mr-3" />
                        Log Out
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6 text-blue-600" />
                <span className="font-semibold text-lg">{getToolbarTitle()}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <UserAvatarDropdown user={user} />
              </div>
            </div>

            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>

        <ChatWidget />
        <Toaster />
        
        {/* Returned Job Alert Popup */}
        {showReturnedAlert && returnedJobs.length > 0 && user && (
          <ReturnedJobAlert
            returnedJobs={returnedJobs}
            user={user}
            onDismiss={() => setShowReturnedAlert(false)}
            onJobsUpdated={() => {
              base44.entities.Job.filter({ status: 'RETURNED' }).then(jobs => {
                const dismissedBy = jobs.filter(job => {
                  const dismissed = job.returnAlertDismissedBy || [];
                  return !dismissed.includes(user.id);
                });
                setReturnedJobs(dismissedBy);
                if (dismissedBy.length === 0) {
                  setShowReturnedAlert(false);
                }
              });
            }}
          />
        )}
      </OfflineProvider>
    </TooltipProvider>
  );
}