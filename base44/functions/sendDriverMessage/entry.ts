import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, senderName, senderEmail, senderRole, userId, truckId, recipientId } = await req.json();

    // Create message
    const message = await base44.asServiceRole.entities.Message.create({
      content,
      senderName,
      senderEmail,
      senderRole,
      timestamp: new Date().toISOString(),
      recipientId: recipientId || null,
      recipientRole: recipientId ? null : 'dispatcher',
      truckId,
      isRead: false
    });

    // Notify dispatchers/admins about new driver message
    if (senderRole === 'driver') {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const dispatchers = allUsers.filter(u => 
        u.role === 'admin' || u.appRole === 'dispatcher' || u.appRole === 'tenantAdmin'
      );

      await Promise.all(
        dispatchers.map(dispatcher =>
          base44.asServiceRole.entities.Notification.create({
            userId: dispatcher.id,
            title: 'New Driver Message',
            message: `${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
            type: 'info',
            isRead: false
          })
        )
      );
    }

    return Response.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Send message error:', error);
    return Response.json({
      error: 'Failed to send message',
      details: error.message
    }, { status: 500 });
  }
});