import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, photos, signature, notes, userId, userName } = await req.json();

    // Get the job
    const job = await base44.asServiceRole.entities.Job.filter({ id: jobId });
    if (!job || job.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const currentJob = job[0];

    // Prepare POD data
    const podFiles = [...(currentJob.podFiles || []), ...photos];
    if (signature) {
      podFiles.push(signature);
    }

    const jobPhotos = currentJob.jobPhotos || [];
    photos.forEach(photoUrl => {
      jobPhotos.push({
        url: photoUrl,
        caption: 'Proof of Delivery',
        timestamp: new Date().toISOString(),
        uploadedBy: userName
      });
    });

    if (signature) {
      jobPhotos.push({
        url: signature,
        caption: 'Customer Signature',
        timestamp: new Date().toISOString(),
        uploadedBy: userName
      });
    }

    // Update job with POD information
    const updateData = {
      ...currentJob,
      podFiles,
      jobPhotos,
      podNotes: notes || currentJob.podNotes,
      status: 'DELIVERED',
      driverStatus: 'COMPLETED',
      actualCompletionTime: new Date().toISOString(),
      driverStatusUpdatedAt: new Date().toISOString(),
      driverStatusUpdatedBy: userName
    };

    await base44.asServiceRole.entities.Job.update(jobId, updateData);

    // Notify admins/dispatchers
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminsDispatchers = allUsers.filter(u => 
      u.role === 'admin' || u.appRole === 'dispatcher' || u.appRole === 'tenantAdmin'
    );

    await Promise.all(
      adminsDispatchers.map(admin =>
        base44.asServiceRole.entities.Notification.create({
          userId: admin.id,
          jobId: jobId,
          title: 'POD Submitted',
          message: `${userName} submitted proof of delivery for ${currentJob.customerName}`,
          type: 'job_status_update',
          isRead: false,
          context: {
            oldStatus: currentJob.driverStatus || 'IN_TRANSIT',
            newStatus: 'COMPLETED',
            customerName: currentJob.customerName,
            deliveryLocation: currentJob.deliveryLocation
          }
        })
      )
    );

    // Notify customer
    if (currentJob.customerId) {
      const customerUsers = allUsers.filter(u => 
        u.customerId === currentJob.customerId || 
        (u.additionalCustomerIds && u.additionalCustomerIds.includes(currentJob.customerId))
      );

      await Promise.all(
        customerUsers.map(customer =>
          base44.asServiceRole.entities.Notification.create({
            userId: customer.id,
            jobId: jobId,
            title: 'Delivery Completed',
            message: `Your delivery to ${currentJob.deliveryLocation} has been completed`,
            type: 'job_status_update',
            isRead: false
          })
        )
      );
    }

    return Response.json({
      success: true,
      job: updateData
    });
  } catch (error) {
    console.error('Mobile POD submission error:', error);
    return Response.json({
      error: 'Failed to submit POD',
      details: error.message
    }, { status: 500 });
  }
});