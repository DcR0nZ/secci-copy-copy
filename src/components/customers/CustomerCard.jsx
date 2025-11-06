import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Phone, Mail } from 'lucide-react';

export default function CustomerCard({ customer, onClick }) {
  const getStatusColor = (status) => {
    return status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border-2 border-gray-300 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold text-sm text-gray-900 truncate">{customer.customerName}</span>
          </div>
          <div className="text-xs text-gray-500 mb-1">
            {customer.customerCode}
          </div>
        </div>
        <Badge className={getStatusColor(customer.status)}>
          {customer.status}
        </Badge>
      </div>

      <div className="space-y-1 mt-2">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{customer.contactPerson}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Phone className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{customer.contactNumber}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{customer.contactEmail}</span>
        </div>
      </div>
    </div>
  );
}