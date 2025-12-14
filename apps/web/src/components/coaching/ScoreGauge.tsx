'use client';

import { useEffect, useRef } from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 200 }: ScoreGaugeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Calculate dimensions
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 20;
    const startAngle = Math.PI * 0.7;
    const endAngle = Math.PI * 2.3;
    const scoreAngle = startAngle + (score / 100) * (endAngle - startAngle);

    // Draw background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Create gradient for score arc
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    if (score >= 80) {
      gradient.addColorStop(0, '#22c55e');
      gradient.addColorStop(1, '#16a34a');
    } else if (score >= 60) {
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#2563eb');
    } else if (score >= 40) {
      gradient.addColorStop(0, '#f59e0b');
      gradient.addColorStop(1, '#d97706');
    } else {
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#dc2626');
    }

    // Draw score arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, scoreAngle, false);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw score text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size / 5}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(score.toString(), centerX, centerY - 10);

    // Draw label
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${size / 12}px system-ui, -apple-system, sans-serif`;
    ctx.fillText('SCORE', centerX, centerY + 20);

    // Draw tick marks
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const tickAngle = startAngle + (i / tickCount) * (endAngle - startAngle);
      const innerRadius = radius - 25;
      const outerRadius = radius - 30;

      const x1 = centerX + Math.cos(tickAngle) * innerRadius;
      const y1 = centerY + Math.sin(tickAngle) * innerRadius;
      const x2 = centerX + Math.cos(tickAngle) * outerRadius;
      const y2 = centerY + Math.sin(tickAngle) * outerRadius;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [score, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block"
    />
  );
}