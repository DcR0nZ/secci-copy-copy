import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, status, driverStatus, userId, userName } = await req.json();

    // Get the job
    const job = await base44.asServiceRole.entities.Job.filter({ id: jobId });
    if (!job || job.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const currentJob = job[0];

    // Update job with new status
    const updateData = {
      ...currentJob,
      driverStatus: driverStatus || status,
      driverStatusUpdatedAt: new Date().toISOString(),
      driverStatusUpdatedBy: userName
    };

    // Set actual arrival/completion times
    if (driverStatus === 'ARRIVED' && !currentJob.actualArrivalTime) {
      updateData.actualArrivalTime = new Date().toISOString();
    }
    
    if (driverStatus === 'COMPLETED') {
      updateData.status = 'DELIVERED';
      updateData.actualCompletionTime = new Date().toISOString();
    }

    await base44.asServiceRole.entities.Job.update(jobId, updateData);

    // Create notification for dispatchers/admins
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminsDispatchers = allUsers.filter(u => 
      u.role === 'admin' || u.appRole === 'dispatcher' || u.appRole === 'tenantAdmin'
    );

    const statusMessages = {
      'EN_ROUTE': 'is en route to',
      'ARRIVED': 'has arrived at',
      'UNLOADING': 'is unloading at',
      'COMPLETED': 'has completed delivery at',
      'PROBLEM': 'has reported a problem at'
    };

    const message = `${userName} ${statusMessages[driverStatus] || 'updated status for'} ${currentJob.customerName}`;

    await Promise.all(
      adminsDispatchers.map(admin =>
        base44.asServiceRole.entities.Notification.create({
          userId: admin.id,
          jobId: jobId,
          title: 'Job Status Update',
          message,
          type: 'job_status_update',
          isRead: false,
          context: {
            oldStatus: currentJob.driverStatus || 'NOT_STARTED',
            newStatus: driverStatus,
            customerName: currentJob.customerName,
            deliveryLocation: currentJob.deliveryLocation
          }
        })
      )
    );

    return Response.json({
      success: true,
      job: updateData
    });
  } catch (error) {
    console.error('Mobile status update error:', error);
    return Response.json({
      error: 'Failed to update status',
      details: error.message
    }, { status: 500 });
  }
});