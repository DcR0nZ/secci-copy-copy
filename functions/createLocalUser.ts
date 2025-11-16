import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify the requesting user is an admin
        const requestingUser = await base44.auth.me();
        if (!requestingUser || requestingUser.role !== 'admin') {
            return Response.json({ 
                error: 'Unauthorized - Admin access required' 
            }, { status: 403 });
        }

        const body = await req.json();
        const { email, full_name, customerId, customerName, appRole } = body;

        if (!email || !full_name) {
            return Response.json({ 
                error: 'Email and full name are required' 
            }, { status: 400 });
        }

        // Use service role to create the user
        // Note: This creates a user record in the User entity
        // The user will need to complete authentication on first login
        const newUser = await base44.asServiceRole.entities.User.create({
            email,
            full_name,
            customerId: customerId || null,
            customerName: customerName || null,
            appRole: appRole || 'customer'
        });

        return Response.json({ 
            success: true,
            user: newUser,
            message: 'User account created successfully. User can now log in with their email.'
        });

    } catch (error) {
        console.error('Error creating user:', error);
        return Response.json({ 
            error: error.message || 'Failed to create user account',
            details: 'If this error persists, you may need to use the platform invite functionality instead.'
        }, { status: 500 });
    }
});