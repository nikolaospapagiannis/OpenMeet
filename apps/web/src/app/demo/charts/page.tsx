'use client';

import {
  MeetingTrendsChart,
  DurationBarChart,
  PlatformPieChart,
  SpeakerLineChart
} from '@/components/charts';
import {
  mockMeetingTrends,
  mockDurationData,
  mockPlatformData,
  mockSpeakerData
} from '@/lib/mock-chart-data';

export default function ChartsDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Charts Demo</h1>
          <p className="text-slate-400">Production-ready Recharts components with glassmorphism</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <MeetingTrendsChart data={mockMeetingTrends} />
          </div>

          <DurationBarChart data={mockDurationData} />

          <PlatformPieChart data={mockPlatformData} />

          <div className="lg:col-span-2">
            <SpeakerLineChart
              data={mockSpeakerData}
              speakers={['John', 'Sarah', 'Mike']}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
