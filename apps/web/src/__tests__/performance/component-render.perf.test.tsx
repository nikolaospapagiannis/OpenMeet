/**
 * Component Rendering Performance Tests
 * Tests React component render times and memory efficiency
 */

import { render, cleanup, act } from '@testing-library/react';
import { performance } from 'perf_hooks';
import React, { useState, useEffect, useCallback, memo } from 'react';

// Performance thresholds for component rendering
const RENDER_THRESHOLDS = {
  initialRender: {
    simple: 50,     // 50ms for simple components
    complex: 150,   // 150ms for complex components
    heavy: 300,     // 300ms for data-heavy components
  },
  rerender: {
    simple: 20,     // 20ms for simple rerenders
    complex: 50,    // 50ms for complex rerenders
  },
  batchUpdates: {
    p95: 100,       // 100ms for batch updates
  },
};

interface RenderMetrics {
  renderTimes: number[];
  avgRenderTime: number;
  minRenderTime: number;
  maxRenderTime: number;
  p50: number;
  p95: number;
  p99: number;
}

function calculatePercentile(sortedTimes: number[], percentile: number): number {
  if (sortedTimes.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedTimes.length) - 1;
  return sortedTimes[Math.max(0, index)];
}

function calculateRenderMetrics(times: number[]): RenderMetrics {
  const sortedTimes = [...times].sort((a, b) => a - b);

  return {
    renderTimes: times,
    avgRenderTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    minRenderTime: sortedTimes[0] || 0,
    maxRenderTime: sortedTimes[sortedTimes.length - 1] || 0,
    p50: calculatePercentile(sortedTimes, 50),
    p95: calculatePercentile(sortedTimes, 95),
    p99: calculatePercentile(sortedTimes, 99),
  };
}

// Performance measurement wrapper
function measureRender(component: React.ReactElement): number {
  const start = performance.now();
  render(component);
  const end = performance.now();
  cleanup();
  return end - start;
}

function measureRerenderWithState<T>(
  Component: React.FC<{ value: T; onChange: (v: T) => void }>,
  initialValue: T,
  newValue: T
): { initialRender: number; rerender: number } {
  let setValue: ((v: T) => void) | null = null;

  const Wrapper: React.FC = () => {
    const [value, setValueInternal] = useState(initialValue);
    setValue = setValueInternal;
    return <Component value={value} onChange={setValueInternal} />;
  };

  const start1 = performance.now();
  const { rerender } = render(<Wrapper />);
  const initialRender = performance.now() - start1;

  // Trigger rerender
  const start2 = performance.now();
  act(() => {
    if (setValue) setValue(newValue);
  });
  const rerenderTime = performance.now() - start2;

  cleanup();
  return { initialRender, rerender: rerenderTime };
}

// Test components
const SimpleComponent: React.FC<{ text: string }> = ({ text }) => (
  <div className="p-4">
    <h1>{text}</h1>
    <p>Simple paragraph text</p>
  </div>
);

const ListComponent: React.FC<{ items: string[] }> = ({ items }) => (
  <ul>
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);

const ComplexComponent: React.FC<{
  data: Array<{ id: string; name: string; value: number }>;
}> = ({ data }) => (
  <div className="grid grid-cols-3 gap-4">
    {data.map((item) => (
      <div key={item.id} className="p-4 border rounded">
        <h3>{item.name}</h3>
        <p className="text-2xl font-bold">{item.value}</p>
        <div className="mt-2">
          <span className="text-sm text-gray-500">ID: {item.id}</span>
        </div>
      </div>
    ))}
  </div>
);

const ChartSimulation: React.FC<{ points: number[] }> = ({ points }) => (
  <svg width="400" height="200" viewBox="0 0 400 200">
    <path
      d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * 4} ${200 - p}`).join(' ')}
      stroke="blue"
      fill="none"
    />
    {points.map((p, i) => (
      <circle key={i} cx={i * 4} cy={200 - p} r="2" fill="blue" />
    ))}
  </svg>
);

const DeeplyNestedComponent: React.FC<{ depth: number; content: string }> = memo(
  ({ depth, content }) => {
    if (depth <= 0) {
      return <span>{content}</span>;
    }
    return (
      <div className="p-1 border">
        <DeeplyNestedComponent depth={depth - 1} content={content} />
      </div>
    );
  }
);

const StatefulComponent: React.FC<{ value: number; onChange: (v: number) => void }> = ({
  value,
  onChange,
}) => {
  const handleClick = useCallback(() => onChange(value + 1), [value, onChange]);

  return (
    <div className="p-4">
      <span className="text-2xl">{value}</span>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
};

describe('Component Rendering Performance Tests', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Simple Component Rendering', () => {
    it('should render simple component within threshold', () => {
      const times: number[] = [];

      for (let i = 0; i < 100; i++) {
        times.push(measureRender(<SimpleComponent text={`Test ${i}`} />));
      }

      const metrics = calculateRenderMetrics(times);

      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.simple);
      expect(metrics.avgRenderTime).toBeLessThan(RENDER_THRESHOLDS.initialRender.simple / 2);
    });

    it('should maintain consistent render times', () => {
      const times: number[] = [];

      for (let i = 0; i < 50; i++) {
        times.push(measureRender(<SimpleComponent text="Consistent Test" />));
      }

      const metrics = calculateRenderMetrics(times);

      // Standard deviation should be low
      const variance = times.reduce((sum, time) => {
        return sum + Math.pow(time - metrics.avgRenderTime, 2);
      }, 0) / times.length;
      const stdDev = Math.sqrt(variance);

      // Coefficient of variation should be less than 1
      expect(stdDev / metrics.avgRenderTime).toBeLessThan(1);
    });
  });

  describe('List Component Rendering', () => {
    it('should render small lists efficiently', () => {
      const items = Array.from({ length: 10 }, (_, i) => `Item ${i}`);
      const times: number[] = [];

      for (let i = 0; i < 50; i++) {
        times.push(measureRender(<ListComponent items={items} />));
      }

      const metrics = calculateRenderMetrics(times);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.simple);
    });

    it('should handle medium lists within threshold', () => {
      const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
      const times: number[] = [];

      for (let i = 0; i < 20; i++) {
        times.push(measureRender(<ListComponent items={items} />));
      }

      const metrics = calculateRenderMetrics(times);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.complex);
    });

    it('should render large lists within acceptable time', () => {
      const items = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        times.push(measureRender(<ListComponent items={items} />));
      }

      const metrics = calculateRenderMetrics(times);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.heavy);
    });
  });

  describe('Complex Component Rendering', () => {
    it('should render complex data grids within threshold', () => {
      const data = Array.from({ length: 50 }, (_, i) => ({
        id: `id-${i}`,
        name: `Item ${i}`,
        value: Math.random() * 1000,
      }));
      const times: number[] = [];

      for (let i = 0; i < 20; i++) {
        times.push(measureRender(<ComplexComponent data={data} />));
      }

      const metrics = calculateRenderMetrics(times);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.complex);
    });

    it('should handle large data sets', () => {
      const data = Array.from({ length: 200 }, (_, i) => ({
        id: `id-${i}`,
        name: `Item ${i}`,
        value: Math.random() * 1000,
      }));
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        times.push(measureRender(<ComplexComponent data={data} />));
      }

      const metrics = calculateRenderMetrics(times);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.heavy);
    });
  });

  describe('SVG/Chart Rendering', () => {
    it('should render chart visualizations efficiently', () => {
      const points = Array.from({ length: 100 }, () => Math.random() * 200);
      const times: number[] = [];

      for (let i = 0; i < 30; i++) {
        times.push(measureRender(<ChartSimulation points={points} />));
      }

      const metrics = calculateRenderMetrics(times);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.complex);
    });

    it('should handle large datasets in charts', () => {
      const points = Array.from({ length: 500 }, () => Math.random() * 200);
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        times.push(measureRender(<ChartSimulation points={points} />));
      }

      const metrics = calculateRenderMetrics(times);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.heavy);
    });
  });

  describe('Deeply Nested Components', () => {
    it('should handle moderate nesting depth', () => {
      const times: number[] = [];

      for (let i = 0; i < 20; i++) {
        times.push(measureRender(<DeeplyNestedComponent depth={20} content="Nested" />));
      }

      const metrics = calculateRenderMetrics(times);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.complex);
    });

    it('should handle deep nesting within threshold', () => {
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        times.push(measureRender(<DeeplyNestedComponent depth={50} content="Deeply Nested" />));
      }

      const metrics = calculateRenderMetrics(times);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.heavy);
    });
  });

  describe('Rerender Performance', () => {
    it('should rerender stateful components efficiently', () => {
      const results: { initialRender: number; rerender: number }[] = [];

      for (let i = 0; i < 30; i++) {
        results.push(measureRerenderWithState(StatefulComponent, 0, 1));
      }

      const rerenderTimes = results.map(r => r.rerender);
      const metrics = calculateRenderMetrics(rerenderTimes);

      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.rerender.simple);
    });

    it('should handle rapid state updates', async () => {
      let setValue: ((v: number) => void) | null = null;
      const updateTimes: number[] = [];

      const RapidUpdater: React.FC = () => {
        const [value, setValueInternal] = useState(0);
        setValue = setValueInternal;
        return <span>{value}</span>;
      };

      render(<RapidUpdater />);

      // Perform rapid updates
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        act(() => {
          if (setValue) setValue(i);
        });
        updateTimes.push(performance.now() - start);
      }

      const metrics = calculateRenderMetrics(updateTimes);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.batchUpdates.p95);

      cleanup();
    });
  });

  describe('Memory Efficiency', () => {
    it('should not accumulate memory across renders', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const renderCount = 100;

      for (let i = 0; i < renderCount; i++) {
        const data = Array.from({ length: 100 }, (_, j) => ({
          id: `id-${j}`,
          name: `Item ${j}`,
          value: Math.random() * 1000,
        }));
        measureRender(<ComplexComponent data={data} />);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / initialMemory;

      // Memory should not grow more than 100% (accounting for test infrastructure)
      expect(memoryGrowth).toBeLessThan(1.0);
    });

    it('should clean up after unmount', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <ComplexComponent
            data={Array.from({ length: 50 }, (_, j) => ({
              id: `id-${j}`,
              name: `Item ${j}`,
              value: j,
            }))}
          />
        );
        unmount();
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / initialMemory;

      expect(memoryGrowth).toBeLessThan(0.5);
    });
  });

  describe('Batch Rendering Performance', () => {
    it('should handle batch component creation', () => {
      const componentCount = 50;
      const data = Array.from({ length: 10 }, (_, i) => ({
        id: `id-${i}`,
        name: `Item ${i}`,
        value: i,
      }));

      const BatchContainer: React.FC = () => (
        <div>
          {Array.from({ length: componentCount }).map((_, i) => (
            <ComplexComponent key={i} data={data} />
          ))}
        </div>
      );

      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        times.push(measureRender(<BatchContainer />));
      }

      const metrics = calculateRenderMetrics(times);
      expect(metrics.p95).toBeLessThan(RENDER_THRESHOLDS.initialRender.heavy * 2);
    });
  });
});

describe('Render Metrics Calculation', () => {
  it('should calculate percentiles correctly', () => {
    const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const metrics = calculateRenderMetrics(times);

    expect(metrics.minRenderTime).toBe(10);
    expect(metrics.maxRenderTime).toBe(100);
    expect(metrics.avgRenderTime).toBe(55);
    expect(metrics.p50).toBe(50);
    expect(metrics.p95).toBe(100);
  });

  it('should handle empty arrays', () => {
    const metrics = calculateRenderMetrics([]);

    expect(metrics.avgRenderTime).toBe(0);
    expect(metrics.minRenderTime).toBe(0);
    expect(metrics.maxRenderTime).toBe(0);
    expect(metrics.p50).toBe(0);
  });

  it('should handle single value', () => {
    const metrics = calculateRenderMetrics([42]);

    expect(metrics.avgRenderTime).toBe(42);
    expect(metrics.minRenderTime).toBe(42);
    expect(metrics.maxRenderTime).toBe(42);
    expect(metrics.p50).toBe(42);
    expect(metrics.p95).toBe(42);
  });
});
