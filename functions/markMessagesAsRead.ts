import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageIds } = await req.json();

    // Update all messages to mark as read
    await Promise.all(
      messageIds.map(async (id) => {
        const messages = await base44.asServiceRole.entities.Message.filter({ id });
        if (messages.length > 0) {
          const msg = messages[0];
          return base44.asServiceRole.entities.Message.update(id, {
            ...msg,
            isRead: true
          });
        }
      })
    );

    return Response.json({
      success: true
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    return Response.json({
      error: 'Failed to mark messages as read',
      details: error.message
    }, { status: 500 });
  }
});