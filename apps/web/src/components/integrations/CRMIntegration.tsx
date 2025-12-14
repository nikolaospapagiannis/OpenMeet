/**
 * CRMIntegration Component
 * Specialized settings for CRM integrations (Salesforce, HubSpot)
 */

'use client';

import { useState } from 'react';
import {
  Database,
  CheckCircle,
  Users,
  TrendingUp,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { OAuthConnectButton } from './OAuthConnectButton';
import { useIntegrations } from '@/hooks/useIntegrations';

export function CRMIntegration() {
  const { isConnected, getIntegrationByType } = useIntegrations();

  const salesforceConnected = isConnected('salesforce');
  const hubspotConnected = isConnected('hubspot');

  const salesforceIntegration = getIntegrationByType('salesforce');
  const hubspotIntegration = getIntegrationByType('hubspot');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">CRM Integration</h2>
        <p className="text-slate-400">
          Sync meeting insights with your CRM to enrich customer data and track
          sales conversations
        </p>
      </div>

      {/* Salesforce */}
      <CardGlass>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-800/60 rounded-lg border border-white/10">
                <Database className="h-6 w-6 text-slate-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Salesforce
                </h3>
                {salesforceConnected ? (
                  <div className="flex items-center mt-1">
                    <CheckCircle className="h-3 w-3 text-green-400 mr-1" />
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Not connected</p>
                )}
              </div>
            </div>

            {salesforceConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  (window.location.href = '/integrations/salesforce/settings')
                }
                className="border-white/10 text-slate-300 hover:bg-slate-800/50"
              >
                Configure
              </Button>
            ) : (
              <OAuthConnectButton
                type="salesforce"
                label="Connect"
                variant="default"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white border-0"
              />
            )}
          </div>

          {salesforceConnected && salesforceIntegration?.metadata && (
            <div className="mt-4 p-3 bg-slate-800/40 rounded-lg border border-white/5">
              <p className="text-sm text-slate-300">
                {salesforceIntegration.metadata.organizationName ||
                  salesforceIntegration.metadata.email}
              </p>
              {salesforceIntegration.lastSyncAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Last synced:{' '}
                  {new Date(salesforceIntegration.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-slate-400">Features:</p>
            <div className="space-y-1">
              {[
                'Contact sync',
                'Deal tracking',
                'Activity logging',
                'Custom fields mapping',
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

      {/* HubSpot */}
      <CardGlass>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-800/60 rounded-lg border border-white/10">
                <Database className="h-6 w-6 text-slate-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">HubSpot</h3>
                {hubspotConnected ? (
                  <div className="flex items-center mt-1">
                    <CheckCircle className="h-3 w-3 text-green-400 mr-1" />
                    <span className="text-xs text-green-400">Connected</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Not connected</p>
                )}
              </div>
            </div>

            {hubspotConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  (window.location.href = '/integrations/hubspot/settings')
                }
                className="border-white/10 text-slate-300 hover:bg-slate-800/50"
              >
                Configure
              </Button>
            ) : (
              <OAuthConnectButton
                type="hubspot"
                label="Connect"
                variant="default"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white border-0"
              />
            )}
          </div>

          {hubspotConnected && hubspotIntegration?.metadata && (
            <div className="mt-4 p-3 bg-slate-800/40 rounded-lg border border-white/5">
              <p className="text-sm text-slate-300">
                {hubspotIntegration.metadata.hubName ||
                  hubspotIntegration.metadata.email}
              </p>
              {hubspotIntegration.lastSyncAt && (
                <p className="text-xs text-slate-500 mt-1">
                  Last synced:{' '}
                  {new Date(hubspotIntegration.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-slate-400">Features:</p>
            <div className="space-y-1">
              {[
                'Contact enrichment',
                'Deal association',
                'Timeline events',
                'Custom properties',
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

      {/* CRM Sync Features */}
      {(salesforceConnected || hubspotConnected) && (
        <CardGlass>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              CRM Sync Features
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-slate-800/40 rounded-lg border border-white/5">
                <Users className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    Contact Sync
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Automatically create or update contacts from meeting
                    attendees
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-slate-800/40 rounded-lg border border-white/5">
                <TrendingUp className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    Deal Tracking
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Associate meetings with deals and track sales conversations
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-slate-800/40 rounded-lg border border-white/5">
                <FileText className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    Activity Logging
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Create activity records with meeting summaries and action
                    items
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-slate-800/40 rounded-lg border border-white/5">
                <RefreshCw className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    Automatic Sync
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Keep your CRM up-to-date with real-time or scheduled sync
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardGlass>
      )}

      {/* Field Mapping */}
      {(salesforceConnected || hubspotConnected) && (
        <CardGlass>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Field Mapping
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Map meeting data to your CRM fields
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-white/5">
                <span className="text-sm text-slate-300">Meeting Title</span>
                <span className="text-sm text-slate-400">→ Subject</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-white/5">
                <span className="text-sm text-slate-300">
                  Meeting Summary
                </span>
                <span className="text-sm text-slate-400">→ Description</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-white/5">
                <span className="text-sm text-slate-300">Action Items</span>
                <span className="text-sm text-slate-400">→ Tasks</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg border border-white/5">
                <span className="text-sm text-slate-300">Attendees</span>
                <span className="text-sm text-slate-400">
                  → Contacts/Leads
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full border-white/10 text-slate-300 hover:bg-slate-800/50"
            >
              Customize Field Mapping
            </Button>
          </div>
        </CardGlass>
      )}

      {/* Info Box */}
      {!salesforceConnected && !hubspotConnected && (
        <CardGlass className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/20">
          <div className="p-6">
            <h3 className="text-white font-semibold mb-2">
              Why connect your CRM?
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              Integrating with your CRM automatically enriches customer records
              with meeting insights, saving hours of manual data entry.
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-teal-400 mr-2 mt-0.5 flex-shrink-0" />
                <span>Automatic contact and deal updates</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-teal-400 mr-2 mt-0.5 flex-shrink-0" />
                <span>Complete activity history</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-teal-400 mr-2 mt-0.5 flex-shrink-0" />
                <span>Better sales intelligence</span>
              </li>
            </ul>
          </div>
        </CardGlass>
      )}
    </div>
  );
}
