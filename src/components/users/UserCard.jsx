import React from 'react';
import { Badge } from '@/components/ui/badge';
import { User, Truck, Building2, Mail, Phone } from 'lucide-react';

export default function UserCard({ user, customer, onClick }) {
  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 border-red-300',
      customer: 'bg-blue-100 text-blue-800 border-blue-300',
      dispatcher: 'bg-purple-100 text-purple-800 border-purple-300',
      driver: 'bg-green-100 text-green-800 border-green-300',
      manager: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      outreach: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      outreachOperator: 'bg-pink-100 text-pink-800 border-pink-300'
    };
    return colors[role] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getRoleLabel = (appRole) => {
    const labels = {
      customer: 'Customer',
      dispatcher: 'Dispatcher',
      driver: 'Driver',
      manager: 'Manager',
      outreach: 'Outreach',
      outreachOperator: 'Outreach Operator'
    };
    return labels[appRole] || 'Customer';
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border-2 border-gray-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="font-semibold text-sm text-gray-900 truncate">{user.full_name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
        </div>
        <Badge className={getRoleColor(user.role)}>
          {user.role}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {customer && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
            <Building2 className="h-3 w-3 text-blue-600" />
            <span className="text-blue-900 truncate max-w-[150px]">{customer.customerName}</span>
          </div>
        )}
        {user.appRole === 'driver' && user.truck && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs">
            <Truck className="h-3 w-3 text-green-600" />
            <span className="text-green-900">{user.truck}</span>
          </div>
        )}
      </div>
    </div>
  );
}