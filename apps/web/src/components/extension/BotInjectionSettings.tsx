'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  Bot,
  UserCheck,
  Shield,
  Mic,
  Video,
  Presentation,
  Subtitles,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BotInjectionSettingsProps {
  settings: {
    botInjectionMode: 'auto' | 'ask' | 'never';
    autoRecordMeetings: boolean;
    recordAudio: boolean;
    recordVideo: boolean;
    captureSlides: boolean;
    enableLiveCaptions: boolean;
  };
  onChange: (settings: Partial<BotInjectionSettingsProps['settings']>) => void;
}

const BOT_MODES = [
  {
    value: 'auto' as const,
    label: 'Auto-join',
    description: 'Automatically join and record all detected meetings',
    Icon: Bot,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    value: 'ask' as const,
    label: 'Ask before joining',
    description: 'Request permission before joining each meeting',
    Icon: UserCheck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    value: 'never' as const,
    label: 'Never auto-join',
    description: 'Only record when manually triggered',
    Icon: Shield,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
] as const;

const RECORDING_OPTIONS = [
  {
    key: 'recordAudio' as const,
    label: 'Record Audio',
    description: 'Capture meeting audio for transcription',
    Icon: Mic,
  },
  {
    key: 'recordVideo' as const,
    label: 'Record Video',
    description: 'Save video recordings (increases storage usage)',
    Icon: Video,
  },
  {
    key: 'captureSlides' as const,
    label: 'Capture Slides',
    description: 'Automatically capture shared screens and presentations',
    Icon: Presentation,
  },
  {
    key: 'enableLiveCaptions' as const,
    label: 'Live Captions',
    description: 'Generate real-time captions during meetings',
    Icon: Subtitles,
  },
] as const;

export default function BotInjectionSettings({ settings, onChange }: BotInjectionSettingsProps) {

  return (
    <div className="space-y-6">
      {/* Bot Injection Mode */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Bot Injection Mode</h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  Choose how OpenMeet should handle meeting detection. Auto-join will start
                  recording immediately, while Ask mode will prompt you first.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <RadioGroup
          value={settings.botInjectionMode}
          onValueChange={(value: 'auto' | 'ask' | 'never') =>
            onChange({ botInjectionMode: value })
          }
        >
          {BOT_MODES.map((mode) => (
            <div key={mode.value} className="mb-3">
              <Label
                htmlFor={mode.value}
                className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <RadioGroupItem value={mode.value} id={mode.value} className="mt-1" />
                <div className={`p-2 rounded-md ${mode.bgColor}`}>
                  <mode.Icon className={`h-4 w-4 ${mode.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{mode.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mode.description}
                  </p>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Auto-Record Toggle */}
      <Card className="p-4 bg-accent/30">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label htmlFor="auto-record" className="text-sm font-medium">
              Automatic Recording
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Start recording immediately when joining meetings
            </p>
          </div>
          <Switch
            id="auto-record"
            checked={settings.autoRecordMeetings}
            onCheckedChange={(checked) => onChange({ autoRecordMeetings: checked })}
            disabled={settings.botInjectionMode === 'never'}
          />
        </div>
      </Card>

      {/* Recording Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold mb-3">Recording Options</h4>
        {RECORDING_OPTIONS.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-accent">
                <option.Icon className="h-4 w-4" />
              </div>
              <div>
                <Label
                  htmlFor={option.key}
                  className="text-sm font-medium cursor-pointer"
                >
                  {option.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
            </div>
            <Switch
              id={option.key}
              checked={settings[option.key as keyof typeof settings] as boolean}
              onCheckedChange={(checked) =>
                onChange({ [option.key]: checked } as any)
              }
            />
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
        <div className="flex gap-3">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Recording Tips
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Audio recording is required for transcription services</li>
              <li>• Video recordings can significantly increase storage usage</li>
              <li>• Live captions require a stable internet connection</li>
              <li>• Slide capture works best with screen sharing enabled</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}