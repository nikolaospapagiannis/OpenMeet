/**
 * CalendarIntegration Component
 * Specialized settings for calendar integrations
 */

'use client';

import { useState } from 'react';
import { Calendar, Clock, Users, CheckCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { OAuthConnectButton } from './OAuthConnectButton';
import { useIntegrations } from '@/hooks/useIntegrations';

export function CalendarIntegration() {
  const { isConnected, getIntegrationByType } = useIntegrations();

  const googleCalendarConnected = isConnected('meet');
  const outlookConnected = isConnected('teams');

  const googleIntegration = getIntegrationByType('meet');
  const outlookIntegration = getIntegrationByType('teams');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Calendar Integration
        </h2>
        <p className="text-slate-400">
          Connect your calendars to automatically detect and join meetings
        </p>
      </div>

      {/* Google Calendar */}
      <CardGlass>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-800/60 rounded-lg border border-white/10">
                <Calendar className="h-6 w-6 text-slate-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Google Calendar
                </h3>
                {googleCalendarConnected ? (
                  <div className="flex items-center mt-1">
                    <CheckCircle className="h-3 w-3 text-green-400 mr-1" />
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Not connected</p>
                )}
              </div>
            </div>

            {googleCalendarConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  (window.location.href = '/integrations/meet/settings')
                }
                className="border-white/10 text-slate-300 hover:bg-slate-800/50"
              >
                Configure
              </Button>
            ) : (
              <OAuthConnectButton
                type="meet"
                label="Connect"
                variant="default"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white border-0"
              />
            )}
          </div>

          {googleCalendarConnected && googleIntegration?.metadata && (
            <div className="mt-4 p-3 bg-slate-800/40 rounded-lg border border-white/5">
              <p className="text-sm text-slate-300">
                {googleIntegration.metadata.email}
              </p>
              {googleIntegration.lastSyncAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Last synced:{' '}
                  {new Date(googleIntegration.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-slate-400">Features:</p>
            <div className="space-y-1">
              {[
                'Auto-detect meetings',
                'Meeting reminders',
                'Attendee sync',
                'Recurring events support',
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center text-xs text-slate-400"
                >
                  <CheckCircle className="h-3 w-3 text-teal-400 mr-2 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardGlass>

      {/* Microsoft Outlook */}
      <CardGlass>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-800/60 rounded-lg border border-white/10">
                <Calendar className="h-6 w-6 text-slate-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Outlook Calendar
                </h3>
                {outlookConnected ? (
                  <div className="flex items-center mt-1">
                    <CheckCircle className="h-3 w-3 text-green-400 mr-1" />
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Not connected</p>
                )}
              </div>
            </div>

            {outlookConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  (window.location.href = '/integrations/teams/settings')
                }
                className="border-white/10 text-slate-300 hover:bg-slate-800/50"
              >
                Configure
              </Button>
            ) : (
              <OAuthConnectButton
                type="teams"
                label="Connect"
                variant="default"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white border-0"
              />
            )}
          </div>

          {outlookConnected && outlookIntegration?.metadata && (
            <div className="mt-4 p-3 bg-slate-800/40 rounded-lg border border-white/5">
              <p className="text-sm text-slate-300">
                {outlookIntegration.metadata.email}
              </p>
              {outlookIntegration.lastSyncAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Last synced:{' '}
                  {new Date(outlookIntegration.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-slate-400">Features:</p>
            <div className="space-y-1">
              {[
                'Exchange sync',
                'Meeting rooms',
                'Attendee availability',
                'Event updates',
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center text-xs text-slate-400"
                >
                  <CheckCircle className="h-3 w-3 text-teal-400 mr-2 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardGlass>

      {/* Auto-join Settings */}
      {(googleCalendarConnected || outlookConnected) && (
        <CardGlass>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Auto-join Settings
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-slate-800/40 rounded-lg border border-white/5">
                <Clock className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Join before meeting starts
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Bot joins 2 minutes before scheduled time
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-slate-800/40 rounded-lg border border-white/5">
                <Users className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Sync attendees
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Automatically import attendee information from calendar
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-slate-800/40 rounded-lg border border-white/5">
                <Calendar className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Recurring meetings
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Support for recurring meeting series
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardGlass>
      )}

      {/* Info Box */}
      {!googleCalendarConnected && !outlookConnected && (
        <CardGlass className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/20">
          <div className="p-6">
            <h3 className="text-white font-semibold mb-2">
              Why connect your calendar?
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              Connecting your calendar allows OpenMeet to automatically detect
              upcoming meetings and join them for recording and transcription.
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-teal-400 mr-2 mt-0.5 flex-shrink-0" />
                <span>Never miss a meeting</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-teal-400 mr-2 mt-0.5 flex-shrink-0" />
                <span>Automatic meeting detection</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-teal-400 mr-2 mt-0.5 flex-shrink-0" />
                <span>Seamless integration with your workflow</span>
              </li>
            </ul>
          </div>
        </CardGlass>
      )}
    </div>
  );
}
