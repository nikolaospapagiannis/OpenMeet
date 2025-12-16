'use client';

import * as React from 'react';
import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('Popover components must be used within a Popover');
  }
  return context;
}

interface PopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function Popover({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export function PopoverTrigger({ children, asChild = false, className }: PopoverTriggerProps) {
  const { open, setOpen, triggerRef } = usePopoverContext();

  const handleClick = () => setOpen(!open);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void; ref?: React.Ref<HTMLButtonElement> }>, {
      onClick: handleClick,
      ref: triggerRef,
    });
  }

  return (
    <button
      ref={triggerRef}
      onClick={handleClick}
      type="button"
      className={className}
      aria-expanded={open}
      aria-haspopup="dialog"
    >
      {children}
    </button>
  );
}

interface PopoverContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}

export function PopoverContent({
  children,
  className,
  align = 'center',
  side = 'bottom',
  sideOffset = 4,
}: PopoverContentProps) {
  const { open, setOpen, triggerRef } = usePopoverContext();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, setOpen, triggerRef]);

  if (!open) return null;

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  const sideClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  return (
    <div
      ref={contentRef}
      role="dialog"
      className={cn(
        'absolute z-50 min-w-[8rem] rounded-md border border-slate-700/50 bg-slate-900 p-4 shadow-lg animate-in fade-in-0 zoom-in-95',
        alignClasses[align],
        sideClasses[side],
        className
      )}
      style={{ marginTop: side === 'bottom' ? sideOffset : undefined }}
    >
      {children}
    </div>
  );
}

export function PopoverClose({ children, className }: { children: React.ReactNode; className?: string }) {
  const { setOpen } = usePopoverContext();

  return (
    <button onClick={() => setOpen(false)} className={className} type="button">
      {children}
    </button>
  );
}
