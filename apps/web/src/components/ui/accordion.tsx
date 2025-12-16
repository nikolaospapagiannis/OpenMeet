'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionContextValue {
  openItems: string[];
  toggleItem: (value: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
}

interface AccordionProps {
  children: React.ReactNode;
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  className?: string;
  collapsible?: boolean;
}

export function Accordion({
  children,
  type = 'single',
  defaultValue,
  value: controlledValue,
  onValueChange,
  className = '',
  collapsible = true,
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string[]>(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  });

  const isControlled = controlledValue !== undefined;
  const openItems = isControlled
    ? Array.isArray(controlledValue) ? controlledValue : [controlledValue]
    : internalValue;

  const toggleItem = (itemValue: string) => {
    let newValue: string[];

    if (type === 'single') {
      if (openItems.includes(itemValue)) {
        newValue = collapsible ? [] : openItems;
      } else {
        newValue = [itemValue];
      }
    } else {
      if (openItems.includes(itemValue)) {
        newValue = openItems.filter((v) => v !== itemValue);
      } else {
        newValue = [...openItems, itemValue];
      }
    }

    if (!isControlled) {
      setInternalValue(newValue);
    }

    if (onValueChange) {
      onValueChange(type === 'single' ? (newValue[0] || '') : newValue);
    }
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={['space-y-1', className].filter(Boolean).join(' ')}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemContextValue {
  value: string;
  isOpen: boolean;
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

function useAccordionItemContext() {
  const context = React.useContext(AccordionItemContext);
  if (!context) {
    throw new Error('AccordionItem components must be used within an AccordionItem');
  }
  return context;
}

interface AccordionItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

export function AccordionItem({ children, value, className = '', disabled = false }: AccordionItemProps) {
  const { openItems } = useAccordionContext();
  const isOpen = openItems.includes(value);

  const itemClasses = [
    'border border-slate-700/50 rounded-lg bg-slate-800/30',
    disabled ? 'opacity-50 pointer-events-none' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <AccordionItemContext.Provider value={{ value, isOpen }}>
      <div
        className={itemClasses}
        data-state={isOpen ? 'open' : 'closed'}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionTrigger({ children, className = '' }: AccordionTriggerProps) {
  const { toggleItem } = useAccordionContext();
  const { value, isOpen } = useAccordionItemContext();

  const triggerClasses = [
    'flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-white hover:bg-slate-700/30 transition-colors rounded-t-lg',
    isOpen ? '' : 'rounded-b-lg',
    className,
  ].filter(Boolean).join(' ');

  const iconClasses = [
    'h-4 w-4 text-slate-400 transition-transform duration-200',
    isOpen ? 'rotate-180' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={() => toggleItem(value)}
      className={triggerClasses}
      aria-expanded={isOpen}
    >
      {children}
      <ChevronDown className={iconClasses} />
    </button>
  );
}

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionContent({ children, className = '' }: AccordionContentProps) {
  const { isOpen } = useAccordionItemContext();

  if (!isOpen) return null;

  const contentClasses = [
    'overflow-hidden border-t border-slate-700/50',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={contentClasses}
      data-state={isOpen ? 'open' : 'closed'}
    >
      <div className="px-4 py-3 text-sm text-slate-300">{children}</div>
    </div>
  );
}
