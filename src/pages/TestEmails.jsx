import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";
import { Mail, Loader2 } from 'lucide-react';

const TRUCKS = [
  { id: 'ACCO1', name: 'ACCO1' },
  { id: 'ACCO2', name: 'ACCO2' },
  { id: 'FUSO', name: 'FUSO' },
  { id: 'ISUZU', name: 'ISUZU' },
  { id: 'UD', name: 'UD' }
];

const TIME_SLOTS = [
  { id: 'first-am', label: 'First AM (6-9am)' },
  { id: 'second-am', label: 'Second AM (9am-12pm)' },
  { id: 'lunch', label: 'Lunch (12-3pm)' },
  { id: 'afternoon', label: 'Afternoon (3-6pm)' }
];

export default function TestEmails() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedTruck, setSelectedTruck] = useState('ACCO1');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('first-am');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await base44.auth.me();
        setTestEmail(user.email);
        
        const allJobs = await base44.entities.Job.list('-created_date', 10);
        setJobs(allJobs);
        if (allJobs.length > 0) {
          setSelectedJob(allJobs[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sendTestEmail = async (emailType) => {
    if (!selectedJob || !testEmail) {
      toast({
        title: "Missing Information",
        description: "Please select a job and enter an email address.",
        variant: "destructive",
      });
      return;
    }

    setSending(emailType);
    try {
      let result;
      
      switch (emailType) {
        case 'scheduled':
          result = await base44.functions.invoke('sendJobScheduledEmail', {
            jobId: selectedJob,
            customerEmail: testEmail,
            customerName: 'Test Customer',
            truckName: selectedTruck,
            date: selectedDate,
            timeSlot: selectedTimeSlot
          });
          break;
          
        case 'completed':
          result = await base44.functions.invoke('sendDeliveryCompletedEmail', {
            jobId: selectedJob,
            customerEmail: testEmail,
            customerName: 'Test Customer'
          });
          break;
          
        case 'returned':
          result = await base44.functions.invoke('sendJobReturnedEmail', {
            jobId: selectedJob,
            customerEmail: testEmail,
            customerName: 'Test Customer'
          });
          break;
          
        case 'newJob':
          result = await base44.functions.invoke('sendNewJobCreatedEmail', {
            jobId: selectedJob
          });
          break;
          
        case 'confirm':
          result = await base44.functions.invoke('sendConfirmNewJobEmail', {
            jobId: selectedJob,
            customerEmail: testEmail,
            customerName: 'Test Customer'
          });
          break;
      }

      toast({
        title: "Email Sent!",
        description: `Test email sent successfully to ${testEmail}`,
      });
    } catch (error) {
      console.error('Email error:', error);
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Email Testing</h1>
        <p className="text-gray-600 mt-2">Test all email notifications before going live</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testEmail">Recipient Email</Label>
            <Input
              id="testEmail"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>

          <div>
            <Label htmlFor="selectedJob">Select Job</Label>
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger id="selectedJob">
                <SelectValue placeholder="Select a job..." />
              </SelectTrigger>
              <SelectContent>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.customerName} - {job.deliveryLocation.substring(0, 50)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="selectedTruck">Truck</Label>
              <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                <SelectTrigger id="selectedTruck">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRUCKS.map(truck => (
                    <SelectItem key={truck.id} value={truck.id}>{truck.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="selectedDate">Date</Label>
              <Input
                id="selectedDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="selectedTimeSlot">Time Slot</Label>
              <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot}>
                <SelectTrigger id="selectedTimeSlot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(slot => (
                    <SelectItem key={slot.id} value={slot.id}>{slot.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Job Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Sent to customer when their job is scheduled on a truck
            </p>
            <Button
              onClick={() => sendTestEmail('scheduled')}
              disabled={sending !== null}
              className="w-full"
            >
              {sending === 'scheduled' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Test Email'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Delivery Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Sent to customer when delivery is completed with POD
            </p>
            <Button
              onClick={() => sendTestEmail('completed')}
              disabled={sending !== null}
              className="w-full"
            >
              {sending === 'completed' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Test Email'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Job Returned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Sent to customer when a driver returns a job
            </p>
            <Button
              onClick={() => sendTestEmail('returned')}
              disabled={sending !== null}
              className="w-full"
            >
              {sending === 'returned' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Test Email'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              New Job Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Sent to dispatchers when a new job needs scheduling
            </p>
            <Button
              onClick={() => sendTestEmail('newJob')}
              disabled={sending !== null}
              className="w-full"
            >
              {sending === 'newJob' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Test Email'
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Job Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Sent to job creator confirming their job was created
            </p>
            <Button
              onClick={() => sendTestEmail('confirm')}
              disabled={sending !== null}
              className="w-full"
            >
              {sending === 'confirm' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Test Email'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Go to <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a> and create an account</li>
            <li>Verify your domain <code className="bg-blue-100 px-2 py-1 rounded">secdelivery.com.au</code></li>
            <li>Create an API key in Resend dashboard</li>
            <li>Add to Dashboard → Settings → Environment Variables: <code className="bg-blue-100 px-2 py-1 rounded">RESEND_API_KEY</code> = your API key</li>
            <li>Test each email type above to verify they're working</li>
            <li>Check your inbox for the test emails</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}