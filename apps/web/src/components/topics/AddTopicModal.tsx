'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Info, AlertCircle, Check } from 'lucide-react';
import apiClient from '@/lib/api';

interface AddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (topic: any) => void;
}

export default function AddTopicModal({ isOpen, onClose, onAdd }: AddTopicModalProps) {
  const [formData, setFormData] = useState({
    keyword: '',
    name: '',
    description: '',
    alertEnabled: false,
    alertThreshold: 10,
    alertRecipients: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [currentRecipient, setCurrentRecipient] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Sample suggestions based on common topics
  const commonTopics = [
    'pricing', 'competition', 'budget', 'timeline', 'requirements',
    'integration', 'security', 'performance', 'scalability', 'support',
    'contract', 'renewal', 'roadmap', 'features', 'implementation'
  ];

  useEffect(() => {
    if (formData.keyword) {
      const filtered = commonTopics.filter(t =>
        t.includes(formData.keyword.toLowerCase()) &&
        t !== formData.keyword.toLowerCase()
      );
      setSuggestions(filtered.slice(0, 3));
    } else {
      setSuggestions([]);
    }
  }, [formData.keyword]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.keyword.trim()) {
      newErrors.keyword = 'Keyword is required';
    } else if (formData.keyword.length < 2) {
      newErrors.keyword = 'Keyword must be at least 2 characters';
    } else if (formData.keyword.length > 50) {
      newErrors.keyword = 'Keyword must be less than 50 characters';
    }

    if (formData.alertEnabled && formData.alertThreshold < 1) {
      newErrors.alertThreshold = 'Alert threshold must be at least 1';
    }

    if (formData.alertEnabled && formData.alertRecipients.length === 0) {
      newErrors.alertRecipients = 'At least one recipient is required when alerts are enabled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await apiClient.createTopic({
        keyword: formData.keyword.trim(),
        name: formData.name || formData.keyword,
        description: formData.description,
        alertThreshold: formData.alertEnabled ? formData.alertThreshold : undefined,
        alertEnabled: formData.alertEnabled,
        alertRecipients: formData.alertRecipients
      });

      onAdd(response);
      handleClose();
    } catch (error) {
      console.error('Error creating topic:', error);
      setErrors({ submit: 'Failed to create topic. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      keyword: '',
      name: '',
      description: '',
      alertEnabled: false,
      alertThreshold: 10,
      alertRecipients: []
    });
    setErrors({});
    setCurrentRecipient('');
    onClose();
  };

  const addRecipient = () => {
    if (currentRecipient && !formData.alertRecipients.includes(currentRecipient)) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentRecipient)) {
        setFormData(prev => ({
          ...prev,
          alertRecipients: [...prev.alertRecipients, currentRecipient]
        }));
        setCurrentRecipient('');
        setErrors(prev => ({ ...prev, alertRecipients: '' }));
      } else {
        setErrors(prev => ({ ...prev, currentRecipient: 'Invalid email address' }));
      }
    }
  };

  const removeRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      alertRecipients: prev.alertRecipients.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--ff-border)]">
          <h2 className="heading-s text-white">Add Topic Tracker</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Keyword */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Keyword to Track <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.keyword}
              onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              placeholder="e.g., pricing, competition, budget"
              className={`input-ff w-full ${errors.keyword ? 'border-red-500' : ''}`}
            />
            {errors.keyword && (
              <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.keyword}
              </p>
            )}
            {suggestions.length > 0 && (
              <div className="mt-2 flex gap-2">
                <span className="text-xs text-gray-400">Suggestions:</span>
                {suggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setFormData({ ...formData, keyword: suggestion })}
                    className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Display Name (Optional)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="A friendly name for this topic"
              className="input-ff w-full"
            />
            <p className="mt-1 text-xs text-gray-400">
              If not provided, the keyword will be used as the name
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Why are you tracking this topic?"
              rows={3}
              className="input-ff w-full resize-none"
            />
          </div>

          {/* Alert Configuration */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="alertEnabled"
                checked={formData.alertEnabled}
                onChange={(e) => setFormData({ ...formData, alertEnabled: e.target.checked })}
                className="w-4 h-4 text-[var(--ff-purple-500)] bg-white/10 border-gray-600 rounded focus:ring-[var(--ff-purple-500)]"
              />
              <label htmlFor="alertEnabled" className="text-sm font-medium text-white">
                Enable Alerts
              </label>
            </div>

            {formData.alertEnabled && (
              <div className="space-y-4 p-4 bg-white/5 rounded-lg">
                {/* Alert Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Alert Threshold
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={formData.alertThreshold}
                      onChange={(e) => setFormData({ ...formData, alertThreshold: Number(e.target.value) })}
                      className={`input-ff w-24 ${errors.alertThreshold ? 'border-red-500' : ''}`}
                    />
                    <span className="text-sm text-gray-400">mentions per day</span>
                  </div>
                  {errors.alertThreshold && (
                    <p className="mt-1 text-sm text-red-400">{errors.alertThreshold}</p>
                  )}
                </div>

                {/* Recipients */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Alert Recipients
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="email"
                      value={currentRecipient}
                      onChange={(e) => {
                        setCurrentRecipient(e.target.value);
                        setErrors(prev => ({ ...prev, currentRecipient: '' }));
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                      placeholder="Enter email address"
                      className={`input-ff flex-1 ${errors.currentRecipient ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={addRecipient}
                      className="button-secondary button-small"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {errors.currentRecipient && (
                    <p className="text-sm text-red-400 mb-2">{errors.currentRecipient}</p>
                  )}
                  {errors.alertRecipients && (
                    <p className="text-sm text-red-400 mb-2">{errors.alertRecipients}</p>
                  )}
                  {formData.alertRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.alertRecipients.map((email, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-sm"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeRecipient(index)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex gap-3">
              <Info className="text-blue-400 mt-0.5" size={18} />
              <div className="text-sm">
                <p className="text-blue-400 font-medium mb-1">How it works</p>
                <p className="text-gray-300">
                  We'll track mentions of this keyword across all your meetings.
                  You'll see trends, get alerts, and discover related topics.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--ff-border)]">
          <button
            type="button"
            onClick={handleClose}
            className="button-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="button-primary flex items-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <Check size={18} />
                Create Topic Tracker
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}