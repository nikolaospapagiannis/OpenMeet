'use client';

import React, { useState } from 'react';
import { Shield, CheckCircle, AlertCircle, Loader, Play, User, Key, Globe, Clock, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';

interface TestStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  message?: string;
  details?: any;
  duration?: number;
}

interface TestResult {
  success: boolean;
  provider: string;
  protocol: 'SAML' | 'OIDC';
  timestamp: Date;
  steps: TestStep[];
  userInfo?: {
    email?: string;
    name?: string;
    id?: string;
    groups?: string[];
    attributes?: Record<string, any>;
  };
  error?: string;
}

interface TestConnectionProps {
  provider: string;
  protocol: 'SAML' | 'OIDC';
  onTest: () => Promise<TestResult>;
  onInitiateFlow?: () => void;
  isConfigured: boolean;
}

export const TestConnection: React.FC<TestConnectionProps> = ({
  provider,
  protocol,
  onTest,
  onInitiateFlow,
  isConfigured
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');

  const defaultSteps: TestStep[] = [
    { id: 'config', name: 'Validate Configuration', status: 'pending' },
    { id: 'metadata', name: 'Fetch Metadata/Discovery', status: 'pending' },
    { id: 'connection', name: 'Test IdP Connection', status: 'pending' },
    { id: 'auth', name: 'Initiate Authentication', status: 'pending' },
    { id: 'response', name: 'Process Response', status: 'pending' },
    { id: 'attributes', name: 'Map User Attributes', status: 'pending' },
    { id: 'provision', name: 'Test Provisioning', status: 'pending' }
  ];

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setCurrentStep('config');

    // Simulate step-by-step testing with updates
    const steps = [...defaultSteps];

    try {
      // Simulate progress through steps
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i].id);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing
      }

      const result = await onTest();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        provider,
        protocol,
        timestamp: new Date(),
        steps: steps.map((s, idx) => ({
          ...s,
          status: idx === 0 ? 'failed' : 'skipped',
          message: idx === 0 ? (error as Error).message : undefined
        })),
        error: (error as Error).message
      });
    } finally {
      setIsTesting(false);
      setCurrentStep('');
    }
  };

  const getStepIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'skipped':
        return <div className="w-4 h-4 rounded-full border-2 border-slate-600" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-slate-500" />;
    }
  };

  const getStepColor = (status: TestStep['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'running':
        return 'text-blue-400';
      case 'skipped':
        return 'text-slate-600';
      default:
        return 'text-slate-500';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      <CardGlass variant="default" hover>
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-semibold text-white">SSO Connection Test</h2>
          <Badge variant="outline" className="ml-2">
            {protocol}
          </Badge>
          <Badge variant="outline">
            {provider}
          </Badge>
        </div>

        {!isConfigured && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300 mb-1">
                  Configuration Required
                </p>
                <p className="text-xs text-slate-400">
                  Please complete your SSO configuration before running the test.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Test Actions */}
        <div className="flex gap-3 mb-6">
          <Button
            variant="gradient-primary"
            size="default"
            onClick={handleTest}
            disabled={!isConfigured || isTesting}
          >
            {isTesting ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </>
            )}
          </Button>

          {onInitiateFlow && (
            <Button
              variant="ghost-glass"
              size="default"
              onClick={onInitiateFlow}
              disabled={!isConfigured || isTesting}
            >
              <User className="w-4 h-4 mr-2" />
              Test Login Flow
            </Button>
          )}
        </div>

        {/* Test Progress */}
        {isTesting && (
          <div className="space-y-3 mb-6">
            <div className="text-sm font-medium text-slate-300 mb-3">Test Progress</div>
            {defaultSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  currentStep === step.id
                    ? 'bg-blue-500/10 border border-blue-500/30'
                    : 'bg-slate-800/30 border border-white/5'
                }`}
              >
                <div className="flex-shrink-0">
                  {currentStep === step.id ? (
                    <Loader className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : index < defaultSteps.findIndex(s => s.id === currentStep) ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-500" />
                  )}
                </div>
                <span className={`text-sm ${
                  currentStep === step.id ? 'text-white' :
                  index < defaultSteps.findIndex(s => s.id === currentStep) ? 'text-green-400' :
                  'text-slate-500'
                }`}>
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Test Result */}
        {testResult && !isTesting && (
          <div className="space-y-4">
            {/* Overall Result */}
            <div className={`p-4 rounded-xl border ${
              testResult.success
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`text-sm font-semibold ${
                    testResult.success ? 'text-green-300' : 'text-red-300'
                  } mb-1`}>
                    {testResult.success ? 'Connection Test Passed' : 'Connection Test Failed'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {testResult.success
                      ? `Successfully validated ${protocol} configuration with ${provider}.`
                      : testResult.error || 'The connection test failed. Please check your configuration.'}
                  </p>
                </div>
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>
            </div>

            {/* Detailed Steps */}
            {showDetails && testResult.steps && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-300 mb-2">Test Steps</div>
                {testResult.steps.map((step) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-white/5"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getStepIcon(step.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${getStepColor(step.status)}`}>
                          {step.name}
                        </span>
                        {step.duration && (
                          <span className="text-xs text-slate-500">
                            ({formatDuration(step.duration)})
                          </span>
                        )}
                      </div>
                      {step.message && (
                        <p className="text-xs text-slate-400 mt-1">{step.message}</p>
                      )}
                      {step.details && (
                        <pre className="text-xs text-slate-500 mt-2 p-2 rounded bg-slate-900/50 overflow-x-auto">
                          {JSON.stringify(step.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* User Info */}
            {showDetails && testResult.userInfo && (
              <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">
                  Retrieved User Information
                </h3>
                <div className="space-y-2">
                  {testResult.userInfo.email && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-slate-300">{testResult.userInfo.email}</span>
                    </div>
                  )}
                  {testResult.userInfo.name && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Name:</span>
                      <span className="text-slate-300">{testResult.userInfo.name}</span>
                    </div>
                  )}
                  {testResult.userInfo.id && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">User ID:</span>
                      <span className="text-slate-300 font-mono">{testResult.userInfo.id}</span>
                    </div>
                  )}
                  {testResult.userInfo.groups && testResult.userInfo.groups.length > 0 && (
                    <div className="flex items-start gap-2 text-xs">
                      <span className="text-slate-400">Groups:</span>
                      <div className="flex flex-wrap gap-1">
                        {testResult.userInfo.groups.map((group, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {testResult.userInfo.attributes && (
                    <details className="mt-3">
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-white transition-colors">
                        All Attributes
                      </summary>
                      <pre className="mt-2 text-xs text-slate-500 p-2 rounded bg-slate-900/50 overflow-x-auto">
                        {JSON.stringify(testResult.userInfo.attributes, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>Tested at {new Date(testResult.timestamp).toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardGlass>

      {/* Quick Actions */}
      {testResult?.success && (
        <CardGlass variant="default" hover>
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight className="w-5 h-5 text-teal-400" />
            <h3 className="text-lg font-semibold text-white">Next Steps</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 flex-shrink-0">
                <Globe className="w-3 h-3 text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Verify Domains</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add and verify your organization's email domains
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 flex-shrink-0">
                <User className="w-3 h-3 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Configure Provisioning</p>
                <p className="text-xs text-slate-400 mt-1">
                  Set up SCIM for automatic user management
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 flex-shrink-0">
                <Key className="w-3 h-3 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Enable SSO</p>
                <p className="text-xs text-slate-400 mt-1">
                  Activate SSO for your organization
                </p>
              </div>
            </div>
          </div>
        </CardGlass>
      )}
    </div>
  );
};