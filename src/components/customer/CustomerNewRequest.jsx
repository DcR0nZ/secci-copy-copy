import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, FileText } from 'lucide-react';

export default function CustomerNewRequest({ user }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit New Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Choose how you'd like to submit your delivery request:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 hover:border-blue-500 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center" onClick={() => navigate(createPageUrl('CustomerRequestDelivery'))}>
                <Plus className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <h3 className="font-semibold text-lg mb-2">New Delivery Request</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Submit a detailed delivery request with all job specifications
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Create Request
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-green-500 transition-colors cursor-pointer">
              <CardContent className="p-6 text-center" onClick={() => navigate(createPageUrl('Phonebook'))}>
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <h3 className="font-semibold text-lg mb-2">Contact Dispatch</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Have a question or need to discuss a delivery? Contact us directly
                </p>
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Contact Us
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Upload your docket or order document for faster processing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Provide accurate site contact information to ensure smooth delivery</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Include any special delivery requirements in the notes section</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Track your delivery status in real-time from the Live Tracking tab</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}