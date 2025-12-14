'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface OnboardingStepProps {
  title: string;
  description: string;
  illustration?: ReactNode;
  children: ReactNode;
}

export function OnboardingStep({
  title,
  description,
  illustration,
  children,
}: OnboardingStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Illustration */}
      {illustration && (
        <div className="flex justify-center mb-8">
          <div className="w-32 h-32 flex items-center justify-center">
            {illustration}
          </div>
        </div>
      )}

      {/* Title and Description */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">{title}</h2>
        <p className="text-lg text-gray-400">{description}</p>
      </div>

      {/* Content */}
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onClick: () => void;
}

export function OptionCard({
  label,
  description,
  icon,
  selected,
  onClick,
}: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full p-6 rounded-xl border-2 transition-all duration-200 text-left
        ${
          selected
            ? 'border-[#7a5af8] bg-[#7a5af8]/10'
            : 'border-[#1e293b] bg-[#0a0a1a] hover:border-[#334155]'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#1e293b] flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <div className="font-semibold text-white mb-1">{label}</div>
          {description && (
            <div className="text-sm text-gray-400">{description}</div>
          )}
        </div>
        <div
          className={`
          flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
          ${selected ? 'border-[#7a5af8] bg-[#7a5af8]' : 'border-gray-600'}
        `}
        >
          {selected && (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

interface CheckboxCardProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxCard({
  label,
  description,
  icon,
  checked,
  onChange,
}: CheckboxCardProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        w-full p-6 rounded-xl border-2 transition-all duration-200 text-left
        ${
          checked
            ? 'border-[#7a5af8] bg-[#7a5af8]/10'
            : 'border-[#1e293b] bg-[#0a0a1a] hover:border-[#334155]'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#1e293b] flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <div className="font-semibold text-white mb-1">{label}</div>
          {description && (
            <div className="text-sm text-gray-400">{description}</div>
          )}
        </div>
        <div
          className={`
          flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center
          ${checked ? 'border-[#7a5af8] bg-[#7a5af8]' : 'border-gray-600'}
        `}
        >
          {checked && (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}
