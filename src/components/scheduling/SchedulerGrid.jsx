import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, GripVertical, CheckCircle2, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { base44 } from '@/api/base44Client';
import { getJobCardInlineStyles, getBadgeStyles, getJobCardStyles } from './DeliveryTypeColorUtils';

import JobDetailsDialog from './JobDetailsDialog';
import PlaceholderBlock from './PlaceholderBlock';

const TIME_SLOTS = [
  { id: 'first-am', label: '6-8am (1st AM)', color: 'bg-blue-100' },
  { id: 'second-am', label: '8-10am (2nd AM)', color: 'bg-green-100' },
  { id: 'lunch', label: '10am-12pm (LUNCH)', color: 'bg-yellow-100' },
  { id: 'first-pm', label: '12-2pm (1st PM)', color: 'bg-orange-100' },
  { id: 'second-pm', label: '2-4pm (2nd PM)', color: 'bg-purple-100' }
];

// Helper function to parse and format address
const parseAddress = (address) => {
  if (!address) return { unit: '', street: '', suburb: '' };
  
  // Split by comma
  const parts = address.split(',').map(p => p.trim()).filter(Boolean); // Filter out empty strings
  
  let unit = '';
  let street = '';
  let suburb = '';
  
  if (parts.length >= 3) {
    // Check if first part looks like a unit/lot (contains "Unit", "Lot", "U" followed by number, or starts with number/letter)
    const firstPart = parts[0];
    if (/^(Unit|Lot|U|L)\s*\d+/i.test(firstPart) || /^\d+[A-Z]?$/i.test(firstPart)) {
      unit = firstPart;
      street = parts[1];
      suburb = parts.slice(2).join(', ');
    } else {
      street = parts[0];
      suburb = parts.slice(1).join(', ');
    }
  } else if (parts.length === 2) {
    street = parts[0];
    suburb = parts[1];
  } else if (parts.length === 1) {
    street = parts[0];
  }
  
  // Filter out QLD, Queensland, and Australia from suburb UNLESS it contains NSW
  if (suburb) {
    const hasNSW = /NSW|New South Wales/i.test(suburb);
    
    if (!hasNSW) {
      // Remove QLD, Queensland, Australia, and extra whitespace
      suburb = suburb
        .replace(/,?\s*(QLD|Queensland|Australia)\s*/gi, '')
        .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
        .trim()
        .replace(/,\s*$/, ''); // Remove trailing comma if it's the last character after removal
    }
  }
  
  return { unit, street, suburb };
};

const DraggableJobBlock = ({ job, onClick, deliveryTypes, pickupLocations }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;
  const isLargeJob = job.sqm > 2000;
  const deliveryType = deliveryTypes?.find((dt) => dt.id === job.deliveryTypeId);
  const cardStyles = getJobCardInlineStyles(deliveryType, job);
  const textStyles = getJobCardStyles(deliveryType, job);
  
  const isUnitDelivery = deliveryType?.code && ['UNITUP', 'UNITDWN', 'CRANE'].includes(deliveryType.code);
  const hasPodNotes = job.podNotes && job.podNotes.trim().length > 0;
  const addressParts = parseAddress(job.deliveryLocation);
  
  const pickupLocation = pickupLocations?.find(loc => loc.id === job.pickupLocationId);
  const pickupShortname = pickupLocation?.shortname;

  const jobCard = (
    <div
      ref={setNodeRef}
      style={{ ...style, ...cardStyles }}
      {...listeners}
      {...attributes}
      className={`w-full h-full border-2 rounded p-2 text-xs cursor-pointer transition-all overflow-hidden ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={onClick}
      aria-label={`${textStyles.name} delivery for ${job.customerName}`}
    >
      <div className="flex items-start justify-between gap-1 h-full">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {deliveryType?.code && (
              <span 
                className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 shadow-sm"
                style={getBadgeStyles(textStyles)}
              >
                {textStyles.icon && <span className="text-sm">{textStyles.icon}</span>}
                {deliveryType.code}
              </span>
            )}
            {pickupShortname && (
              <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-purple-100 text-purple-700">
                {pickupShortname}
              </span>
            )}
            {job.sqm && (
              <span className="bg-white/80 text-gray-900 px-1 py-0.5 font-bold rounded text-[9px] shadow-sm">
                {job.sqm.toLocaleString()}m²
              </span>
            )}
            {job.weightKg && (
              <span className="bg-white/80 text-gray-900 px-1 py-0.5 font-bold rounded text-[9px] shadow-sm">
                {(job.weightKg / 1000).toFixed(1)}t
              </span>
            )}
            {isUnitDelivery && job.totalUnits && (
              <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-indigo-100 text-indigo-700">
                {job.totalUnits} units
              </span>
            )}
          </div>

          <div 
            className="font-semibold truncate text-sm mb-0.5 text-gray-900"
          >
            {job.customerName}
          </div>
          <div 
            className="text-[11px] leading-tight text-gray-700"
          >
            {addressParts.unit && <div className="truncate">{addressParts.unit}</div>}
            {addressParts.street && <div className="truncate">{addressParts.street}</div>}
            {addressParts.suburb && <div className="truncate">{addressParts.suburb}</div>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          {hasPodNotes && (
            <div className="h-3 w-3 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold">
              ?
            </div>
          )}
          {isLargeJob && <AlertTriangle className="h-2.5 w-2.5 text-orange-500" />}
          <GripVertical className="h-2.5 w-2.5 text-gray-500" />
        </div>
      </div>
    </div>
  );

  if (job.isDifficultDelivery && job.deliveryDifficulty) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{jobCard}</TooltipTrigger>
          <TooltipContent className="bg-red-900 text-white border-red-700">
            <p className="font-semibold">⚠️ Difficult Delivery</p>
            <p className="text-sm">{job.deliveryDifficulty}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return jobCard;
};

const DraggableScheduledJobBlock = ({ job, onClick, deliveryTypes, pickupLocations }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;
  const isLargeJob = job.sqm > 2000;
  const deliveryType = deliveryTypes?.find((dt) => dt.id === job.deliveryTypeId);
  const cardStyles = getJobCardInlineStyles(deliveryType, job);
  const textStyles = getJobCardStyles(deliveryType, job);
  
  const isUnitDelivery = deliveryType?.code && ['UNITUP', 'UNITDWN', 'CRANE'].includes(deliveryType.code);
  const hasPodNotes = job.podNotes && job.podNotes.trim().length > 0;
  const addressParts = parseAddress(job.deliveryLocation);
  
  const pickupLocation = pickupLocations?.find(loc => loc.id === job.pickupLocationId);
  const pickupShortname = pickupLocation?.shortname;

  const jobCard = (
    <div
      ref={setNodeRef}
      style={{ ...style, ...cardStyles }}
      {...listeners}
      {...attributes}
      className={`w-full h-full border-2 rounded p-2 text-xs cursor-pointer transition-all overflow-hidden ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={onClick}
      aria-label={`${textStyles.name} delivery for ${job.customerName}`}
    >
      <div className="flex items-start justify-between gap-1 h-full">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {deliveryType?.code && (
              <span 
                className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 shadow-sm"
                style={getBadgeStyles(textStyles)}
              >
                {textStyles.icon && <span className="text-sm">{textStyles.icon}</span>}
                {deliveryType.code}
              </span>
            )}
            {pickupShortname && (
              <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-purple-100 text-purple-700">
                {pickupShortname}
              </span>
            )}
            {job.sqm && (
              <span className="bg-white/80 text-gray-900 px-1 py-0.5 font-bold rounded text-[9px] shadow-sm">
                {job.sqm.toLocaleString()}m²
              </span>
            )}
            {job.weightKg && (
              <span className="bg-white/80 text-gray-900 px-1 py-0.5 font-bold rounded text-[9px] shadow-sm">
                {(job.weightKg / 1000).toFixed(1)}t
              </span>
            )}
            {isUnitDelivery && job.totalUnits && (
              <span className="px-1 py-0.5 rounded text-[9px] font-semibold bg-indigo-100 text-indigo-700">
                {job.totalUnits} units
              </span>
            )}
            {job.status === 'DELIVERED' && (
              <Badge className="bg-green-600 text-white text-[8px] px-1 py-0 flex items-center gap-0.5">
                <CheckCircle2 className="h-2 w-2" />
                ✓
              </Badge>
            )}
          </div>

          <div
            className="font-semibold truncate text-sm mb-0.5 text-gray-900"
          >
            {job.customerName}
          </div>
          <div 
            className="text-[11px] leading-tight text-gray-700"
          >
            {addressParts.unit && <div className="truncate">{addressParts.unit}</div>}
            {addressParts.street && <div className="truncate">{addressParts.street}</div>}
            {addressParts.suburb && <div className="truncate">{addressParts.suburb}</div>}
          </div>
        </div>
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          {hasPodNotes && (
            <div className="h-3 w-3 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold">
              ?
            </div>
          )}
          {isLargeJob && (
            <AlertTriangle className="h-2.5 w-2.5 text-orange-500" />
          )}
          {job.status === 'DELIVERED' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
          <GripVertical className="h-2.5 w-2.5 text-gray-500" />
        </div>
      </div>
    </div>
  );

  if (job.isDifficultDelivery && job.deliveryDifficulty) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{jobCard}</TooltipTrigger>
          <TooltipContent className="bg-red-900 text-white border-red-700">
            <p className="font-semibold">⚠️ Difficult Delivery</p>
            <p className="text-sm">{job.deliveryDifficulty}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (job.status === 'DELIVERED') {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{jobCard}</TooltipTrigger>
          <TooltipContent className="bg-green-900 text-white border-green-700">
            <p className="font-semibold">✓ Delivered</p>
            <p className="text-sm">Proof of delivery submitted</p>
            {hasPodNotes && <p className="text-sm mt-1">📝 Delivery notes included</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (job.isReturned) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{jobCard}</TooltipTrigger>
          <TooltipContent className="bg-black text-white border-gray-700">
            <p className="font-semibold">↩ Returned</p>
            <p className="text-sm">{job.returnReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return jobCard;
};

const DroppableCell = ({ id, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative border-r border-gray-200 group overflow-visible flex-1 ${
        isOver ? 'bg-blue-50' : ''
      }`}
      style={{
        minWidth: '100px',
        minHeight: '140px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {children}
    </div>
  );
};

const DroppableUnscheduled = ({ children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unscheduled',
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex gap-2 p-3 overflow-x-auto min-h-[100px] ${
        isOver ? 'bg-yellow-100' : ''
      }`}
    >
      {children}
    </div>
  );
};

export default function SchedulerGrid({
  trucks,
  timeSlots,
  jobs,
  assignments,
  placeholders,
  selectedDate,
  deliveryTypes,
  onOpenPlaceholderDialog,
  onJobClick
}) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [isJobDialogOpen, setJobDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [pickupLocations, setPickupLocations] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      if (base44 && base44.auth && typeof base44.auth.me === 'function') {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } else {
        console.warn('base44.auth.me() is not available. Placeholder creation might be disabled.');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchPickupLocations = async () => {
      try {
        const locations = await base44.entities.PickupLocation.list();
        setPickupLocations(locations);
      } catch (error) {
        console.error('Error fetching pickup locations:', error);
      }
    };
    fetchPickupLocations();
  }, []);

  const getJobsForCell = (truckId, timeSlotId, slotPosition) => {
    const cellAssignments = assignments.filter((a) => {
      if (a.truckId !== truckId || a.timeSlotId !== timeSlotId) return false;
      // Block 1: positions 1-2, Block 2: positions 3-4+
      if (slotPosition === 1) {
        return a.slotPosition >= 1 && a.slotPosition <= 2;
      } else if (slotPosition === 3) {
        return a.slotPosition >= 3;
      }
      return false;
    });
    return cellAssignments.map((a) => jobs.find((j) => j.id === a.jobId)).filter(Boolean);
  };

  const getPlaceholdersForCell = (truckId, timeSlotId, slotPosition) => {
    return placeholders.filter((p) => {
      if (p.truckId !== truckId || p.timeSlotId !== timeSlotId) return false;
      
      // If placeholder has a slotPosition defined, check which block it belongs to
      if (p.slotPosition) {
        // Block 1: positions 1-2, Block 2: positions 3-4+
        if (slotPosition === 1) {
          return p.slotPosition >= 1 && p.slotPosition <= 2;
        } else if (slotPosition === 3) {
          return p.slotPosition >= 3;
        }
        return false;
      }
      
      // If placeholder doesn't have slotPosition, only show in block 1 (backward compatibility)
      return slotPosition === 1;
    });
  };

  const getUnscheduledJobs = () => {
    const assignedJobIds = new Set(assignments.map((a) => a.jobId));
    const unscheduled = jobs.filter(
      (job) =>
        !assignedJobIds.has(job.id) &&
        (job.status === 'APPROVED' ||
          job.status === 'PENDING_APPROVAL') &&
        job.requestedDate === selectedDate
    );
    return unscheduled;
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setJobDialogOpen(true);
  };

  const unscheduledJobs = getUnscheduledJobs();
  const canCreatePlaceholder = currentUser && (currentUser.role === 'admin' || currentUser.appRole === 'dispatcher');

  return (
    <>
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Unscheduled Row */}
        <div className="flex border-2 border-gray-400 bg-yellow-50 mb-4 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
          <div className="w-24 lg:w-32 flex-shrink-0 p-3 bg-yellow-100 border-r-2 border-gray-400 flex flex-col justify-center">
            <div className="flex items-center">
              <Package className="h-4 w-4 mr-1.5 text-yellow-700" />
              <span className="font-semibold text-xs lg:text-sm text-yellow-900">Unscheduled</span>
            </div>
            <Badge variant="secondary" className="mt-1.5 bg-yellow-200 text-yellow-900 text-xs py-0.5 h-5 w-fit">
              {unscheduledJobs.length} {unscheduledJobs.length === 1 ? 'job' : 'jobs'}
            </Badge>
          </div>
          <DroppableUnscheduled>
            {unscheduledJobs.map((job, index) => (
              <div
                key={job.id}
                style={{
                  width: '200px',
                  height: '80px',
                  flexShrink: 0
                }}>
                <DraggableJobBlock
                  job={job}
                  onClick={() => (onJobClick ? onJobClick(job) : handleJobClick(job))}
                  deliveryTypes={deliveryTypes}
                  pickupLocations={pickupLocations}
                />
              </div>
            ))}
            {unscheduledJobs.length === 0 && (
              <div className="text-gray-500 text-sm p-2 flex items-center">No unscheduled jobs for this date</div>
            )}
          </DroppableUnscheduled>
        </div>

        {/* Time Header */}
        <div className="flex sticky top-0 z-20 bg-white border-b-2 border-gray-300 shadow-sm flex-shrink-0">
          <div className="w-24 lg:w-32 flex-shrink-0 p-2 bg-gray-100 border-r-2 border-gray-300 sticky left-0 z-30">
            <span className="font-semibold text-xs">Truck</span>
          </div>
          <div className="flex flex-1">
            {TIME_SLOTS.map((slot) => {
              return (
                <div
                  key={slot.id}
                  className={`${slot.color} border-r border-gray-200 flex items-center justify-center flex-1`}
                  style={{ minWidth: '200px' }}>
                  <span className="text-[10px] lg:text-xs font-semibold text-gray-700 text-center px-1">{slot.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Truck Rows */}
        <div className="flex-1 overflow-auto pb-4">
          {trucks.map((truck, truckIndex) => {
            const totalSqm = assignments
              .filter((a) => a.truckId === truck.id)
              .reduce((sum, a) => {
                const job = jobs.find((j) => j.id === a.jobId);
                return sum + (job?.sqm || 0);
              }, 0);

            let barColor = 'bg-red-500';
            if (totalSqm >= 1500) {
              barColor = 'bg-green-500';
            } else if (totalSqm >= 1000) {
              barColor = 'bg-orange-500';
            }

            const maxSqmForBar = 2500;
            const utilizationPercent = Math.min((totalSqm / maxSqmForBar) * 100, 100);
            const isLastTruck = truckIndex === trucks.length - 1;

            return (
              <div
                key={truck.id}
                className={`flex ${
                  isLastTruck ? 'border-b-2 border-gray-400' : 'border-b-2 border-gray-300'
                } min-h-[140px] mb-6`}>
                {/* Sticky Truck Column */}
                <div className="w-24 lg:w-32 flex-shrink-0 p-2 bg-gray-50 border-r-2 border-gray-300 sticky left-0 z-10">
                  <div className="font-semibold text-xs text-gray-900">{truck.name}</div>
                  <div className="text-[10px] mt-0.5 text-gray-600">{totalSqm.toLocaleString()}m²</div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div className={`h-1 rounded-full ${barColor}`} style={{ width: `${utilizationPercent}%` }} />
                  </div>
                </div>

                <div className="flex flex-1 relative">
                  {TIME_SLOTS.map((slot) => {
                    // Get all jobs for this time slot (both blocks)
                    const allJobsInSlot = [1, 3].flatMap((blockStart) => 
                      getJobsForCell(truck.id, slot.id, blockStart)
                    );
                    const allPlaceholdersInSlot = [1, 3].flatMap((blockStart) => 
                      getPlaceholdersForCell(truck.id, slot.id, blockStart)
                    );
                    
                    // Determine how many slots to show based on content
                    const totalItems = allJobsInSlot.length + allPlaceholdersInSlot.length;
                    const blocksToShow = totalItems > 1 ? [1, 3] : [1];

                    return (
                      <div
                        key={slot.id}
                        className={`${slot.color} border-r border-gray-200 flex flex-1`}
                        style={{ minWidth: '200px' }}>
                        {blocksToShow.map((blockStart) => {
const DraggableJobBlock = ({ job, onClick, deliveryTypes, pickupLocations }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;
  const isLargeJob = job.sqm > 2000;
  const deliveryType = deliveryTypes?.find((dt) => dt.id === job.deliveryTypeId);
  const cardStyles = getJobCardInlineStyles(deliveryType, job);
  const textStyles = getJobCardStyles(deliveryType, job);
  
  const isUnitDelivery = deliveryType?.code && ['UNITUP', 'UNITDWN', 'CRANE'].includes(deliveryType.code);
  const hasPodNotes = job.podNotes && job.podNotes.trim().length > 0;
  const addressParts = parseAddress(job.deliveryLocation);
  
  const pickupLocation = pickupLocations?.find(loc => loc.id === job.pickupLocationId);
  const pickupShortname = pickupLocation?.shortname;

  const jobCard = (
    <div
      ref={setNodeRef}
      style={{ ...style, ...cardStyles }}
      {...listeners}
      {...attributes}
      className={`w-full h-full border-2 rounded p-2 text-xs cursor-pointer transition-all overflow-hidden ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={onClick}
      aria-label={`${textStyles.name} delivery for ${job.customerName}`}
    >
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <JobDetailsDialog
        job={selectedJob}
        open={isJobDialogOpen}
        onOpenChange={setJobDialogOpen}
        onJobUpdated={() => window.location.reload()}
      />
    </>
  );
}