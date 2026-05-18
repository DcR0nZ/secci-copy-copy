import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse job data from request
    const { jobData } = await req.json();
    
    if (!jobData || !jobData.customerId) {
      return Response.json({ 
        error: 'Invalid request - customerId is required' 
      }, { status: 400 });
    }

    // Fetch customer to get customerDocketId
    const customer = await base44.asServiceRole.entities.Customer.get(jobData.customerId);
    
    if (!customer) {
      return Response.json({ 
        error: 'Customer not found' 
      }, { status: 404 });
    }

    if (customer.customerDocketId === null || customer.customerDocketId === undefined) {
      return Response.json({ 
        error: 'Customer does not have a docket ID assigned. Please assign a customerDocketId (0-9) to this customer first.' 
      }, { status: 400 });
    }

    // Fetch or create CustomerJobCounter
    let counters = await base44.asServiceRole.entities.CustomerJobCounter.filter({
      customerId: jobData.customerId
    });
    
    let counter;
    if (counters.length === 0) {
      // Create new counter for this customer
      counter = await base44.asServiceRole.entities.CustomerJobCounter.create({
        customerId: jobData.customerId,
        customerDocketId: customer.customerDocketId,
        lastSequence: 0
      });
    } else {
      counter = counters[0];
    }

    // Atomically increment the sequence number
    const newSequence = (counter.lastSequence + 1) % 1000;
    
    // Update the counter
    await base44.asServiceRole.entities.CustomerJobCounter.update(counter.id, {
      lastSequence: newSequence
    });

    // Generate job reference number
    const currentYear = new Date().getFullYear();
    const yy = String(currentYear).slice(-2);
    const c = String(customer.customerDocketId);
    const nnn = String(newSequence).padStart(3, '0');
    const jobReferenceNumber = `${yy}${c}${nnn}`;

    // Create the job with the reference number
    const newJob = await base44.asServiceRole.entities.Job.create({
      ...jobData,
      jobReferenceNumber
    });

    return Response.json({
      success: true,
      job: newJob,
      jobReferenceNumber
    });

  } catch (error) {
    console.error('Error creating job with reference:', error);
    return Response.json({ 
      error: 'Failed to create job',
      details: error.message 
    }, { status: 500 });
  }
});