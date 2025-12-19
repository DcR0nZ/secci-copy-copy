import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await req.json();

    // Get all messages for this driver or from this driver
    const allMessages = await base44.asServiceRole.entities.Message.list('-created_date');
    
    // Filter messages relevant to this driver
    const messages = allMessages.filter(msg => {
      // Messages from this driver
      if (msg.senderEmail === user.email) return true;
      
      // Messages to this driver (sent by dispatch)
      if (msg.recipientId === userId) return true;
      
      // Broadcast messages to all drivers
      if (msg.recipientRole === 'driver' && !msg.recipientId) return true;
      
      return false;
    });

    return Response.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return Response.json({
      error: 'Failed to get messages',
      details: error.message
    }, { status: 500 });
  }
});