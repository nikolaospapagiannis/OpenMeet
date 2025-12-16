'use client';

import React, { useEffect, useRef, createContext, useContext, useState } from 'react';
import { X } from 'lucide-react';

// Dialog Context for controlled state
interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  onClose: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
}

// Support both onClose and onOpenChange for flexibility
export interface DialogProps {
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  defaultOpen?: boolean;
}

export function Dialog({
  open: controlledOpen,
  onClose,
  onOpenChange,
  children,
  className = '',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  defaultOpen = false,
}: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Use controlled or uncontrolled state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleClose = () => {
    if (!isControlled) {
      setInternalOpen(false);
    }
    onClose?.();
    onOpenChange?.(false);
  };

  const setOpen = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
    if (!newOpen) {
      onClose?.();
    }
  };

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, closeOnEscape]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      handleClose();
    }
  };

  const contextValue: DialogContextValue = {
    open,
    setOpen,
    onClose: handleClose,
  };

  if (!open) return null;

  return (
    <DialogContext.Provider value={contextValue}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleBackdropClick}
      >
        <div
          ref={dialogRef}
          className={`relative bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 ${className}`}
          role="dialog"
          aria-modal="true"
        >
          {showCloseButton && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all z-10"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );
}

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DialogTrigger({ children, asChild = false }: DialogTriggerProps) {
  const { setOpen } = useDialogContext();

  const handleClick = () => setOpen(true);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    });
  }

  return (
    <button onClick={handleClick} type="button">
      {children}
    </button>
  );
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogHeader({ children, className = '' }: DialogHeaderProps) {
  return (
    <div className={`px-6 pt-6 pb-4 border-b border-slate-700/50 ${className}`}>
      {children}
    </div>
  );
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  return (
    <h2 className={`text-2xl font-bold text-white ${className}`}>
      {children}
    </h2>
  );
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogDescription({ children, className = '' }: DialogDescriptionProps) {
  return (
    <p className={`text-slate-400 mt-2 ${className}`}>
      {children}
    </p>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return (
    <div className={`px-6 py-4 border-t border-slate-700/50 flex items-center justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
}

interface DialogCloseProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function DialogClose({ children, asChild = false }: DialogCloseProps) {
  const { onClose } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: onClose,
    });
  }

  return (
    <button onClick={onClose} type="button">
      {children}
    </button>
  );
}
