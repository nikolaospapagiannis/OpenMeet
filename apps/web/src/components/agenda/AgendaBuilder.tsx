'use client';

/**
 * Agenda Builder Component
 * Drag-and-drop agenda item editor with time estimates and AI suggestions
 */

import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Clock, GripVertical, Plus, Trash2, User } from 'lucide-react';

interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  duration: number;
  owner?: string;
  priority: 'high' | 'medium' | 'low';
  type: 'discussion' | 'decision' | 'update' | 'brainstorm' | 'review';
  order: number;
  notes?: string;
}

interface AgendaBuilderProps {
  items: AgendaItem[];
  onItemsChange: (items: AgendaItem[]) => void;
  maxDuration?: number;
  readOnly?: boolean;
}

const ITEM_TYPES = [
  { value: 'discussion', label: 'Discussion', color: 'bg-blue-100 text-blue-800' },
  { value: 'decision', label: 'Decision', color: 'bg-purple-100 text-purple-800' },
  { value: 'update', label: 'Update', color: 'bg-green-100 text-green-800' },
  { value: 'brainstorm', label: 'Brainstorm', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'review', label: 'Review', color: 'bg-gray-100 text-gray-800' }
];

const PRIORITY_COLORS = {
  high: 'border-red-300 bg-red-50',
  medium: 'border-yellow-300 bg-yellow-50',
  low: 'border-green-300 bg-green-50'
};

export default function AgendaBuilder({
  items,
  onItemsChange,
  maxDuration = 60,
  readOnly = false
}: AgendaBuilderProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);
  const isOverTime = totalDuration > maxDuration;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || readOnly) return;

    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    // Update order
    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    onItemsChange(updatedItems);
  };

  const handleAddItem = () => {
    const newItem: AgendaItem = {
      id: `item-${Date.now()}`,
      title: 'New Agenda Item',
      duration: 10,
      priority: 'medium',
      type: 'discussion',
      order: items.length + 1
    };

    onItemsChange([...items, newItem]);
    setEditingItem(newItem.id);
  };

  const handleDeleteItem = (id: string) => {
    const updatedItems = items
      .filter(item => item.id !== id)
      .map((item, index) => ({ ...item, order: index + 1 }));
    onItemsChange(updatedItems);
  };

  const handleUpdateItem = (id: string, updates: Partial<AgendaItem>) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, ...updates } : item
    );
    onItemsChange(updatedItems);
  };

  return (
    <div className="space-y-4">
      {/* Header with Duration Summary */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Total Duration:
            </span>
            <span className={`text-lg font-bold ${isOverTime ? 'text-red-600' : 'text-green-600'}`}>
              {totalDuration} min
            </span>
          </div>
          {maxDuration && (
            <div className="text-sm text-gray-500">
              / {maxDuration} min allocated
            </div>
          )}
        </div>

        {!readOnly && (
          <button
            onClick={handleAddItem}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isOverTime ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min((totalDuration / maxDuration) * 100, 100)}%` }}
        />
      </div>

      {/* Agenda Items */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="agenda-items">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-3 ${
                snapshot.isDraggingOver ? 'bg-blue-50' : ''
              } p-2 rounded-lg transition-colors`}
            >
              {items.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg">No agenda items yet</p>
                  <p className="text-sm">Click "Add Item" to get started</p>
                </div>
              ) : (
                items.map((item, index) => (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
                    index={index}
                    isDragDisabled={readOnly}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-white rounded-lg border-2 transition-all ${
                          PRIORITY_COLORS[item.priority]
                        } ${snapshot.isDragging ? 'shadow-lg scale-105' : 'shadow'}`}
                      >
                        <div className="p-4">
                          <div className="flex items-start space-x-3">
                            {/* Drag Handle */}
                            {!readOnly && (
                              <div
                                {...provided.dragHandleProps}
                                className="mt-1 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="w-5 h-5 text-gray-400" />
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 space-y-3">
                              {/* Title and Type */}
                              <div className="flex items-start justify-between gap-4">
                                {editingItem === item.id && !readOnly ? (
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) =>
                                      handleUpdateItem(item.id, { title: e.target.value })
                                    }
                                    onBlur={() => setEditingItem(null)}
                                    className="flex-1 text-lg font-semibold text-gray-900 border-b-2 border-blue-500 focus:outline-none"
                                    autoFocus
                                  />
                                ) : (
                                  <h3
                                    className="flex-1 text-lg font-semibold text-gray-900 cursor-pointer"
                                    onClick={() => !readOnly && setEditingItem(item.id)}
                                  >
                                    {item.order}. {item.title}
                                  </h3>
                                )}

                                <div className="flex items-center space-x-2">
                                  <select
                                    value={item.type}
                                    onChange={(e) =>
                                      handleUpdateItem(item.id, {
                                        type: e.target.value as AgendaItem['type']
                                      })
                                    }
                                    disabled={readOnly}
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      ITEM_TYPES.find(t => t.value === item.type)?.color
                                    } border-0 focus:ring-2 focus:ring-blue-500`}
                                  >
                                    {ITEM_TYPES.map(type => (
                                      <option key={type.value} value={type.value}>
                                        {type.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Description */}
                              {item.description && (
                                <p className="text-sm text-gray-600">{item.description}</p>
                              )}

                              {/* Metadata Row */}
                              <div className="flex items-center space-x-6 text-sm">
                                {/* Duration */}
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  {readOnly ? (
                                    <span className="text-gray-700">{item.duration} min</span>
                                  ) : (
                                    <input
                                      type="number"
                                      value={item.duration}
                                      onChange={(e) =>
                                        handleUpdateItem(item.id, {
                                          duration: parseInt(e.target.value) || 0
                                        })
                                      }
                                      className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                      min="1"
                                      max="480"
                                    />
                                  )}
                                </div>

                                {/* Owner */}
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4 text-gray-400" />
                                  {readOnly ? (
                                    <span className="text-gray-700">
                                      {item.owner || 'Unassigned'}
                                    </span>
                                  ) : (
                                    <input
                                      type="text"
                                      value={item.owner || ''}
                                      onChange={(e) =>
                                        handleUpdateItem(item.id, { owner: e.target.value })
                                      }
                                      placeholder="Owner"
                                      className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                  )}
                                </div>

                                {/* Priority */}
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-500">Priority:</span>
                                  <select
                                    value={item.priority}
                                    onChange={(e) =>
                                      handleUpdateItem(item.id, {
                                        priority: e.target.value as AgendaItem['priority']
                                      })
                                    }
                                    disabled={readOnly}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                  </select>
                                </div>

                                {/* Delete Button */}
                                {!readOnly && (
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="ml-auto text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                                    title="Delete item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {/* Notes */}
                              {item.notes && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                                  <p className="font-medium text-gray-700 mb-1">Notes:</p>
                                  <p>{item.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Warning if over time */}
      {isOverTime && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm font-medium">
            Warning: Agenda duration exceeds allocated time by {totalDuration - maxDuration}{' '}
            minutes
          </p>
        </div>
      )}
    </div>
  );
}
