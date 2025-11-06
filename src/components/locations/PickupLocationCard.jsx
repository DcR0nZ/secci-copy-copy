import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2 } from 'lucide-react';

export default function PickupLocationCard({ location, onClick }) {
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
            <span className="font-semibold text-sm text-gray-900 truncate">{location.name}</span>
          </div>
          <div className="text-xs text-gray-600 mb-1">
            {location.company}
          </div>
          {location.shortname && (
            <div className="text-xs font-mono font-semibold text-blue-600 mt-1">
              {location.shortname}
            </div>
          )}
        </div>
        <Badge className={getStatusColor(location.status)}>
          {location.status}
        </Badge>
      </div>

      <div className="flex items-start gap-2 mt-2">
        <MapPin className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600 line-clamp-2">{location.address}</p>
      </div>
    </div>
  );
}