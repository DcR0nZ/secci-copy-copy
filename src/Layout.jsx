
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
  BarChart3
} from 'lucide-react';

import ChatWidget from './components/chat/ChatWidget';
import { OfflineProvider } from './components/offline/OfflineManager';

const NavLink = ({ to, icon: Icon, children, collapsed }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-4'} py-2.5 text-sm font-medium rounded-lg transition-colors ${
        isActive ?
          'bg-blue-600 text-white' :
          'text-gray-600 hover:bg-gray-100'}`
      }
      title={collapsed ? children : ''}
    >
      <Icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
      {!collapsed && children}
    </Link>
  );
};

const SubNavLink = ({ to, children, collapsed }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${collapsed ? '' : 'ml-8'} ${
        isActive ?
          'bg-blue-600 text-white' :
          'text-gray-600 hover:bg-gray-100'}`
      }
      title={collapsed ? children : ''}
    >
      {children}
    </Link>
  );
};

const AdminNav = ({ collapsed }) => {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const location = useLocation();
  
  const libraryPages = [
    createPageUrl('AdminJobs'),
    createPageUrl('AdminCustomers'),
    createPageUrl('AdminUsers'),
    createPageUrl('AdminPickupLocations'),
    createPageUrl('AdminDeliveryTypes')
  ];
  
  const isLibraryActive = libraryPages.includes(location.pathname);

  useEffect(() => {
    if (isLibraryActive && !libraryOpen && !collapsed) {
      setLibraryOpen(true);
    }
  }, [isLibraryActive, libraryOpen, collapsed]);

  useEffect(() => {
    if (collapsed) {
      setLibraryOpen(false);
    }
  }, [collapsed]);
  
  return (
    <>
      <NavLink to={createPageUrl('Dashboard')} icon={Home} collapsed={collapsed}>Dashboard</NavLink>
      <NavLink to={createPageUrl('SchedulingBoard')} icon={LayoutGrid} collapsed={collapsed}>Scheduling</NavLink>
      <NavLink to={createPageUrl('DailyJobBoard')} icon={Calendar} collapsed={collapsed}>Daily Job Board</NavLink>
      <NavLink to={createPageUrl('LiveTracking')} icon={MapPin} collapsed={collapsed}>Live Tracking</NavLink>
      <NavLink to={createPageUrl('Reports')} icon={BarChart3} collapsed={collapsed}>Reports</NavLink>
      
      {!collapsed ? (
        <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isLibraryActive ?
                  'bg-blue-600 text-white' :
                  'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <Library className="h-5 w-5 mr-3" />
                Company Library
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${libraryOpen ? 'rotate-90' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            <SubNavLink to={createPageUrl('AdminJobs')}>All Jobs</SubNavLink>
            <SubNavLink to={createPageUrl('AdminCustomers')}>Customers</SubNavLink>
            <SubNavLink to={createPageUrl('AdminUsers')}>System Users</SubNavLink>
            <SubNavLink to={createPageUrl('AdminPickupLocations')}>Pickup Locations</SubNavLink>
            <SubNavLink to={createPageUrl('AdminDeliveryTypes')}>Delivery Types</SubNavLink>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <NavLink to={createPageUrl('AdminJobs')} icon={Library} collapsed={collapsed}>Library</NavLink>
      )}
      
      <NavLink to={createPageUrl('WeatherToday')} icon={CloudRain} collapsed={collapsed}>Weather Today</NavLink>
    </>
  );
};

const DispatcherNav = ({ collapsed }) => {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const location = useLocation();
  
  const libraryPages = [
    createPageUrl('AdminJobs'),
    createPageUrl('AdminCustomers'),
    createPageUrl('AdminPickupLocations'),
    createPageUrl('AdminDeliveryTypes')
  ];
  
  const isLibraryActive = libraryPages.includes(location.pathname);

  useEffect(() => {
    if (isLibraryActive && !libraryOpen && !collapsed) {
      setLibraryOpen(true);
    }
  }, [isLibraryActive, libraryOpen, collapsed]);

  useEffect(() => {
    if (collapsed) {
      setLibraryOpen(false);
    }
  }, [collapsed]);
  
  return (
    <>
      <NavLink to={createPageUrl('Dashboard')} icon={Home} collapsed={collapsed}>Dashboard</NavLink>
      <NavLink to={createPageUrl('SchedulingBoard')} icon={LayoutGrid} collapsed={collapsed}>Scheduling</NavLink>
      <NavLink to={createPageUrl('DailyJobBoard')} icon={Calendar} collapsed={collapsed}>Daily Job Board</NavLink>
      <NavLink to={createPageUrl('LiveTracking')} icon={MapPin} collapsed={collapsed}>Live Tracking</NavLink>
      <NavLink to={createPageUrl('Reports')} icon={BarChart3} collapsed={collapsed}>Reports</NavLink>
      
      {!collapsed ? (
        <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isLibraryActive ?
                  'bg-blue-600 text-white' :
                  'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <Library className="h-5 w-5 mr-3" />
                Company Library
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${libraryOpen ? 'rotate-90' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            <SubNavLink to={createPageUrl('AdminJobs')}>All Jobs</SubNavLink>
            <SubNavLink to={createPageUrl('AdminCustomers')}>Customers</SubNavLink>
            <SubNavLink to={createPageUrl('AdminPickupLocations')}>Pickup Locations</SubNavLink>
            <SubNavLink to={createPageUrl('AdminDeliveryTypes')}>Delivery Types</SubNavLink>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <NavLink to={createPageUrl('AdminJobs')} icon={Library} collapsed={collapsed}>Library</NavLink>
      )}
      
      <NavLink to={createPageUrl('WeatherToday')} icon={CloudRain} collapsed={collapsed}>Weather Today</NavLink>
    </>
  );
};

const DriverNav = ({ collapsed }) =>
  <>
    <NavLink to={createPageUrl('DriverDashboard')} icon={Home} collapsed={collapsed}>Dashboard</NavLink>
    <NavLink to={createPageUrl('DriverMyRuns')} icon={Calendar} collapsed={collapsed}>My Runs</NavLink>
    <NavLink to={createPageUrl('DailyJobBoard')} icon={LayoutGrid} collapsed={collapsed}>Daily Job Board</NavLink>
    <NavLink to={createPageUrl('WeatherToday')} icon={CloudRain} collapsed={collapsed}>Weather Today</NavLink>
  </>;

const CustomerNav = ({ collapsed }) =>
  <>
    <NavLink to={createPageUrl('AdminJobs')} icon={Briefcase} collapsed={collapsed}>My Jobs</NavLink>
    <NavLink to={createPageUrl('DailyJobBoard')} icon={Calendar} collapsed={collapsed}>Daily Schedule</NavLink>
    <NavLink to={createPageUrl('CustomerRequestDelivery')} icon={Plus} collapsed={collapsed}>Request Delivery</NavLink>
    <NavLink to={createPageUrl('WeatherToday')} icon={CloudRain} collapsed={collapsed}>Weather Today</NavLink>
  </>;

const ManagerNav = ({ collapsed }) => {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const location = useLocation();
  
  const libraryPages = [
    createPageUrl('AdminJobs'),
    createPageUrl('AdminCustomers')
  ];
  
  const isLibraryActive = libraryPages.includes(location.pathname);

  useEffect(() => {
    if (isLibraryActive && !libraryOpen && !collapsed) {
      setLibraryOpen(true);
    }
  }, [isLibraryActive, libraryOpen, collapsed]);

  useEffect(() => {
    if (collapsed) {
      setLibraryOpen(false);
    }
  }, [collapsed]);
  
  return (
    <>
      <NavLink to={createPageUrl('Dashboard')} icon={Home} collapsed={collapsed}>Dashboard</NavLink>
      <NavLink to={createPageUrl('DailyJobBoard')} icon={Calendar} collapsed={collapsed}>Daily Job Board</NavLink>
      <NavLink to={createPageUrl('Reports')} icon={BarChart3} collapsed={collapsed}>Reports</NavLink>
      
      {!collapsed ? (
        <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isLibraryActive ?
                  'bg-blue-600 text-white' :
                  'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <Library className="h-5 w-5 mr-3" />
                Company Library
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${libraryOpen ? 'rotate-90' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            <SubNavLink to={createPageUrl('AdminJobs')}>All Jobs</SubNavLink>
            <SubNavLink to={createPageUrl('AdminCustomers')}>Customers</SubNavLink>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <NavLink to={createPageUrl('AdminJobs')} icon={Library} collapsed={collapsed}>Library</NavLink>
      )}
      
      <NavLink to={createPageUrl('WeatherToday')} icon={CloudRain} collapsed={collapsed}>Weather Today</NavLink>
    </>
  );
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        console.log('Current user:', {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role,
          appRole: currentUser.appRole,
          customerId: currentUser.customerId,
          customerName: currentUser.customerName
        });

        const needsCustomerId = currentUser.appRole === 'customer' || currentUser.appRole === 'manager' || !currentUser.appRole;
        const isPending = currentUser && currentUser.role !== 'admin' && needsCustomerId && !currentUser.customerId;

        if (isPending && currentPageName !== 'AccessPending') {
          window.location.href = createPageUrl('AccessPending');
          return;
        }

        // Redirect to appropriate dashboard on first load (root path or login callback)
        const isRootPath = location.pathname === '/' || location.pathname === '/app';
        const isLoginCallback = location.search.includes('code=') || location.search.includes('state=');
        
        if ((isRootPath || isLoginCallback) && !isPending) {
          let dashboardUrl;
          
          if (currentUser.role === 'admin') {
            dashboardUrl = createPageUrl('Dashboard');
          } else if (currentUser.appRole === 'dispatcher') {
            dashboardUrl = createPageUrl('Dashboard');
          } else if (currentUser.appRole === 'driver') {
            dashboardUrl = createPageUrl('DriverDashboard');
          } else if (currentUser.appRole === 'manager') {
            dashboardUrl = createPageUrl('Dashboard');
          } else if (currentUser.appRole === 'customer') {
            dashboardUrl = createPageUrl('AdminJobs');
          } else if (currentUser.appRole === 'outreach' || currentUser.appRole === 'outreachOperator') {
            dashboardUrl = createPageUrl('Dashboard');
          } else {
            // Default fallback
            dashboardUrl = createPageUrl('DailyJobBoard');
          }
          
          window.location.href = dashboardUrl;
          return;
        }
      } catch (e) {
        console.error('Authentication error:', e);
        if (!window.location.search.includes('code=') && !window.location.search.includes('state=')) {
          const nextUrl = window.location.href;
          base44.auth.redirectToLogin(nextUrl);
        }
        return;
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [currentPageName, location]);

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = createPageUrl('SchedulingBoard');
  };

  const renderNavLinks = () => {
    const needsCustomerId = user.appRole === 'customer' || user.appRole === 'manager' || !user.appRole;
    const isPending = !!(user && user.role !== 'admin' && needsCustomerId && !user.customerId);

    if (isPending) return null;

    if (user.role === 'admin') {
      return <AdminNav collapsed={sidebarCollapsed} />;
    }

    const appRole = user.appRole;

    console.log('Rendering nav for appRole:', appRole);

    switch (appRole) {
      case 'dispatcher':
        return <DispatcherNav collapsed={sidebarCollapsed} />;
      case 'driver':
        return <DriverNav collapsed={sidebarCollapsed} />;
      case 'manager':
        return <ManagerNav collapsed={sidebarCollapsed} />;
      case 'customer':
      default:
        return <CustomerNav collapsed={sidebarCollapsed} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const needsCustomerId = user.appRole === 'customer' || user.appRole === 'manager' || !user.appRole;
  const isPending = !!(user && user.role !== 'admin' && needsCustomerId && !user.customerId);

  if (isPending && currentPageName === 'AccessPending') {
    return (
      <div className="min-h-screen w-full bg-gray-50 overflow-auto">
        <main className="p-4 md:p-6 max-w-5xl mx-auto">
          {children}
        </main>
      </div>
    );
  }

  const isCustomer = user.role !== 'admin' && (user.appRole === 'customer' || !user.appRole);
  const isDriver = user.role !== 'admin' && user.appRole === 'driver';

  const getSidebarTitle = () => {
    if (isCustomer && user.customerName) {
      return user.customerName;
    }
    if (isDriver) {
      return 'Drivers';
    }
    return 'Dispatch';
  };

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  const mainMargin = sidebarCollapsed ? 'md:ml-16' : 'md:ml-64';

  // Wrap ALL content with OfflineProvider to avoid hook errors
  return (
    <OfflineProvider>
      <style>{`
        html, body, #root {
          height: 100%;
          margin: 0;
          padding: 0;
        }
      `}</style>
      
      <div className="h-full w-full flex bg-gray-50">
        {/* Desktop Sidebar */}
        <div className={`hidden md:flex flex-col ${sidebarWidth} border-r bg-white h-full fixed left-0 top-0 z-20 transition-all duration-300`}>
          <div className={`flex items-center flex-shrink-0 px-4 pt-5 pb-4 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            {!sidebarCollapsed && (
              <>
                <Truck className="h-8 w-8 text-blue-600" />
                <span className="ml-3 font-semibold text-xl">
                  {getSidebarTitle()}
                </span>
              </>
            )}
            {sidebarCollapsed && <Truck className="h-8 w-8 text-blue-600" />}
          </div>
          
          {/* Toggle Button */}
          <div className={`px-2 pb-2 flex ${sidebarCollapsed ? 'justify-center' : 'justify-end'}`}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="bg-blue-50 border-2 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 shadow-sm"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
          </div>
          
          {isCustomer && user.customerName && !sidebarCollapsed && (
            <div className="px-4 py-2 mx-2 mb-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-medium text-center">Customer Portal</p>
            </div>
          )}
          
          <nav className="flex-1 px-5 space-y-2 overflow-y-auto">
            {renderNavLinks()}
          </nav>
          <div className="px-5 pb-4 flex-shrink-0">
            <Button
              variant="ghost"
              className={`w-full ${sidebarCollapsed ? 'justify-center px-2' : 'justify-start'} text-gray-600 hover:bg-gray-100`}
              onClick={handleLogout}
              title={sidebarCollapsed ? 'Log Out' : ''}
            >
              <LogOut className={`h-5 w-5 ${sidebarCollapsed ? '' : 'mr-3'}`} />
              {!sidebarCollapsed && 'Log Out'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 flex flex-col ${mainMargin} h-full transition-all duration-300`}>
          {/* Mobile Header */}
          <div className="bg-white pt-1 pr-1 pb-1 pl-1 md:hidden sm:pl-3 sm:pt-3 border-b flex-shrink-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="flex items-center flex-shrink-0 px-4 pt-5">
                    <Truck className="h-8 w-8 text-blue-600" />
                    <span className="ml-3 font-semibold text-xl">
                      {getSidebarTitle()}
                    </span>
                  </div>
                  
                  {isCustomer && user.customerName && (
                    <div className="px-4 py-2 mx-2 my-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium text-center">Customer Portal</p>
                    </div>
                  )}
                  
                  <nav className="mt-5 flex-1 px-5 space-y-2 overflow-y-auto">
                    {renderNavLinks()}
                  </nav>
                  <div className="p-5 flex-shrink-0">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-gray-600 hover:bg-gray-100"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Log Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <main className="flex-1 h-full overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      <ChatWidget />
    </OfflineProvider>
  );
}
