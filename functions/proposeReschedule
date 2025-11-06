import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const TIME_SLOTS = [
  { id: 'first-am', label: 'First AM (6-9am)', order: 1 },
  { id: 'second-am', label: 'Second AM (9am-12pm)', order: 2 },
  { id: 'lunch', label: 'Lunch (12-3pm)', order: 3 },
  { id: 'afternoon', label: 'Afternoon (3-6pm)', order: 4 }
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { delayedJobId, newAvailableTime, delayReason } = body;

        if (!delayedJobId || !newAvailableTime || !delayReason) {
            return Response.json({ 
                error: 'Missing required fields: delayedJobId, newAvailableTime, delayReason' 
            }, { status: 400 });
        }

        // Fetch the delayed job
        const delayedJob = await base44.entities.Job.get(delayedJobId);
        if (!delayedJob) {
            return Response.json({ error: 'Job not found' }, { status: 404 });
        }

        // Get the assignment for this job
        const assignments = await base44.entities.Assignment.filter({ jobId: delayedJobId });
        if (assignments.length === 0) {
            return Response.json({ error: 'Job is not scheduled' }, { status: 400 });
        }

        const delayedAssignment = assignments[0];
        const truckId = delayedAssignment.truckId;
        const date = delayedAssignment.date;

        // Get all assignments for this truck on this date
        const truckAssignments = await base44.entities.Assignment.filter({ 
            truckId: truckId, 
            date: date 
        });

        // Fetch all jobs for these assignments
        const jobIds = truckAssignments.map(a => a.jobId);
        const allJobs = await Promise.all(
            jobIds.map(id => base44.entities.Job.get(id))
        );

        // Build current schedule with job details
        const currentSchedule = truckAssignments.map(assignment => {
            const job = allJobs.find(j => j.id === assignment.jobId);
            const deliveryType = job?.deliveryTypeName || '';
            const requiresManitou = deliveryType.toLowerCase().includes('manitou') || 
                                   deliveryType.toLowerCase().includes('unit') ||
                                   job?.requiresManitou;

            return {
                jobId: assignment.jobId,
                timeSlotId: assignment.timeSlotId,
                slotPosition: assignment.slotPosition,
                customerName: job?.customerName || 'Unknown',
                deliveryType: deliveryType,
                requiresManitou: requiresManitou,
                sqm: job?.sqm || 0
            };
        }).sort((a, b) => {
            const slotA = TIME_SLOTS.find(s => s.id === a.timeSlotId)?.order || 0;
            const slotB = TIME_SLOTS.find(s => s.id === b.timeSlotId)?.order || 0;
            return slotA - slotB;
        });

        // Use AI to analyze and propose optimal rescheduling
        const aiPrompt = `You are a logistics scheduling assistant. A Manitou delivery job is delayed and you need to propose the optimal rescheduling for a truck's daily run.

CURRENT SITUATION:
- Truck: ${truckId}
- Date: ${date}
- Delayed Job: ${delayedJob.customerName} (${delayedJob.deliveryTypeName})
  * Currently scheduled: ${TIME_SLOTS.find(s => s.id === delayedAssignment.timeSlotId)?.label}
  * Requires Manitou operator to be present
  * New available time: ${newAvailableTime}
  * Delay reason: ${delayReason}

CURRENT TRUCK SCHEDULE:
${currentSchedule.map((job, idx) => `${idx + 1}. ${TIME_SLOTS.find(s => s.id === job.timeSlotId)?.label}: ${job.customerName} (${job.deliveryType})${job.requiresManitou ? ' [REQUIRES MANITOU]' : ' [HAND UNLOAD]'}`).join('\n')}

CONSTRAINTS:
1. Jobs requiring Manitou MUST have the Manitou operator present
2. Hand unload jobs can be done without Manitou operator
3. Minimize disruption - ideally only swap 2 jobs
4. The delayed Manitou job should move to a time slot matching the "new available time"
5. Priority is keeping all deliveries on schedule, even if times change

TASK:
Propose the minimal changes to accommodate this delay. For each change, specify:
- Which job to move
- From which time slot to which time slot
- Brief reason for the change

Respond ONLY with valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "changes": [
    {
      "jobId": "job_id_here",
      "customerName": "customer_name",
      "oldTimeSlot": "current_slot_id",
      "newTimeSlot": "new_slot_id",
      "reason": "why this change is needed"
    }
  ],
  "reasoning": "Overall explanation of the proposed solution and why it's optimal"
}`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: aiPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    changes: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                jobId: { type: "string" },
                                customerName: { type: "string" },
                                oldTimeSlot: { type: "string" },
                                newTimeSlot: { type: "string" },
                                reason: { type: "string" }
                            }
                        }
                    },
                    reasoning: { type: "string" }
                }
            }
        });

        // Enhance proposed changes with slot positions
        const proposedChanges = aiResponse.changes.map(change => {
            const oldAssignment = truckAssignments.find(a => a.jobId === change.jobId);
            return {
                ...change,
                oldSlotPosition: oldAssignment?.slotPosition || 1,
                newSlotPosition: 1 // Default to slot 1, can be adjusted
            };
        });

        // Create the reschedule proposal
        const proposal = await base44.entities.RescheduleProposal.create({
            initiatedBy: user.email,
            initiatedAt: new Date().toISOString(),
            delayedJobId: delayedJobId,
            delayedJobDetails: {
                customerName: delayedJob.customerName,
                deliveryLocation: delayedJob.deliveryLocation,
                deliveryType: delayedJob.deliveryTypeName,
                currentTimeSlot: delayedAssignment.timeSlotId,
                requiresManitou: true
            },
            truckId: truckId,
            date: date,
            delayReason: delayReason,
            newAvailableTime: newAvailableTime,
            currentSchedule: currentSchedule,
            proposedChanges: proposedChanges,
            aiReasoning: aiResponse.reasoning,
            status: 'PENDING'
        });

        // Send notification to dispatchers
        await base44.functions.invoke('sendRescheduleProposalEmail', {
            proposalId: proposal.id
        });

        return Response.json({
            success: true,
            proposal: proposal,
            message: 'Reschedule proposal created and dispatchers have been notified'
        });

    } catch (error) {
        console.error('Error proposing reschedule:', error);
        return Response.json({ 
            error: error.message || 'Failed to create reschedule proposal' 
        }, { status: 500 });
    }
});