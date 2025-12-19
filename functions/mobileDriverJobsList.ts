import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, truck } = await req.json();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch jobs and assignments
    const [allJobs, allAssignments] = await Promise.all([
      base44.entities.Job.list(),
      base44.entities.Assignment.list(),
    ]);

    // Filter assignments for the driver's truck
    const driverAssignments = allAssignments.filter(a => 
      a.truckId === truck && 
      new Date(a.date) >= today
    );

    // Get jobs for these assignments
    const jobs = allJobs
      .filter(job => driverAssignments.some(a => a.jobId === job.id))
      .map(job => {
        const assignment = driverAssignments.find(a => a.jobId === job.id);
        return {
          ...job,
          assignment
        };
      })
      .sort((a, b) => {
        // Sort by date and time slot
        const dateCompare = new Date(a.assignment.date) - new Date(b.assignment.date);
        if (dateCompare !== 0) return dateCompare;
        
        // Time slot order
        const timeSlotOrder = {
          'first-am': 1,
          'second-am': 2,
          'lunch': 3,
          'afternoon': 4,
          'early-morning': 1,
          'morning-1': 2,
          'morning-2': 3,
          'afternoon-1': 4,
          'afternoon-2': 5
        };
        
        return (timeSlotOrder[a.assignment.timeSlotId] || 999) - 
               (timeSlotOrder[b.assignment.timeSlotId] || 999);
      });

    return Response.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('Mobile jobs list error:', error);
    return Response.json({
      error: 'Failed to fetch jobs',
      details: error.message
    }, { status: 500 });
  }
});