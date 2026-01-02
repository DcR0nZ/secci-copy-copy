import AccessPending from './pages/AccessPending';
import AdminCustomers from './pages/AdminCustomers';
import AdminDeliveryTypes from './pages/AdminDeliveryTypes';
import AdminJobs from './pages/AdminJobs';
import AdminPickupLocations from './pages/AdminPickupLocations';
import AdminUsers from './pages/AdminUsers';
import CustomerPortal from './pages/CustomerPortal';
import CustomerRequestDelivery from './pages/CustomerRequestDelivery';
import DailyJobBoard from './pages/DailyJobBoard';
import Dashboard from './pages/Dashboard';
import DataExport from './pages/DataExport';
import DeliveryPartners from './pages/DeliveryPartners';
import DriverMobile from './pages/DriverMobile';
import DriverMyRuns from './pages/DriverMyRuns';
import DriverVehicle from './pages/DriverVehicle';
import FleetManagement from './pages/FleetManagement';
import Home from './pages/Home';
import JobsKanban from './pages/JobsKanban';
import LiveTracking from './pages/LiveTracking';
import ManageTenants from './pages/ManageTenants';
import MyTimesheet from './pages/MyTimesheet';
import Notifications from './pages/Notifications';
import Phonebook from './pages/Phonebook';
import Reports from './pages/Reports';
import SchedulingBoard from './pages/SchedulingBoard';
import Settings from './pages/Settings';
import SheetSpecs from './pages/SheetSpecs';
import TestEmails from './pages/TestEmails';
import TimesheetsAndRosters from './pages/TimesheetsAndRosters';
import WeatherToday from './pages/WeatherToday';
import TenantRolesManagement from './pages/TenantRolesManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccessPending": AccessPending,
    "AdminCustomers": AdminCustomers,
    "AdminDeliveryTypes": AdminDeliveryTypes,
    "AdminJobs": AdminJobs,
    "AdminPickupLocations": AdminPickupLocations,
    "AdminUsers": AdminUsers,
    "CustomerPortal": CustomerPortal,
    "CustomerRequestDelivery": CustomerRequestDelivery,
    "DailyJobBoard": DailyJobBoard,
    "Dashboard": Dashboard,
    "DataExport": DataExport,
    "DeliveryPartners": DeliveryPartners,
    "DriverMobile": DriverMobile,
    "DriverMyRuns": DriverMyRuns,
    "DriverVehicle": DriverVehicle,
    "FleetManagement": FleetManagement,
    "Home": Home,
    "JobsKanban": JobsKanban,
    "LiveTracking": LiveTracking,
    "ManageTenants": ManageTenants,
    "MyTimesheet": MyTimesheet,
    "Notifications": Notifications,
    "Phonebook": Phonebook,
    "Reports": Reports,
    "SchedulingBoard": SchedulingBoard,
    "Settings": Settings,
    "SheetSpecs": SheetSpecs,
    "TestEmails": TestEmails,
    "TimesheetsAndRosters": TimesheetsAndRosters,
    "WeatherToday": WeatherToday,
    "TenantRolesManagement": TenantRolesManagement,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};