
import React, { useState, useEffect } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, GripVertical, CheckCircle2, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
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

const JobBlock = ({ job, isDragging, onClick, deliveryTypes, pickupLocations }) => {
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
      className={`w-full h-full border-2 rounded p-2 text-xs cursor-pointer transition-all overflow-hidden ${
        isDragging ? 'opacity-50 scale-105 z-50' : ''
      }`}
      style={{
        ...cardStyles,
        boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          const rgb = cardStyles['--card-color-rgb'];
          if (rgb) {
            e.currentTarget.style.backgroundColor = `rgba(${rgb}, 0.10)`;
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          const rgb = cardStyles['--card-color-rgb'];
          if (rgb) {
            e.currentTarget.style.backgroundColor = `rgba(${rgb}, 0.06)`;
            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
          }
        }
      }}
      onMouseDown={(e) => {
        const rgb = cardStyles['--card-color-rgb'];
        if (rgb) {
          e.currentTarget.style.backgroundColor = `rgba(${rgb}, 0.08)`;
        }
      }}
      onMouseUp={(e) => {
        const rgb = cardStyles['--card-color-rgb'];
        if (rgb) {
          e.currentTarget.style.backgroundColor = `rgba(${rgb}, 0.10)`;
        }
      }}
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

const ScheduledJobBlock = ({ job, isDragging, onClick, deliveryTypes, pickupLocations }) => {
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
      className={`w-full h-full border-2 rounded p-2 text-xs cursor-pointer transition-all overflow-hidden ${
        isDragging ? 'opacity-50 scale-105 z-50' : ''
      }`}
      style={{
        ...cardStyles,
        boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          const rgb = cardStyles['--card-color-rgb'];
          if (rgb) {
            e.currentTarget.style.backgroundColor = `rgba(${rgb}, 0.10)`;
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          const rgb = cardStyles['--card-color-rgb'];
          if (rgb) {
            e.currentTarget.style.backgroundColor = `rgba(${rgb}, 0.06)`;
            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
          }
        }
      }}
      onMouseDown={(e) => {
        const rgb = cardStyles['--card-color-rgb'];
        if (rgb) {
          e.currentTarget.style.backgroundColor = `rgba(${rgb}, 0.08)`;
        }
      }}
      onMouseUp={(e) => {
        const rgb = cardStyles['--card-color-rgb'];
        if (rgb) {
          e.currentTarget.style.backgroundColor = `rgba(${rgb}, 0.10)`;
        }
      }}
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

export default function SchedulerGrid({
  trucks,
  timeSlots,
  jobs,
  assignments,
  placeholders,
  selectedDate,
  deliveryTypes,
  dragDropEnabled,
  onOpenPlaceholderDialog,
  onJobClick
}) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [isJobDialogOpen, setJobDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [draggingOverCell, setDraggingOverCell] = useState(null);
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
      if (a.slotPosition === slotPosition) return true;
      if (a.slotPosition === slotPosition - 1 && (a.slotPosition === 1 || a.slotPosition === 3)) {
        return true;
      }
      return false;
    });
    return cellAssignments.map((a) => jobs.find((j) => j.id === a.jobId)).filter(Boolean);
  };

  const getPlaceholdersForCell = (truckId, timeSlotId, slotPosition) => {
    return placeholders.filter((p) => {
      if (p.truckId !== truckId || p.timeSlotId !== timeSlotId) return false;
      
      // If placeholder has a slotPosition defined, only show in that specific block
      if (p.slotPosition) {
        return p.slotPosition === slotPosition;
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
      <div className="w-full h-full overflow-auto">
        {/* Unscheduled Row */}
        <div className="flex border-2 border-gray-400 bg-yellow-50 mb-6 rounded-lg overflow-hidden shadow-sm">
          <div className="w-24 lg:w-32 flex-shrink-0 p-3 bg-yellow-100 border-r-2 border-gray-400 flex flex-col justify-center">
            <div className="flex items-center">
              <Package className="h-4 w-4 mr-1.5 text-yellow-700" />
              <span className="font-semibold text-xs lg:text-sm text-yellow-900">Unscheduled</span>
            </div>
            <Badge variant="secondary" className="mt-1.5 bg-yellow-200 text-yellow-900 text-xs py-0.5 h-5 w-fit">
              {unscheduledJobs.length} {unscheduledJobs.length === 1 ? 'job' : 'jobs'}
            </Badge>
          </div>
          <Droppable droppableId="unscheduled" direction="horizontal" isDropDisabled={!dragDropEnabled}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-1 flex gap-2 p-3 overflow-x-auto min-h-[100px] ${
                  snapshot.isDraggingOver ? 'bg-yellow-200' : ''
                }`}>
                {unscheduledJobs.map((job, index) => (
                  <Draggable key={job.id} draggableId={job.id} index={index} isDragDisabled={!dragDropEnabled}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          width: '200px',
                          height: '80px',
                          flexShrink: 0
                        }}>
                        <JobBlock
                          job={job}
                          isDragging={snapshot.isDragging}
                          onClick={() => !snapshot.isDragging && (onJobClick ? onJobClick(job) : handleJobClick(job))}
                          deliveryTypes={deliveryTypes}
                          pickupLocations={pickupLocations}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
                {unscheduledJobs.length === 0 && (
                  <div className="text-gray-500 text-sm p-2 flex items-center">No unscheduled jobs for this date</div>
                )}
              </div>
            )}
          </Droppable>
        </div>

        {/* Time Header */}
        <div className="flex sticky top-0 z-20 bg-white border-b-2 border-gray-300 shadow-sm">
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
        <div className="pb-8">
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
                  isLastTruck ? 'border-b-2 border-gray-400 mb-4' : 'border-b border-gray-200'
                } min-h-[140px]`}>
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
                    return (
                      <div
                        key={slot.id}
                        className={`${slot.color} border-r border-gray-200 flex flex-1`}
                        style={{ minWidth: '200px' }}>
                        {[1, 3].map((blockStart) => {
                          const slotJobs = getJobsForCell(truck.id, slot.id, blockStart);
                          const slotPlaceholders = getPlaceholdersForCell(truck.id, slot.id, blockStart);
                          const droppableId = `${truck.id}-${slot.id}-${blockStart}`;
                          const cellKey = droppableId;
                          const isDraggingOver = draggingOverCell === cellKey;

                          return (
                            <Droppable
                              key={blockStart}
                              droppableId={droppableId}
                              direction="vertical"
                              isDropDisabled={!dragDropEnabled}>
                              {(provided, snapshot) => {
                                if (snapshot.isDraggingOver && draggingOverCell !== cellKey) {
                                  setDraggingOverCell(cellKey);
                                } else if (!snapshot.isDraggingOver && draggingOverCell === cellKey) {
                                  setDraggingOverCell(null);
                                }

                                return (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`relative border-r border-gray-200 group overflow-visible flex-1 ${
                                      snapshot.isDraggingOver ? 'ring-2 ring-inset ring-blue-500 bg-blue-100' : ''
                                    }`}
                                    style={{
                                      minWidth: '100px',
                                      minHeight: '132px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      position: 'relative'
                                    }}>
                                    {/* Top Placeholder Button */}
                                    {canCreatePlaceholder && slotJobs.length > 0 && !isDraggingOver && (
                                      <button
                                        onClick={() => onOpenPlaceholderDialog(truck.id, slot.id, blockStart)}
                                        className="absolute top-1 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-full p-1 z-20 shadow-sm"
                                        style={{ width: '24px', height: '24px' }}>
                                        <Plus className="h-3 w-3 text-gray-600" />
                                      </button>
                                    )}

                                    {/* Centered Content Container */}
                                    <div
                                      className="flex flex-col gap-2 items-center justify-center w-full px-1">
                                      {slotJobs.map((job, index) => (
                                        <Draggable
                                          key={job.id}
                                          draggableId={job.id}
                                          index={index}
                                          isDragDisabled={!dragDropEnabled}>
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              style={{
                                                ...provided.draggableProps.style,
                                                width: '100%',
                                                maxWidth: '196px',
                                                minHeight: '100px'
                                              }}>
                                              <ScheduledJobBlock
                                                job={job}
                                                isDragging={snapshot.isDragging}
                                                onClick={() =>
                                                  !snapshot.isDragging &&
                                                  (onJobClick ? onJobClick(job) : handleJobClick(job))
                                                }
                                                deliveryTypes={deliveryTypes}
                                                pickupLocations={pickupLocations}
                                              />
                                            </div>
                                          )}
                                        </Draggable>
                                      ))}

                                      {slotPlaceholders.map((placeholder) => (
                                        <div
                                          key={placeholder.id}
                                          style={{
                                            minHeight: '60px',
                                            width: '100%',
                                            maxWidth: '196px'
                                          }}>
                                          <PlaceholderBlock
                                            placeholder={placeholder}
                                            onUpdated={() => window.location.reload()}
                                          />
                                        </div>
                                      ))}
                                    </div>

                                    {/* Bottom Placeholder Button */}
                                    {canCreatePlaceholder && slotJobs.length > 0 && !isDraggingOver && (
                                      <button
                                        onClick={() => onOpenPlaceholderDialog(truck.id, slot.id, blockStart)}
                                        className="absolute bottom-1 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-100 border-2 border-gray-300 rounded-full p-1 z-20 shadow-sm"
                                        style={{ width: '24px', height: '24px' }}>
                                        <Plus className="h-3 w-3 text-gray-600" />
                                      </button>
                                    )}

                                    {/* Empty Cell Placeholder Button */}
                                    {canCreatePlaceholder && slotJobs.length === 0 && slotPlaceholders.length === 0 && !isDraggingOver && (
                                      <button
                                        onClick={() => onOpenPlaceholderDialog(truck.id, slot.id, blockStart)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-2 z-10"
                                        style={{ width: '48px', height: '48px' }}>
                                        <Plus className="h-6 w-6 text-gray-400" />
                                      </button>
                                    )}

                                    {provided.placeholder}
                                  </div>
                                );
                              }}
                            </Droppable>
                          );
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
