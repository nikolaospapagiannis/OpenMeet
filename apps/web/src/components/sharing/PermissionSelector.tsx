'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, MessageCircle, Edit } from 'lucide-react';

export type Permission = 'view' | 'comment' | 'edit';

interface PermissionSelectorProps {
  value: Permission;
  onChange: (value: Permission) => void;
}

const permissions = [
  {
    value: 'view' as const,
    label: 'View Only',
    description: 'Can view meeting details and transcript',
    icon: Eye,
  },
  {
    value: 'comment' as const,
    label: 'Can Comment',
    description: 'Can view and add comments',
    icon: MessageCircle,
  },
  {
    value: 'edit' as const,
    label: 'Full Access',
    description: 'Can view, comment, and edit',
    icon: Edit,
  },
];

export function PermissionSelector({ value, onChange }: PermissionSelectorProps) {
  const selectedPermission = permissions.find((p) => p.value === value);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-slate-800/50 border-slate-700">
          <SelectValue>
            {selectedPermission && (
              <div className="flex items-center gap-2">
                <selectedPermission.icon className="w-4 h-4" />
                <span>{selectedPermission.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700">
          {permissions.map((permission) => (
            <SelectItem
              key={permission.value}
              value={permission.value}
              className="cursor-pointer hover:bg-slate-700/50"
            >
              <div className="flex flex-col gap-1 py-1">
                <div className="flex items-center gap-2">
                  <permission.icon className="w-4 h-4" />
                  <span className="font-medium">{permission.label}</span>
                </div>
                <p className="text-xs text-slate-400 ml-6">
                  {permission.description}
                </p>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
