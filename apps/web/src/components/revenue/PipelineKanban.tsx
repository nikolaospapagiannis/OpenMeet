'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Deal } from '@/hooks/useRevenueIntelligence';
import { formatDistanceToNow } from 'date-fns';

interface PipelineKanbanProps {
  deals: Deal[];
  onDealMove: (dealId: string, newStage: Deal['stage']) => void;
  onDealSelect: (dealId: string) => void;
}

const STAGE_CONFIG = {
  discovery: {
    label: 'Discovery',
    color: 'bg-blue-500',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/10',
  },
  qualification: {
    label: 'Qualification',
    color: 'bg-indigo-500',
    borderColor: 'border-indigo-500/20',
    bgColor: 'bg-indigo-500/10',
  },
  proposal: {
    label: 'Proposal',
    color: 'bg-purple-500',
    borderColor: 'border-purple-500/20',
    bgColor: 'bg-purple-500/10',
  },
  negotiation: {
    label: 'Negotiation',
    color: 'bg-orange-500',
    borderColor: 'border-orange-500/20',
    bgColor: 'bg-orange-500/10',
  },
  'closed-won': {
    label: 'Closed Won',
    color: 'bg-green-500',
    borderColor: 'border-green-500/20',
    bgColor: 'bg-green-500/10',
  },
  'closed-lost': {
    label: 'Closed Lost',
    color: 'bg-red-500',
    borderColor: 'border-red-500/20',
    bgColor: 'bg-red-500/10',
  },
};

function DealCard({ deal, isDragging }: { deal: Deal; isDragging?: boolean }) {
  const healthColor = deal.healthScore > 70 ? 'text-green-400' :
                     deal.healthScore > 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div
      className={`p-4 rounded-lg border transition-all cursor-grab ${
        isDragging
          ? 'bg-gray-900/50 border-purple-500 shadow-2xl scale-105 opacity-50'
          : 'bg-gray-900/80 border-gray-700 hover:border-purple-500/50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-sm text-white truncate flex-1">
          {deal.name}
        </h4>
        {deal.crmSynced && (
          <span className="text-green-400 text-xs ml-2" title="CRM Synced">
            ✓
          </span>
        )}
      </div>

      <p className="text-gray-400 text-xs mb-3 truncate">{deal.company}</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-white">
            ${(deal.value / 1000).toFixed(0)}k
          </span>
          <span className={`text-xs font-medium ${healthColor}`}>
            {deal.healthScore}%
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {deal.daysInStage}d in stage
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            deal.engagementLevel === 'high' ? 'bg-green-500/20 text-green-400' :
            deal.engagementLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {deal.engagementLevel}
          </span>
        </div>

        {deal.competitors.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-orange-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {deal.competitors.length} competitor{deal.competitors.length > 1 ? 's' : ''}
          </div>
        )}

        <div className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(deal.lastActivity), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

function SortableDealCard({ deal, onSelect }: { deal: Deal; onSelect: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className="mb-3"
    >
      <DealCard deal={deal} isDragging={isDragging} />
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  onDealSelect,
}: {
  stage: Deal['stage'];
  deals: Deal[];
  onDealSelect: (dealId: string) => void;
}) {
  const config = STAGE_CONFIG[stage];
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);

  return (
    <div className="flex flex-col h-full">
      <div className={`p-3 rounded-t-lg border border-b-0 ${config.borderColor} ${config.bgColor}`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-white">{config.label}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
            {deals.length}
          </span>
        </div>
        <p className="text-sm text-gray-400">
          ${(totalValue / 1000000).toFixed(2)}M
        </p>
      </div>

      <div className={`flex-1 p-3 border border-t-0 rounded-b-lg overflow-y-auto ${config.borderColor} bg-gray-900/20`}>
        <SortableContext
          items={deals.map(d => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No deals in this stage
            </div>
          ) : (
            deals.map(deal => (
              <SortableDealCard
                key={deal.id}
                deal={deal}
                onSelect={() => onDealSelect(deal.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export function PipelineKanban({ deals, onDealMove, onDealSelect }: PipelineKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<Deal['stage'], Deal[]> = {
      discovery: [],
      qualification: [],
      proposal: [],
      negotiation: [],
      'closed-won': [],
      'closed-lost': [],
    };

    deals.forEach(deal => {
      grouped[deal.stage].push(deal);
    });

    return grouped;
  }, [deals]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeDeal = deals.find(d => d.id === active.id);
    if (!activeDeal) {
      setActiveId(null);
      return;
    }

    // Find which stage the deal was dropped into
    let targetStage: Deal['stage'] | null = null;

    // Check if dropped on another deal
    const overDeal = deals.find(d => d.id === over.id);
    if (overDeal) {
      targetStage = overDeal.stage;
    } else {
      // Check if dropped on a stage column
      targetStage = over.id as Deal['stage'];
    }

    if (targetStage && targetStage !== activeDeal.stage) {
      onDealMove(activeDeal.id, targetStage);
    }

    setActiveId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeDeal = deals.find(d => d.id === active.id);
    if (!activeDeal) return;

    let targetStage: Deal['stage'] | null = null;

    // Check if over another deal
    const overDeal = deals.find(d => d.id === over.id);
    if (overDeal) {
      targetStage = overDeal.stage;
    } else {
      // Check if over a stage column
      targetStage = over.id as Deal['stage'];
    }

    if (targetStage && targetStage !== activeDeal.stage) {
      // This will trigger a re-render with the deal in the new stage
      onDealMove(activeDeal.id, targetStage);
    }
  };

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null;

  const stages: Deal['stage'][] = [
    'discovery',
    'qualification',
    'proposal',
    'negotiation',
    'closed-won',
    'closed-lost',
  ];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 h-[600px]">
        {stages.map(stage => (
          <StageColumn
            key={stage}
            stage={stage}
            deals={dealsByStage[stage]}
            onDealSelect={onDealSelect}
          />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}