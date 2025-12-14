'use client';

import React, { useState } from 'react';

interface TestWorkflowProps {
  workflowData: {
    nodes: any[];
    edges: any[];
    name: string;
  };
  onClose: () => void;
}

interface TestStep {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  error?: string;
  logs?: string[];
}

export function TestWorkflow({ workflowData, onClose }: TestWorkflowProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [testMode, setTestMode] = useState<'full' | 'dry-run'>('dry-run');
  const [testData, setTestData] = useState({
    meetingTitle: 'Test Meeting - Product Roadmap Discussion',
    participants: ['john@example.com', 'jane@example.com', 'team@example.com'],
    duration: 45,
    transcript: 'This is a test transcript with action items...',
    keywords: ['roadmap', 'Q4', 'action item', 'deadline'],
    sentiment: 0.75
  });
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);

  // Generate test steps from workflow nodes
  const generateTestSteps = (): TestStep[] => {
    return workflowData.nodes.map(node => ({
      nodeId: node.id,
      nodeName: node.data.label,
      nodeType: node.type,
      status: 'pending'
    }));
  };

  // Simulate node execution
  const executeNode = async (step: TestStep): Promise<TestStep> => {
    const startTime = new Date();

    // Add log entry
    addLog(`Executing ${step.nodeType}: ${step.nodeName}`);

    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    // Simulate different outcomes based on node type
    if (step.nodeType === 'trigger') {
      // Triggers always succeed in test mode
      addLog(`✅ Trigger "${step.nodeName}" activated successfully`);
      return {
        ...step,
        status: 'success',
        startTime,
        endTime,
        duration,
        result: {
          triggered: true,
          payload: testData
        },
        logs: [`Trigger conditions met`, `Payload size: ${JSON.stringify(testData).length} bytes`]
      };
    }

    if (step.nodeType === 'condition') {
      // Simulate condition evaluation
      const passed = Math.random() > 0.3; // 70% chance of passing
      addLog(`${passed ? '✅' : '⚠️'} Condition "${step.nodeName}" evaluated to ${passed}`);
      return {
        ...step,
        status: passed ? 'success' : 'skipped',
        startTime,
        endTime,
        duration,
        result: {
          evaluated: true,
          passed,
          reason: passed ? 'Condition met' : 'Condition not met'
        },
        logs: [`Evaluated condition`, `Result: ${passed ? 'TRUE' : 'FALSE'}`]
      };
    }

    if (step.nodeType === 'action') {
      // Simulate action execution
      if (testMode === 'dry-run') {
        addLog(`🔵 Action "${step.nodeName}" simulated (dry-run mode)`);
        return {
          ...step,
          status: 'success',
          startTime,
          endTime,
          duration,
          result: {
            executed: false,
            dryRun: true,
            wouldExecute: 'Action would be executed in full mode'
          },
          logs: [`Dry-run mode: Action simulated`, `No external calls made`]
        };
      } else {
        // Full execution (still simulated for demo)
        const success = Math.random() > 0.1; // 90% success rate
        if (success) {
          addLog(`✅ Action "${step.nodeName}" executed successfully`);
          return {
            ...step,
            status: 'success',
            startTime,
            endTime,
            duration,
            result: {
              executed: true,
              response: { status: 200, message: 'Action completed' }
            },
            logs: [`Action executed`, `External service called`, `Response received`]
          };
        } else {
          addLog(`❌ Action "${step.nodeName}" failed`);
          return {
            ...step,
            status: 'failed',
            startTime,
            endTime,
            duration,
            error: 'Simulated error: Service temporarily unavailable',
            logs: [`Action attempted`, `Error occurred`]
          };
        }
      }
    }

    return step;
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runTest = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    setExecutionLogs([]);
    addLog(`Starting workflow test in ${testMode} mode...`);

    const steps = generateTestSteps();
    setTestSteps(steps);

    let hasFailure = false;

    for (const step of steps) {
      setCurrentStep(step.nodeId);

      // Update step status to running
      setTestSteps(prev => prev.map(s =>
        s.nodeId === step.nodeId ? { ...s, status: 'running' } : s
      ));

      // Execute the step
      const result = await executeNode(step);

      // Update step with result
      setTestSteps(prev => prev.map(s =>
        s.nodeId === step.nodeId ? result : s
      ));

      if (result.status === 'failed') {
        hasFailure = true;
        break; // Stop on failure
      }

      // If condition failed, skip dependent actions
      if (result.status === 'skipped' && step.nodeType === 'condition') {
        // Find dependent nodes and mark them as skipped
        const dependentEdges = workflowData.edges.filter(e => e.source === step.nodeId);
        const dependentNodeIds = dependentEdges.map(e => e.target);

        setTestSteps(prev => prev.map(s =>
          dependentNodeIds.includes(s.nodeId) ? { ...s, status: 'skipped' } : s
        ));

        addLog(`Skipping dependent actions due to condition failure`);
      }
    }

    setCurrentStep(null);
    setOverallStatus(hasFailure ? 'failed' : 'success');
    setIsRunning(false);

    addLog(`Test completed: ${hasFailure ? 'FAILED' : 'SUCCESS'}`);
  };

  const getStepIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '❓';
    }
  };

  const getStepColor = (status: TestStep['status']) => {
    switch (status) {
      case 'pending': return 'text-[var(--ff-text-muted)]';
      case 'running': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'skipped': return 'text-yellow-400';
      default: return 'text-[var(--ff-text-secondary)]';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--ff-bg-layer)] rounded-lg w-full max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[var(--ff-border)]">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="heading-m text-white">Test Workflow</h2>
              <p className="text-sm text-[var(--ff-text-secondary)] mt-1">
                Testing: {workflowData.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--ff-text-muted)] hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Test Configuration */}
          <div className="w-1/3 bg-[var(--ff-bg-dark)] p-6 overflow-y-auto border-r border-[var(--ff-border)]">
            <h3 className="label-l text-white mb-4">Test Configuration</h3>

            {/* Test Mode */}
            <div className="mb-6">
              <label className="label-m text-[var(--ff-text-secondary)] block mb-2">
                Test Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="dry-run"
                    checked={testMode === 'dry-run'}
                    onChange={(e) => setTestMode(e.target.value as 'dry-run' | 'full')}
                    disabled={isRunning}
                    className="mr-2"
                  />
                  <span className="text-white">Dry Run</span>
                  <span className="text-xs text-[var(--ff-text-muted)] ml-2">(No external calls)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="full"
                    checked={testMode === 'full'}
                    onChange={(e) => setTestMode(e.target.value as 'dry-run' | 'full')}
                    disabled={isRunning}
                    className="mr-2"
                  />
                  <span className="text-white">Full Execution</span>
                  <span className="text-xs text-[var(--ff-text-muted)] ml-2">(Real actions)</span>
                </label>
              </div>
            </div>

            {/* Test Data */}
            <div className="space-y-4">
              <h4 className="label-m text-[var(--ff-text-secondary)]">Test Data</h4>

              <div>
                <label className="text-xs text-[var(--ff-text-muted)] block mb-1">
                  Meeting Title
                </label>
                <input
                  type="text"
                  value={testData.meetingTitle}
                  onChange={(e) => setTestData({ ...testData, meetingTitle: e.target.value })}
                  disabled={isRunning}
                  className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-md text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--ff-text-muted)] block mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={testData.duration}
                  onChange={(e) => setTestData({ ...testData, duration: parseInt(e.target.value) })}
                  disabled={isRunning}
                  className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-md text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--ff-text-muted)] block mb-1">
                  Keywords
                </label>
                <input
                  type="text"
                  value={testData.keywords.join(', ')}
                  onChange={(e) => setTestData({ ...testData, keywords: e.target.value.split(', ') })}
                  disabled={isRunning}
                  className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-md text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--ff-text-muted)] block mb-1">
                  Sentiment Score (0-1)
                </label>
                <input
                  type="number"
                  value={testData.sentiment}
                  onChange={(e) => setTestData({ ...testData, sentiment: parseFloat(e.target.value) })}
                  disabled={isRunning}
                  min="0"
                  max="1"
                  step="0.1"
                  className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-md text-white text-sm"
                />
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={runTest}
              disabled={isRunning}
              className="button-primary w-full mt-6"
            >
              {isRunning ? (
                <>
                  <span className="animate-spin mr-2">⚙️</span>
                  Running Test...
                </>
              ) : (
                <>
                  🧪 Run Test
                </>
              )}
            </button>
          </div>

          {/* Right Panel - Test Execution */}
          <div className="flex-1 flex flex-col">
            {/* Execution Steps */}
            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="label-l text-white mb-4">Execution Steps</h3>

              {testSteps.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[var(--ff-text-muted)]">
                    Click "Run Test" to start workflow testing
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testSteps.map((step, index) => (
                    <div
                      key={step.nodeId}
                      className={`bg-[var(--ff-bg-dark)] rounded-lg p-4 border transition-all ${
                        currentStep === step.nodeId
                          ? 'border-[var(--ff-purple-500)] shadow-lg'
                          : 'border-[var(--ff-border)]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start">
                          <span className={`text-xl mr-3 ${getStepColor(step.status)}`}>
                            {getStepIcon(step.status)}
                          </span>
                          <div>
                            <h4 className="font-medium text-white">
                              {index + 1}. {step.nodeName}
                            </h4>
                            <p className="text-xs text-[var(--ff-text-muted)] mt-1">
                              {step.nodeType.toUpperCase()}
                              {step.duration && ` • ${step.duration}ms`}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          step.status === 'success' ? 'bg-green-500/20 text-green-400' :
                          step.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          step.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                          step.status === 'skipped' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-[var(--ff-bg-layer)] text-[var(--ff-text-muted)]'
                        }`}>
                          {step.status}
                        </span>
                      </div>

                      {/* Step Logs */}
                      {step.logs && step.logs.length > 0 && (
                        <div className="mt-3 text-xs text-[var(--ff-text-secondary)]">
                          {step.logs.map((log, i) => (
                            <div key={i}>• {log}</div>
                          ))}
                        </div>
                      )}

                      {/* Error Message */}
                      {step.error && (
                        <div className="mt-3 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                          Error: {step.error}
                        </div>
                      )}

                      {/* Result Preview */}
                      {step.result && (
                        <details className="mt-3">
                          <summary className="text-xs text-[var(--ff-text-muted)] cursor-pointer hover:text-white">
                            View Result
                          </summary>
                          <pre className="mt-2 text-xs text-[var(--ff-text-secondary)] bg-[var(--ff-bg-layer)] p-2 rounded overflow-x-auto">
                            {JSON.stringify(step.result, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Execution Logs */}
            <div className="border-t border-[var(--ff-border)] p-4 bg-[var(--ff-bg-dark)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="label-s text-[var(--ff-text-secondary)]">Execution Logs</h4>
                {executionLogs.length > 0 && (
                  <button
                    onClick={() => setExecutionLogs([])}
                    className="text-xs text-[var(--ff-text-muted)] hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="bg-black rounded p-3 h-32 overflow-y-auto font-mono text-xs">
                {executionLogs.length === 0 ? (
                  <div className="text-[var(--ff-text-muted)]">No logs yet...</div>
                ) : (
                  executionLogs.map((log, index) => (
                    <div key={index} className="text-green-400">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--ff-border)] flex justify-between items-center">
          <div>
            {overallStatus === 'success' && (
              <span className="text-green-400 flex items-center">
                <span className="text-xl mr-2">✅</span>
                All tests passed
              </span>
            )}
            {overallStatus === 'failed' && (
              <span className="text-red-400 flex items-center">
                <span className="text-xl mr-2">❌</span>
                Test failed
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="button-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}