import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and global admins can update other users
    if (currentUser.role !== 'admin' && currentUser.appRole !== 'globalAdmin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, updateData } = await req.json();

    if (!userId || !updateData) {
      return Response.json({ error: 'Missing userId or updateData' }, { status: 400 });
    }

    // Use service role to update the user
    await base44.asServiceRole.entities.User.update(userId, updateData);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});