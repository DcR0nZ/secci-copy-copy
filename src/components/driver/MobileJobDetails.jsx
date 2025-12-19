import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Package,
  Navigation,
  Camera,
  AlertCircle,
  CheckCircle,
  Pause
} from 'lucide-react';
import { format } from 'date-fns';

export default function MobileJobDetails({ job, onBack, onNavigate, onCall, onStatusUpdate, onCompletePOD }) {
  const statusActions = [
    { status: 'EN_ROUTE', label: 'Start Journey', icon: Navigation, color: 'bg-blue-600' },
    { status: 'ARRIVED', label: 'Mark Arrived', icon: MapPin, color: 'bg-purple-600' },
    { status: 'UNLOADING', label: 'Start Unloading', icon: Package, color: 'bg-orange-600' },
    { status: 'PROBLEM', label: 'Report Problem', icon: AlertCircle, color: 'bg-red-600' },
  ];

  const currentStatus = job.driverStatus || 'NOT_STARTED';
  const isCompleted = currentStatus === 'COMPLETED';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-blue-700 p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Job Details</h1>
            <p className="text-sm text-blue-100">{job.customerName}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Badge */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Current Status</span>
              <Badge className={`${
                currentStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                currentStatus === 'PROBLEM' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              } text-sm px-3 py-1`}>
                {currentStatus.replace('_', ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-base mb-3">Delivery Information</h3>
            
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-600">Delivery Address</p>
                <p className="text-sm text-gray-900">{job.deliveryLocation}</p>
              </div>
            </div>

            {job.siteContactName && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Site Contact</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">{job.siteContactName}</p>
                      {job.siteContactPhone && (
                        <p className="text-sm text-gray-700">{job.siteContactPhone}</p>
                      )}
                    </div>
                    {job.siteContactPhone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onCall}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {job.deliveryWindow && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Delivery Window</p>
                  <p className="text-sm text-gray-900">{job.deliveryWindow}</p>
                </div>
              </div>
            )}

            {job.estimatedArrivalTime && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Estimated Arrival</p>
                  <p className="text-sm text-gray-900">{job.estimatedArrivalTime}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-600">Delivery Type</p>
                <p className="text-sm text-gray-900">{job.deliveryTypeName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Notes */}
        {job.deliveryNotes && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-base mb-2">Delivery Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.deliveryNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Sheet List */}
        {job.sheetList && job.sheetList.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-base mb-3">Items to Deliver</h3>
              <div className="space-y-2">
                {job.sheetList.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-900">{item.description}</span>
                    <span className="text-gray-600 font-medium">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {!isCompleted && (
          <div className="space-y-3">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base"
              onClick={onNavigate}
            >
              <Navigation className="h-5 w-5 mr-2" />
              Navigate to Location
            </Button>

            <div className="grid grid-cols-2 gap-3">
              {statusActions.map((action) => (
                <Button
                  key={action.status}
                  variant="outline"
                  className="py-4"
                  onClick={() => onStatusUpdate(action.status)}
                  disabled={currentStatus === action.status}
                >
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              ))}
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base"
              onClick={onCompletePOD}
            >
              <Camera className="h-5 w-5 mr-2" />
              Complete with POD
            </Button>
          </div>
        )}

        {isCompleted && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p className="font-semibold text-green-900">Delivery Completed</p>
              <p className="text-sm text-green-700">
                POD submitted successfully
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}