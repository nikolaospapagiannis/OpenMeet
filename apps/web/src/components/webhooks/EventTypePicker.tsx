'use client';

import { useState } from 'react';
import { Check, X, Calendar, FileText, MessageSquare, Users, Link2, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-v2';
import { WebhookEvent } from '@/hooks/useWebhooks';

interface EventTypePickerProps {
  availableEvents: WebhookEvent[];
  selectedEvents: string[];
  onEventsChange: (events: string[]) => void;
}

const eventIcons: Record<string, React.ReactNode> = {
  'meeting.created': <Calendar className="w-4 h-4" />,
  'meeting.updated': <Calendar className="w-4 h-4" />,
  'meeting.deleted': <Calendar className="w-4 h-4" />,
  'meeting.started': <Calendar className="w-4 h-4" />,
  'meeting.completed': <Calendar className="w-4 h-4" />,
  'transcript.created': <FileText className="w-4 h-4" />,
  'transcript.updated': <FileText className="w-4 h-4" />,
  'summary.created': <FileText className="w-4 h-4" />,
  'comment.created': <MessageSquare className="w-4 h-4" />,
  'integration.connected': <Link2 className="w-4 h-4" />,
  'integration.disconnected': <Link2 className="w-4 h-4" />,
  'user.invited': <Users className="w-4 h-4" />,
  'user.removed': <Users className="w-4 h-4" />,
};

const eventCategories = {
  Meeting: ['meeting.created', 'meeting.updated', 'meeting.deleted', 'meeting.started', 'meeting.completed'],
  Content: ['transcript.created', 'transcript.updated', 'summary.created', 'comment.created'],
  Integration: ['integration.connected', 'integration.disconnected'],
  Team: ['user.invited', 'user.removed'],
};

export function EventTypePicker({ availableEvents, selectedEvents, onEventsChange }: EventTypePickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const toggleEvent = (eventName: string) => {
    if (selectedEvents.includes(eventName)) {
      onEventsChange(selectedEvents.filter(e => e !== eventName));
    } else {
      onEventsChange([...selectedEvents, eventName]);
    }
  };

  const toggleCategory = (events: string[]) => {
    const allSelected = events.every(e => selectedEvents.includes(e));
    if (allSelected) {
      onEventsChange(selectedEvents.filter(e => !events.includes(e)));
    } else {
      const newEvents = [...selectedEvents];
      events.forEach(e => {
        if (!newEvents.includes(e)) {
          newEvents.push(e);
        }
      });
      onEventsChange(newEvents);
    }
  };

  const selectAll = () => {
    onEventsChange(availableEvents.map(e => e.name));
  };

  const deselectAll = () => {
    onEventsChange([]);
  };

  const filteredEvents = availableEvents.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-semibold text-white">Webhook Events</h3>
          <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30">
            {selectedEvents.length} selected
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost-glass"
            size="sm"
            onClick={selectAll}
          >
            Select All
          </Button>
          <Button
            variant="ghost-glass"
            size="sm"
            onClick={deselectAll}
          >
            Clear All
          </Button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search events..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
      />

      <div className="space-y-4">
        {Object.entries(eventCategories).map(([category, categoryEvents]) => {
          const categoryFilteredEvents = categoryEvents.filter(eventName =>
            filteredEvents.some(e => e.name === eventName)
          );

          if (categoryFilteredEvents.length === 0) return null;

          const allCategorySelected = categoryFilteredEvents.every(e => selectedEvents.includes(e));

          return (
            <div key={category} className="space-y-2">
              <button
                onClick={() => toggleCategory(categoryFilteredEvents)}
                className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                <div className={`w-4 h-4 rounded border ${
                  allCategorySelected
                    ? 'bg-teal-500 border-teal-500'
                    : 'border-white/30 bg-transparent'
                }`}>
                  {allCategorySelected && <Check className="w-3 h-3 text-white" />}
                </div>
                {category}
              </button>

              <div className="ml-6 space-y-2">
                {categoryFilteredEvents.map(eventName => {
                  const event = availableEvents.find(e => e.name === eventName);
                  if (!event) return null;

                  const isSelected = selectedEvents.includes(event.name);

                  return (
                    <div
                      key={event.name}
                      onClick={() => toggleEvent(event.name)}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
                        ${isSelected
                          ? 'bg-teal-500/10 border border-teal-500/30'
                          : 'bg-slate-800/30 border border-white/5 hover:bg-slate-800/50'
                        }
                      `}
                    >
                      <div className={`
                        w-5 h-5 rounded border mt-0.5 flex items-center justify-center
                        ${isSelected
                          ? 'bg-teal-500 border-teal-500'
                          : 'border-white/30 bg-transparent'
                        }
                      `}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-teal-400">
                            {eventIcons[event.name] || <Bell className="w-4 h-4" />}
                          </span>
                          <span className="font-medium text-white">
                            {event.name}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400">No events found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}