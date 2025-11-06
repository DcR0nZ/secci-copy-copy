import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is a global admin
        const user = await base44.auth.me();
        if (!user || user.appRole !== 'globalAdmin') {
            return Response.json({ error: 'Unauthorized. Global Admin access required.' }, { status: 403 });
        }

        const { fromTenantId, toTenantId } = await req.json();

        if (!fromTenantId || !toTenantId) {
            return Response.json({ 
                error: 'Missing required parameters: fromTenantId and toTenantId' 
            }, { status: 400 });
        }

        // Get all users from the source tenant
        const usersToMigrate = await base44.asServiceRole.entities.User.filter({
            tenantId: fromTenantId
        });

        console.log(`Found ${usersToMigrate.length} users to migrate from ${fromTenantId} to ${toTenantId}`);

        // Update each user's tenantId
        const updatePromises = usersToMigrate.map(user => 
            base44.asServiceRole.entities.User.update(user.id, {
                tenantId: toTenantId
            })
        );

        await Promise.all(updatePromises);

        // Also migrate any customers that belong to this tenant
        const customersToMigrate = await base44.asServiceRole.entities.Customer.filter({
            tenantId: fromTenantId
        });

        console.log(`Found ${customersToMigrate.length} customers to migrate`);

        const customerUpdatePromises = customersToMigrate.map(customer =>
            base44.asServiceRole.entities.Customer.update(customer.id, {
                tenantId: toTenantId
            })
        );

        await Promise.all(customerUpdatePromises);

        // Migrate jobs
        const jobsToMigrate = await base44.asServiceRole.entities.Job.filter({
            tenantId: fromTenantId
        });

        console.log(`Found ${jobsToMigrate.length} jobs to migrate`);

        const jobUpdatePromises = jobsToMigrate.map(job =>
            base44.asServiceRole.entities.Job.update(job.id, {
                tenantId: toTenantId
            })
        );

        await Promise.all(jobUpdatePromises);

        return Response.json({
            success: true,
            message: `Successfully migrated ${usersToMigrate.length} users, ${customersToMigrate.length} customers, and ${jobsToMigrate.length} jobs from ${fromTenantId} to ${toTenantId}`,
            usersMigrated: usersToMigrate.length,
            customersMigrated: customersToMigrate.length,
            jobsMigrated: jobsToMigrate.length,
            migratedUsers: usersToMigrate.map(u => ({ id: u.id, email: u.email, name: u.full_name }))
        });

    } catch (error) {
        console.error('Migration error:', error);
        return Response.json({ 
            error: 'Migration failed',
            details: error.message 
        }, { status: 500 });
    }
});