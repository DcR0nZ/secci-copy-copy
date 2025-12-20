import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';

export default function RosterCard({ employee }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: employee.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOnShift = employee.userWorkStatus === 'ON_SHIFT';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-move"
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-semibold text-sm">
                {employee.full_name?.charAt(0) || employee.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{employee.full_name || employee.email}</p>
              {isOnShift && (
                <Badge className="bg-green-500 text-white text-xs mt-1">On Shift</Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}