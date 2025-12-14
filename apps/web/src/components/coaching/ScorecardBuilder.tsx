'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle
} from '@/components/ui/card-glass';

interface Template {
  type: string;
  name: string;
  description: string;
  icon: string;
  criteria: number;
}

interface Criterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: string;
  evaluationPrompt: string;
}

interface ScorecardBuilderProps {
  template: Template | null;
  onSave: (templateType: string, customCriteria?: Criterion[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const defaultCriteria: { [key: string]: Criterion[] } = {
  sales: [
    {
      id: 'discovery',
      name: 'Discovery & Qualification',
      description: 'How well did they understand customer needs?',
      weight: 20,
      category: 'discovery',
      evaluationPrompt: 'Evaluate discovery questions, pain point identification, and MEDDPICC/BANT qualification'
    },
    {
      id: 'value_prop',
      name: 'Value Proposition',
      description: 'How effectively was value communicated?',
      weight: 25,
      category: 'presentation',
      evaluationPrompt: 'Assess clarity of value proposition and alignment with customer needs'
    },
    {
      id: 'objections',
      name: 'Objection Handling',
      description: 'How well were concerns addressed?',
      weight: 20,
      category: 'objection_handling',
      evaluationPrompt: 'Evaluate response to objections and concerns'
    },
    {
      id: 'closing',
      name: 'Closing & Next Steps',
      description: 'Were next steps clearly established?',
      weight: 20,
      category: 'closing',
      evaluationPrompt: 'Assess closing techniques and clarity of next steps'
    },
    {
      id: 'rapport',
      name: 'Rapport Building',
      description: 'How strong was the relationship building?',
      weight: 15,
      category: 'rapport',
      evaluationPrompt: 'Evaluate rapport, active listening, and engagement'
    }
  ],
  support: [
    {
      id: 'problem_understanding',
      name: 'Problem Understanding',
      description: 'How well was the issue understood?',
      weight: 25,
      category: 'discovery',
      evaluationPrompt: 'Evaluate problem diagnosis and clarifying questions'
    },
    {
      id: 'solution',
      name: 'Solution Effectiveness',
      description: 'Was the solution appropriate and complete?',
      weight: 30,
      category: 'presentation',
      evaluationPrompt: 'Assess solution quality and completeness'
    },
    {
      id: 'empathy',
      name: 'Empathy & Patience',
      description: 'How empathetic was the support?',
      weight: 20,
      category: 'rapport',
      evaluationPrompt: 'Evaluate empathy, patience, and emotional intelligence'
    },
    {
      id: 'communication',
      name: 'Communication Clarity',
      description: 'How clear were the explanations?',
      weight: 15,
      category: 'presentation',
      evaluationPrompt: 'Assess clarity of explanations and technical communication'
    },
    {
      id: 'follow_up',
      name: 'Follow-up & Resolution',
      description: 'Was the issue fully resolved?',
      weight: 10,
      category: 'closing',
      evaluationPrompt: 'Evaluate issue resolution and follow-up commitment'
    }
  ]
};

export function ScorecardBuilder({ template, onSave, onCancel, isLoading }: ScorecardBuilderProps) {
  const initialCriteria = template && template.type !== 'custom' && defaultCriteria[template.type]
    ? defaultCriteria[template.type]
    : [];

  const [criteria, setCriteria] = useState<Criterion[]>(initialCriteria);
  const [customName, setCustomName] = useState(template?.name || '');

  const addCriterion = () => {
    const newCriterion: Criterion = {
      id: `custom_${Date.now()}`,
      name: '',
      description: '',
      weight: 10,
      category: 'custom',
      evaluationPrompt: ''
    };
    setCriteria([...criteria, newCriterion]);
  };

  const updateCriterion = (index: number, updates: Partial<Criterion>) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], ...updates };
    setCriteria(updated);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const getTotalWeight = () => {
    return criteria.reduce((sum, c) => sum + c.weight, 0);
  };

  const normalizeWeights = () => {
    const total = getTotalWeight();
    if (total === 0) return;

    const normalized = criteria.map(c => ({
      ...c,
      weight: Math.round((c.weight / total) * 100)
    }));
    setCriteria(normalized);
  };

  const handleSave = () => {
    if (template) {
      if (template.type === 'custom') {
        onSave('sales', criteria); // Default to sales template with custom criteria
      } else {
        onSave(template.type, criteria.length > 0 ? criteria : undefined);
      }
    }
  };

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      discovery: '#22c55e',
      presentation: '#3b82f6',
      objection_handling: '#f59e0b',
      closing: '#a855f7',
      rapport: '#06b6d4',
      custom: '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <CardGlass>
        <CardGlassHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardGlassTitle>
                {template?.type === 'custom' ? 'Custom Scorecard Builder' : `${template?.name} Template`}
              </CardGlassTitle>
              <p className="text-sm text-[var(--ff-text-muted)] mt-1">
                {template?.description}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onCancel}
                className="px-4 py-2 bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] rounded-lg hover:bg-[var(--ff-border)]"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading || criteria.length === 0}
                className="px-4 py-2 bg-[var(--ff-purple-500)] text-white rounded-lg hover:bg-[var(--ff-purple-600)]"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Scorecard
              </Button>
            </div>
          </div>
        </CardGlassHeader>
        {template?.type === 'custom' && (
          <CardGlassContent>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--ff-text-secondary)]">
                Scorecard Name
              </label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter scorecard name..."
                className="w-full bg-[var(--ff-bg-dark)] border-[var(--ff-border)]"
              />
            </div>
          </CardGlassContent>
        )}
      </CardGlass>

      {/* Weight Summary */}
      <CardGlass>
        <CardGlassContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--ff-text-secondary)]">
                Total Weight
              </p>
              <p className={`text-2xl font-bold ${getTotalWeight() === 100 ? 'text-green-500' : 'text-[var(--ff-text-primary)]'}`}>
                {getTotalWeight()}%
              </p>
            </div>
            {getTotalWeight() !== 100 && (
              <Button
                onClick={normalizeWeights}
                className="px-4 py-2 bg-[var(--ff-purple-500)]/10 text-[var(--ff-purple-500)] rounded-lg hover:bg-[var(--ff-purple-500)]/20"
              >
                Normalize to 100%
              </Button>
            )}
          </div>
        </CardGlassContent>
      </CardGlass>

      {/* Criteria List */}
      <div className="space-y-4">
        {criteria.map((criterion, index) => (
          <CardGlass key={criterion.id}>
            <CardGlassContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <GripVertical className="h-5 w-5 text-[var(--ff-text-muted)] mt-1 cursor-move" />

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-[var(--ff-text-muted)] block mb-1">
                        Criterion Name
                      </label>
                      <Input
                        value={criterion.name}
                        onChange={(e) => updateCriterion(index, { name: e.target.value })}
                        placeholder="e.g., Discovery Questions"
                        className="w-full bg-[var(--ff-bg-dark)] border-[var(--ff-border)] text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-[var(--ff-text-muted)] block mb-1">
                          Weight
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={criterion.weight}
                            onChange={(e) => updateCriterion(index, { weight: parseInt(e.target.value) || 0 })}
                            min="0"
                            max="100"
                            className="w-20 bg-[var(--ff-bg-dark)] border-[var(--ff-border)] text-sm"
                          />
                          <span className="text-sm text-[var(--ff-text-muted)]">%</span>
                        </div>
                      </div>

                      <div className="flex-1">
                        <label className="text-xs font-medium text-[var(--ff-text-muted)] block mb-1">
                          Category
                        </label>
                        <div
                          className="px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center"
                          style={{
                            backgroundColor: `${getCategoryColor(criterion.category)}20`,
                            color: getCategoryColor(criterion.category)
                          }}
                        >
                          {criterion.category.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => removeCriterion(index)}
                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="ml-9">
                  <label className="text-xs font-medium text-[var(--ff-text-muted)] block mb-1">
                    Description
                  </label>
                  <Input
                    value={criterion.description}
                    onChange={(e) => updateCriterion(index, { description: e.target.value })}
                    placeholder="Brief description of what to evaluate..."
                    className="w-full bg-[var(--ff-bg-dark)] border-[var(--ff-border)] text-sm"
                  />
                </div>

                <div className="ml-9">
                  <label className="text-xs font-medium text-[var(--ff-text-muted)] block mb-1">
                    Evaluation Prompt
                  </label>
                  <textarea
                    value={criterion.evaluationPrompt}
                    onChange={(e) => updateCriterion(index, { evaluationPrompt: e.target.value })}
                    placeholder="Detailed instructions for AI evaluation..."
                    className="w-full bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-lg p-2 text-sm text-[var(--ff-text-primary)] resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </CardGlassContent>
          </CardGlass>
        ))}
      </div>

      {/* Add Criterion Button */}
      {template?.type === 'custom' && (
        <Button
          onClick={addCriterion}
          className="w-full py-3 bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)] rounded-lg hover:bg-[var(--ff-border)] border-2 border-dashed border-[var(--ff-border)]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Evaluation Criterion
        </Button>
      )}
    </div>
  );
}