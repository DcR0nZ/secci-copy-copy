import SchedulingBoard from './pages/SchedulingBoard';
import AdminJobs from './pages/AdminJobs';
import CustomerRequestDelivery from './pages/CustomerRequestDelivery';
import Home from './pages/Home';
import DailyJobBoard from './pages/DailyJobBoard';
import AdminUsers from './pages/AdminUsers';
import AccessPending from './pages/AccessPending';
import AdminCustomers from './pages/AdminCustomers';
import AdminPickupLocations from './pages/AdminPickupLocations';
import AdminDeliveryTypes from './pages/AdminDeliveryTypes';
import DriverMyRuns from './pages/DriverMyRuns';
import Dashboard from './pages/Dashboard';
import WeatherToday from './pages/WeatherToday';
import TestEmails from './pages/TestEmails';
import Reports from './pages/Reports';
import LiveTracking from './pages/LiveTracking';
import __Layout from './Layout.jsx';


export const PAGES = {
    "SchedulingBoard": SchedulingBoard,
    "AdminJobs": AdminJobs,
    "CustomerRequestDelivery": CustomerRequestDelivery,
    "Home": Home,
    "DailyJobBoard": DailyJobBoard,
    "AdminUsers": AdminUsers,
    "AccessPending": AccessPending,
    "AdminCustomers": AdminCustomers,
    "AdminPickupLocations": AdminPickupLocations,
    "AdminDeliveryTypes": AdminDeliveryTypes,
    "DriverMyRuns": DriverMyRuns,
    "Dashboard": Dashboard,
    "WeatherToday": WeatherToday,
    "TestEmails": TestEmails,
    "Reports": Reports,
    "LiveTracking": LiveTracking,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};