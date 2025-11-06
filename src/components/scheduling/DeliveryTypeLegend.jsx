import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { DELIVERY_TYPE_STYLES, STATUS_OVERRIDES } from './DeliveryTypeColorUtils';

export default function DeliveryTypeLegend() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Info className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Color Legend</span>
          <span className="sm:hidden">Legend</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delivery Type Color Legend</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Status Colors Section */}
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-3">Status Colors (Override)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(STATUS_OVERRIDES).map(([key, style]) => (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 rounded-lg border-2"
                  style={{
                    backgroundColor: style.bg + '20', // 20% opacity
                    borderColor: style.border
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold shadow-sm"
                    style={{
                      backgroundColor: style.bg,
                      color: style.text
                    }}
                  >
                    {style.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{style.name}</p>
                    <p className="text-xs text-gray-600">{key}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Type Colors Section */}
          <div>
            <h3 className="font-semibold text-sm text-gray-700 mb-3">Delivery Type Colors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(DELIVERY_TYPE_STYLES).map(([code, style]) => (
                <div
                  key={code}
                  className="flex items-center gap-3 p-3 rounded-lg border-2"
                  style={{
                    backgroundColor: style.bg + '20', // 20% opacity
                    borderColor: style.border
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold shadow-sm"
                    style={{
                      backgroundColor: style.bg,
                      color: style.text
                    }}
                  >
                    {style.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{style.name}</p>
                    <p className="text-xs text-gray-600">Code: {code}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-sm text-blue-900 mb-2">How Colors Work:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Status colors</strong> take priority over delivery type colors</li>
              <li><strong>Completed jobs</strong> show in green regardless of type</li>
              <li><strong>Returned jobs</strong> show in black regardless of type</li>
              <li><strong>Icons</strong> help identify delivery types at a glance</li>
              <li>Job cards show the icon + code in a small badge</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}