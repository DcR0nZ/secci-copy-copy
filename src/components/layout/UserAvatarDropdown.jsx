import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  LogOut,
  Building2,
  Shield
} from 'lucide-react';

export default function UserAvatarDropdown({ user }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const getInitials = () => {
    if (!user?.full_name) return 'U';
    const names = user.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return user.full_name.substring(0, 2).toUpperCase();
  };

  const getTenantName = () => {
    if (user?.appRole === 'globalAdmin') return 'All Tenants';
    const tenantId = user?.tenantId || 'sec';
    const tenantNames = {
      'sec': 'South East Carters',
      'bayside_plasterboard': 'Bayside Plasterboard',
      'outreach_hire': 'Outreach Hire'
    };
    return tenantNames[tenantId] || 'South East Carters';
  };

  const getRoleLabel = () => {
    if (user?.role === 'admin') return 'Administrator';
    if (user?.appRole === 'globalAdmin') return 'Global Admin';
    if (user?.appRole === 'tenantAdmin') return 'Tenant Admin';
    if (user?.appRole === 'dispatcher') return 'Dispatcher';
    if (user?.appRole === 'driver') return 'Driver';
    if (user?.appRole === 'manager') return 'Manager';
    if (user?.appRole === 'customer') return 'Customer';
    return 'User';
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          <Avatar className="h-9 w-9 border-2 border-blue-100">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.full_name || 'User'} />}
            <AvatarFallback className="bg-blue-600 text-white font-semibold text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {user.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              {getRoleLabel()}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-2 pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-blue-100">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.full_name || 'User'} />}
              <AvatarFallback className="bg-blue-600 text-white font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {user.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email || 'No email'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              {getRoleLabel()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {getTenantName()}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate(createPageUrl('Settings'))}
          className="cursor-pointer"
        >
          <User className="h-4 w-4 mr-2" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate(createPageUrl('Settings'))}
          className="cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}