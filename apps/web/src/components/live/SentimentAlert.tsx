/**
 * Sentiment Alert Component
 *
 * Displays real-time alerts for sentiment events
 * Supports different alert types and severities with visual indicators
 */

'use client';

import { useState, useEffect } from 'react';

export interface SentimentAlertData {
  id: string;
  sessionId: string;
  timestamp: number;
  type: 'negative_trend' | 'sudden_drop' | 'disengagement' | 'anger_detected' | 'concern_raised';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  relatedAnalysis?: {
    speaker?: string;
    text?: string;
    sentiment?: {
      overall: number;
    };
  };
  acknowledged: boolean;
}

interface SentimentAlertProps {
  alert: SentimentAlertData;
  onAcknowledge?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

// Alert type configuration
const ALERT_CONFIGS = {
  negative_trend: {
    icon: '📉',
    title: 'Negative Trend',
    description: 'Sentiment declining over time',
    color: '#f59e0b' // Amber
  },
  sudden_drop: {
    icon: '⚠️',
    title: 'Sudden Drop',
    description: 'Rapid sentiment decrease detected',
    color: '#ef4444' // Red
  },
  disengagement: {
    icon: '😴',
    title: 'Disengagement',
    description: 'Low engagement levels detected',
    color: '#94a3b8' // Gray
  },
  anger_detected: {
    icon: '😠',
    title: 'Anger Detected',
    description: 'High anger emotion levels',
    color: '#dc2626' // Dark Red
  },
  concern_raised: {
    icon: '🚨',
    title: 'Concern Raised',
    description: 'Participant expressed concern',
    color: '#a855f7' // Purple
  }
};

// Severity configuration
const SEVERITY_STYLES = {
  low: {
    border: 'border-l-2',
    bg: 'bg-opacity-10',
    animation: ''
  },
  medium: {
    border: 'border-l-4',
    bg: 'bg-opacity-20',
    animation: ''
  },
  high: {
    border: 'border-l-4',
    bg: 'bg-opacity-30',
    animation: 'animate-pulse'
  },
  critical: {
    border: 'border-l-4',
    bg: 'bg-opacity-40',
    animation: 'animate-pulse'
  }
};

export default function SentimentAlert({
  alert,
  onAcknowledge,
  autoHide = false,
  autoHideDelay = 5000
}: SentimentAlertProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeSinceAlert, setTimeSinceAlert] = useState('');

  const config = ALERT_CONFIGS[alert.type];
  const severityStyle = SEVERITY_STYLES[alert.severity];

  // Update time since alert
  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      const diff = now - alert.timestamp;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        setTimeSinceAlert(`${hours}h ago`);
      } else if (minutes > 0) {
        setTimeSinceAlert(`${minutes}m ago`);
      } else {
        setTimeSinceAlert(`${seconds}s ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [alert.timestamp]);

  // Auto-hide functionality
  useEffect(() => {
    if (autoHide && !alert.acknowledged) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, alert.acknowledged]);

  if (!isVisible) return null;

  const handleAcknowledge = () => {
    if (onAcknowledge) {
      onAcknowledge();
    }
    // Add fade out animation before hiding
    const element = document.getElementById(`alert-${alert.id}`);
    if (element) {
      element.style.opacity = '0';
      setTimeout(() => setIsVisible(false), 300);
    }
  };

  return (
    <div
      id={`alert-${alert.id}`}
      className={`
        sentiment-alert
        relative
        bg-[var(--ff-bg-layer)]
        rounded-lg
        p-3
        transition-all
        duration-300
        ${severityStyle.border}
        ${severityStyle.animation}
        ${alert.acknowledged ? 'opacity-50' : 'opacity-100'}
      `}
      style={{
        borderLeftColor: config.color,
        backgroundColor: `${config.color}10`
      }}
    >
      {/* Alert Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2">
          <span className="text-xl" title={config.title}>{config.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white">
                {config.title}
              </h4>
              <span
                className={`
                  text-xs px-2 py-0.5 rounded-full capitalize
                  ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                    alert.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                    alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-500/20 text-gray-300'}
                `}
              >
                {alert.severity}
              </span>
            </div>
            <p className="text-xs text-[var(--ff-text-muted)] mt-0.5">
              {timeSinceAlert} • {config.description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[var(--ff-text-muted)] hover:text-white p-1 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {!alert.acknowledged && onAcknowledge && (
            <button
              onClick={handleAcknowledge}
              className="text-[var(--ff-text-muted)] hover:text-white p-1 rounded transition-colors"
              title="Acknowledge"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Alert Message */}
      <div className="pl-7">
        <p className="text-xs text-[var(--ff-text-secondary)]">
          {alert.message}
        </p>
      </div>

      {/* Expanded Details */}
      {isExpanded && alert.relatedAnalysis && (
        <div className="mt-3 pl-7 pt-3 border-t border-[var(--ff-border)]">
          <div className="space-y-2">
            {alert.relatedAnalysis.speaker && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--ff-text-muted)]">Speaker:</span>
                <span className="text-xs text-white font-medium">
                  {alert.relatedAnalysis.speaker}
                </span>
              </div>
            )}

            {alert.relatedAnalysis.sentiment && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--ff-text-muted)]">Sentiment:</span>
                <span
                  className={`text-xs font-bold ${
                    alert.relatedAnalysis.sentiment.overall > 0.3 ? 'text-[#22c55e]' :
                    alert.relatedAnalysis.sentiment.overall < -0.3 ? 'text-[#ef4444]' :
                    'text-[#94a3b8]'
                  }`}
                >
                  {alert.relatedAnalysis.sentiment.overall > 0 ? '+' : ''}
                  {alert.relatedAnalysis.sentiment.overall.toFixed(2)}
                </span>
              </div>
            )}

            {alert.relatedAnalysis.text && (
              <div className="mt-2">
                <p className="text-xs text-[var(--ff-text-muted)] mb-1">Context:</p>
                <p className="text-xs text-[var(--ff-text-secondary)] italic bg-[var(--ff-bg-dark)] p-2 rounded">
                  "{alert.relatedAnalysis.text}"
                </p>
              </div>
            )}
          </div>

          {/* Alert Actions */}
          <div className="flex gap-2 mt-3">
            <button
              className="text-xs px-3 py-1 rounded bg-[var(--ff-purple-500)] text-white hover:bg-[var(--ff-purple-600)] transition-colors"
              onClick={() => {
                // Handle taking action on the alert
                console.log('Taking action on alert:', alert.id);
              }}
            >
              Take Action
            </button>
            <button
              className="text-xs px-3 py-1 rounded bg-[var(--ff-bg-dark)] text-[var(--ff-text-muted)] hover:text-white transition-colors"
              onClick={() => {
                // Handle viewing details
                console.log('Viewing alert details:', alert.id);
              }}
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Alert State Indicator */}
      {alert.acknowledged && (
        <div className="absolute top-2 right-2">
          <span className="text-xs text-[var(--ff-text-muted)] italic">Acknowledged</span>
        </div>
      )}

      {/* Severity Indicator Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg"
        style={{
          background: `linear-gradient(90deg, ${config.color} 0%, transparent 100%)`,
          opacity: alert.severity === 'critical' ? 1 :
                   alert.severity === 'high' ? 0.7 :
                   alert.severity === 'medium' ? 0.5 : 0.3
        }}
      />
    </div>
  );
}

// Export a notification toast version for popup alerts
export function SentimentAlertToast({
  alert,
  onClose,
  duration = 5000
}: {
  alert: SentimentAlertData;
  onClose: () => void;
  duration?: number;
}) {
  const [progress, setProgress] = useState(100);
  const config = ALERT_CONFIGS[alert.type];

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration * 100));
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  return (
    <div
      className="fixed top-4 right-4 z-50 max-w-sm animate-slide-in-right"
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      <div
        className="bg-[var(--ff-bg-layer)] rounded-lg shadow-2xl border border-[var(--ff-border)] overflow-hidden"
        style={{ borderColor: config.color }}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white mb-1">
                {config.title}
              </h4>
              <p className="text-xs text-[var(--ff-text-secondary)]">
                {alert.message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--ff-text-muted)] hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[var(--ff-bg-dark)]">
          <div
            className="h-full transition-all duration-100 ease-linear"
            style={{
              width: `${progress}%`,
              backgroundColor: config.color
            }}
          />
        </div>
      </div>
    </div>
  );
}