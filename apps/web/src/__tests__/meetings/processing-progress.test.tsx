/**
 * Processing Progress Tests
 * Tests for processing progress states
 */

import { render, screen } from '@testing-library/react';
import { ProcessingPhase, ProcessingPhaseData, PhaseStatus } from '@/components/meetings/ProcessingPhase';

describe('ProcessingPhase', () => {
  const basePhaseData: ProcessingPhaseData = {
    id: 'uploading',
    name: 'Uploading',
    description: 'Uploading file to server',
    status: 'pending',
    progress: 0,
  };

  test('renders pending phase correctly', () => {
    render(
      <ProcessingPhase
        phase={basePhaseData}
        index={0}
        isFirst={true}
        isLast={false}
      />
    );

    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(screen.getByText('Uploading file to server')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Phase index badge
  });

  test('renders in-progress phase with progress bar', () => {
    const inProgressPhase: ProcessingPhaseData = {
      ...basePhaseData,
      status: 'in_progress',
      progress: 45,
      startTime: Date.now() - 5000, // Started 5 seconds ago
    };

    render(
      <ProcessingPhase
        phase={inProgressPhase}
        index={0}
        isFirst={true}
        isLast={false}
      />
    );

    expect(screen.getByText('Uploading')).toBeInTheDocument();
    const progressBar = document.querySelector('[style*="width: 45%"]');
    expect(progressBar).toBeInTheDocument();
  });

  test('renders completed phase with checkmark', () => {
    const completedPhase: ProcessingPhaseData = {
      ...basePhaseData,
      status: 'completed',
      progress: 100,
      startTime: Date.now() - 10000,
      endTime: Date.now() - 5000,
    };

    render(
      <ProcessingPhase
        phase={completedPhase}
        index={0}
        isFirst={true}
        isLast={false}
      />
    );

    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  test('renders error phase with error message', () => {
    const errorPhase: ProcessingPhaseData = {
      ...basePhaseData,
      status: 'error',
      error: 'Failed to upload file: Network error',
    };

    render(
      <ProcessingPhase
        phase={errorPhase}
        index={0}
        isFirst={true}
        isLast={false}
      />
    );

    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(screen.getByText('Failed to upload file: Network error')).toBeInTheDocument();
  });

  test('displays time elapsed for active phase', () => {
    const activePhase: ProcessingPhaseData = {
      ...basePhaseData,
      status: 'in_progress',
      progress: 30,
      startTime: Date.now() - 65000, // Started 65 seconds ago
    };

    render(
      <ProcessingPhase
        phase={activePhase}
        index={1}
        isFirst={false}
        isLast={false}
      />
    );

    // Time should show as 1m 5s
    expect(screen.getByText(/1m \d+s/)).toBeInTheDocument();
  });

  test('displays time elapsed for completed phase', () => {
    const completedPhase: ProcessingPhaseData = {
      ...basePhaseData,
      status: 'completed',
      progress: 100,
      startTime: Date.now() - 120000,
      endTime: Date.now() - 90000, // Took 30 seconds
    };

    render(
      <ProcessingPhase
        phase={completedPhase}
        index={2}
        isFirst={false}
        isLast={false}
      />
    );

    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  test('renders phase-specific icons', () => {
    const phases = [
      { id: 'uploading', name: 'Uploading' },
      { id: 'analyzing', name: 'Analyzing' },
      { id: 'transcribing', name: 'Transcribing' },
      { id: 'diarizing', name: 'Speaker Diarization' },
      { id: 'summarizing', name: 'Summarizing' },
    ];

    phases.forEach((phase, index) => {
      const { container } = render(
        <ProcessingPhase
          phase={{
            ...basePhaseData,
            id: phase.id,
            name: phase.name,
          }}
          index={index}
          isFirst={index === 0}
          isLast={index === phases.length - 1}
        />
      );

      expect(screen.getByText(phase.name)).toBeInTheDocument();
      container.remove();
    });
  });

  test('renders connector line for non-last phases', () => {
    const { container } = render(
      <ProcessingPhase
        phase={basePhaseData}
        index={0}
        isFirst={true}
        isLast={false}
      />
    );

    const connectorLine = container.querySelector('.absolute.left-\\[22px\\]');
    expect(connectorLine).toBeInTheDocument();
  });

  test('does not render connector line for last phase', () => {
    const { container } = render(
      <ProcessingPhase
        phase={basePhaseData}
        index={2}
        isFirst={false}
        isLast={true}
      />
    );

    const connectorLine = container.querySelector('.absolute.left-\\[22px\\]');
    expect(connectorLine).not.toBeInTheDocument();
  });

  test('displays animated effects for in-progress phase', () => {
    const inProgressPhase: ProcessingPhaseData = {
      ...basePhaseData,
      status: 'in_progress',
      progress: 60,
    };

    const { container } = render(
      <ProcessingPhase
        phase={inProgressPhase}
        index={1}
        isFirst={false}
        isLast={false}
      />
    );

    // Check for pulse/ping animations
    const animatedElements = container.querySelectorAll('.animate-pulse, .animate-ping');
    expect(animatedElements.length).toBeGreaterThan(0);
  });

  test('applies correct styling for each status', () => {
    const statuses: PhaseStatus[] = ['pending', 'in_progress', 'completed', 'error'];

    statuses.forEach((status) => {
      const { container } = render(
        <ProcessingPhase
          phase={{ ...basePhaseData, status }}
          index={0}
          isFirst={true}
          isLast={false}
        />
      );

      const phaseIcon = container.querySelector('.rounded-full.flex.items-center.justify-center');
      expect(phaseIcon).toBeInTheDocument();

      if (status === 'error') {
        expect(phaseIcon).toHaveClass('border-red-500');
      } else if (status === 'completed') {
        expect(phaseIcon).toHaveClass('border-teal-400');
      } else if (status === 'in_progress') {
        expect(phaseIcon).toHaveClass('border-teal-500');
      } else {
        expect(phaseIcon).toHaveClass('border-slate-700');
      }

      container.remove();
    });
  });

  test('displays progress percentage correctly', () => {
    const progressValues = [0, 25, 50, 75, 100];

    progressValues.forEach((progress) => {
      const { container } = render(
        <ProcessingPhase
          phase={{
            ...basePhaseData,
            status: 'in_progress',
            progress,
          }}
          index={0}
          isFirst={true}
          isLast={false}
        />
      );

      const progressBar = container.querySelector(`[style*="width: ${progress}%"]`);
      expect(progressBar).toBeInTheDocument();

      container.remove();
    });
  });

  test('formats time correctly for different durations', () => {
    const testCases = [
      { elapsed: 5000, expected: '5s' },
      { elapsed: 30000, expected: '30s' },
      { elapsed: 60000, expected: '1m 0s' },
      { elapsed: 125000, expected: '2m 5s' },
    ];

    testCases.forEach(({ elapsed, expected }) => {
      const { container } = render(
        <ProcessingPhase
          phase={{
            ...basePhaseData,
            status: 'in_progress',
            startTime: Date.now() - elapsed,
          }}
          index={0}
          isFirst={true}
          isLast={false}
        />
      );

      expect(screen.getByText(expected)).toBeInTheDocument();
      container.remove();
    });
  });

  test('shows shimmer effect on progress bar', () => {
    const inProgressPhase: ProcessingPhaseData = {
      ...basePhaseData,
      status: 'in_progress',
      progress: 50,
    };

    const { container } = render(
      <ProcessingPhase
        phase={inProgressPhase}
        index={0}
        isFirst={true}
        isLast={false}
      />
    );

    const shimmerEffect = container.querySelector('.animate-shimmer');
    expect(shimmerEffect).toBeInTheDocument();
  });

  test('renders error details in special container', () => {
    const errorPhase: ProcessingPhaseData = {
      ...basePhaseData,
      status: 'error',
      error: 'Connection timeout after 30 seconds',
    };

    const { container } = render(
      <ProcessingPhase
        phase={errorPhase}
        index={0}
        isFirst={true}
        isLast={false}
      />
    );

    const errorContainer = container.querySelector('.bg-red-500\\/10.border-red-500\\/30');
    expect(errorContainer).toBeInTheDocument();
    expect(errorContainer).toHaveTextContent('Connection timeout after 30 seconds');
  });

  test('handles missing start time gracefully', () => {
    const phaseWithoutTime: ProcessingPhaseData = {
      ...basePhaseData,
      status: 'in_progress',
      progress: 50,
    };

    render(
      <ProcessingPhase
        phase={phaseWithoutTime}
        index={0}
        isFirst={true}
        isLast={false}
      />
    );

    // Should not show time elapsed if startTime is missing
    expect(screen.queryByText(/\d+s/)).not.toBeInTheDocument();
  });

  test('applies scale effect on in-progress phase icon', () => {
    const inProgressPhase: ProcessingPhaseData = {
      ...basePhaseData,
      status: 'in_progress',
      progress: 40,
    };

    const { container } = render(
      <ProcessingPhase
        phase={inProgressPhase}
        index={0}
        isFirst={true}
        isLast={false}
      />
    );

    const phaseIcon = container.querySelector('.scale-110');
    expect(phaseIcon).toBeInTheDocument();
  });
});