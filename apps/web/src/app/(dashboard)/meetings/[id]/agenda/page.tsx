'use client';

/**
 * Meeting Agenda Page
 * Page for viewing and editing meeting agendas with AI suggestions
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sparkles, Save, ArrowLeft, Download } from 'lucide-react';
import AgendaBuilder from '@/components/agenda/AgendaBuilder';
import AgendaSuggestions from '@/components/agenda/AgendaSuggestions';

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

interface AgendaSuggestion {
  title: string;
  reasoning: string;
  confidence: number;
}

export default function AgendaPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [suggestions, setSuggestions] = useState<AgendaSuggestion[]>([]);
  const [context, setContext] = useState<any>(null);
  const [meeting, setMeeting] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgenda();
    loadMeeting();
  }, [meetingId]);

  const loadMeeting = async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        setMeeting(data.meeting);
      }
    } catch (err) {
      console.error('Failed to load meeting:', err);
    }
  };

  const loadAgenda = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/meetings/${meetingId}/agenda`);

      if (res.status === 404) {
        // No agenda yet - that's okay
        setItems([]);
      } else if (res.ok) {
        const data = await res.json();
        setItems(data.agenda.items || []);
      } else {
        throw new Error('Failed to load agenda');
      }
    } catch (err: any) {
      console.error('Failed to load agenda:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAgenda = async () => {
    try {
      setGenerating(true);
      setError(null);

      const res = await fetch(`/api/meetings/${meetingId}/agenda/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            openActionItems: true,
            calendarContext: true
          }
        })
      });

      if (!res.ok) {
        throw new Error('Failed to generate agenda');
      }

      const data = await res.json();
      setItems(data.agenda.items || []);
      setSuggestions(data.suggestions || []);
      setContext(data.context);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to generate agenda:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAgenda = async () => {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/meetings/${meetingId}/agenda`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (!res.ok) {
        throw new Error('Failed to save agenda');
      }

      // Success notification (you can add a toast here)
      console.log('Agenda saved successfully');
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to save agenda:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSuggestion = (suggestion: AgendaSuggestion) => {
    const newItem: AgendaItem = {
      id: `item-${Date.now()}`,
      title: suggestion.title,
      duration: 10,
      priority: 'medium',
      type: 'discussion',
      order: items.length + 1,
      notes: suggestion.reasoning
    };

    setItems([...items, newItem]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meeting Agenda</h1>
              {meeting && (
                <p className="text-gray-600 mt-1">{meeting.title}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {items.length === 0 && (
              <button
                onClick={handleGenerateAgenda}
                disabled={generating}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generating ? 'Generating...' : 'Generate with AI'}</span>
              </button>
            )}

            <button
              onClick={handleSaveAgenda}
              disabled={saving || items.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>

            <button
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agenda Builder */}
          <div className="lg:col-span-2">
            <AgendaBuilder
              items={items}
              onItemsChange={setItems}
              maxDuration={meeting?.durationSeconds ? Math.round(meeting.durationSeconds / 60) : 60}
            />
          </div>

          {/* AI Suggestions */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <AgendaSuggestions
                suggestions={suggestions}
                onAddSuggestion={handleAddSuggestion}
                context={context}
                loading={generating}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
