'use client';

import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface ToastContext {
  toast: (props: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

// Global toast store
let toasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

function addToast(props: Omit<Toast, 'id'>): string {
  const id = Math.random().toString(36).substr(2, 9);
  const newToast: Toast = {
    ...props,
    id,
    duration: props.duration || 5000,
  };

  toasts = [...toasts, newToast];
  listeners.forEach((listener) => listener(toasts));

  // Auto-remove after duration
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, newToast.duration);
  }

  return id;
}

function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((listener) => listener(toasts));
}

export function useToast(): ToastContext {
  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    addToast(props);
  }, []);

  const dismiss = useCallback((id: string) => {
    dismissToast(id);
  }, []);

  return { toast, dismiss };
}
