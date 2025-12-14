'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Chrome,
  Download,
  AlertCircle,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface ExtensionStatusProps {
  installed: boolean;
  version: string | null;
  onRefresh: () => void;
}

export default function ExtensionStatus({ installed, version, onRefresh }: ExtensionStatusProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [activeRecordings, setActiveRecordings] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(() => {
    setConnectionStatus('connecting');

    // Send ping to extension
    window.postMessage({ type: 'NEBULA_STATUS_CHECK' }, '*');

    // Listen for response
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'NEBULA_STATUS_RESPONSE') {
        setConnectionStatus('connected');
        setLastSync(new Date());
        if (event.data.activeRecordings !== undefined) {
          setActiveRecordings(event.data.activeRecordings);
        }
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);

    // Timeout after 3 seconds
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      setConnectionStatus(prev => prev === 'connecting' ? 'disconnected' : prev);
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (installed) {
      checkConnection();
      const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [installed, checkConnection]);

  const handleRefresh = useCallback(() => {
    setIsChecking(true);
    onRefresh();
    checkConnection();
    setTimeout(() => setIsChecking(false), 1000);
  }, [onRefresh, checkConnection]);

  const formatLastSync = useMemo(() => {
    if (!lastSync) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSync.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }, [lastSync]);

  const statusColor = useMemo(() => {
    if (!installed) return 'text-gray-500';
    const statusColors: Record<ConnectionStatus, string> = {
      connected: 'text-green-600',
      connecting: 'text-yellow-600',
      disconnected: 'text-red-600'
    };
    return statusColors[connectionStatus];
  }, [installed, connectionStatus]);

  const statusIcon = useMemo(() => {
    if (!installed) return <XCircle className="h-5 w-5" />;
    const statusIcons: Record<ConnectionStatus, JSX.Element> = {
      connected: <CheckCircle className="h-5 w-5" />,
      connecting: <RefreshCw className="h-5 w-5 animate-spin" />,
      disconnected: <AlertCircle className="h-5 w-5" />
    };
    return statusIcons[connectionStatus];
  }, [installed, connectionStatus]);

  const connectionIcon = useMemo(() => {
    const connectionIcons: Record<ConnectionStatus, JSX.Element> = {
      connected: <Wifi className="h-4 w-4" />,
      connecting: <Activity className="h-4 w-4 animate-pulse" />,
      disconnected: <WifiOff className="h-4 w-4" />
    };
    return connectionIcons[connectionStatus];
  }, [connectionStatus]);

  return (
    <div className="space-y-4">
      {/* Main Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Chrome className="h-8 w-8 text-gray-600" />
          <div>
            <h3 className="text-lg font-semibold">OpenMeet Chrome Extension</h3>
            <div className={cn("flex items-center gap-2 mt-1", statusColor)}>
              {statusIcon}
              <span className="text-sm font-medium">
                {!installed ? 'Not Installed' :
                 connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting...' :
                 'Disconnected'}
              </span>
              {version && (
                <Badge variant="secondary" className="text-xs">
                  v{version}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!installed ? (
            <Button size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Install Extension
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isChecking}
            >
              {isChecking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Detailed Status Grid */}
      {installed && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              connectionStatus === 'connected' ? "bg-green-100" :
              connectionStatus === 'connecting' ? "bg-yellow-100" :
              "bg-red-100"
            )}>
              {connectionIcon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Connection</p>
              <p className="text-sm font-medium capitalize">{connectionStatus}</p>
            </div>
          </div>

          {/* Last Sync */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100">
              <RefreshCw className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Sync</p>
              <p className="text-sm font-medium">{formatLastSync}</p>
            </div>
          </div>

          {/* Active Recordings */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              activeRecordings > 0 ? "bg-red-100" : "bg-gray-100"
            )}>
              <Activity className={cn(
                "h-4 w-4",
                activeRecordings > 0 ? "text-red-600 animate-pulse" : "text-gray-600"
              )} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Recordings</p>
              <p className="text-sm font-medium">{activeRecordings}</p>
            </div>
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {installed && connectionStatus === 'disconnected' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900">Extension Disconnected</p>
              <p className="text-yellow-700 mt-1">
                The extension is installed but not responding. Try refreshing the page or restarting your browser.
              </p>
            </div>
          </div>
        </div>
      )}

      {!installed && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Extension Required</p>
              <p className="text-blue-700 mt-1">
                Install the OpenMeet Chrome extension to enable botless recording directly from your browser.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}