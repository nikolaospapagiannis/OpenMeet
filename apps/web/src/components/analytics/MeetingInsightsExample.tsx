'use client';

/**
 * Example usage of MeetingInsightsPanel with sample data
 * This demonstrates all features of the analytics components
 */

import { MeetingInsightsPanel } from './MeetingInsightsPanel';

export function MeetingInsightsExample() {
  // Sample data for demonstration
  const sampleInsights = [
    {
      type: 'success' as const,
      title: 'Excellent Engagement',
      description: 'All participants actively contributed with balanced talk time',
      metric: '92/100',
    },
    {
      type: 'tip' as const,
      title: 'Follow-up Recommended',
      description: 'Consider scheduling a follow-up to address the remaining 3 questions',
      metric: '3 pending',
    },
    {
      type: 'info' as const,
      title: 'Duration Optimal',
      description: 'Meeting lasted 45 minutes, which is within the ideal range',
      metric: '45 min',
    },
  ];

  const sampleSpeakerData = [
    {
      speaker: 'John Smith',
      talkTime: 1200, // 20 minutes in seconds
      wordCount: 2400,
      talkTimePercentage: 35,
    },
    {
      speaker: 'Sarah Johnson',
      talkTime: 1080, // 18 minutes
      wordCount: 2160,
      talkTimePercentage: 32,
    },
    {
      speaker: 'Mike Chen',
      talkTime: 720, // 12 minutes
      wordCount: 1440,
      talkTimePercentage: 21,
    },
    {
      speaker: 'Emily Davis',
      talkTime: 400, // 6.7 minutes
      wordCount: 800,
      talkTimePercentage: 12,
    },
  ];

  const sampleSentimentData = [
    { timestamp: 0, sentiment: 0.3, speaker: 'John Smith', text: 'Welcome everyone to this meeting' },
    { timestamp: 120, sentiment: 0.6, speaker: 'Sarah Johnson', text: 'Great to see the progress on this project' },
    { timestamp: 300, sentiment: 0.8, speaker: 'Mike Chen', text: 'I love the direction we are taking' },
    { timestamp: 480, sentiment: 0.2, speaker: 'Emily Davis', text: 'We need to discuss some concerns' },
    { timestamp: 720, sentiment: -0.3, speaker: 'John Smith', text: 'This is a bit challenging' },
    { timestamp: 960, sentiment: 0.1, speaker: 'Sarah Johnson', text: 'Let me clarify the requirements' },
    { timestamp: 1200, sentiment: 0.5, speaker: 'Mike Chen', text: 'That makes much more sense now' },
    { timestamp: 1440, sentiment: 0.7, speaker: 'Emily Davis', text: 'I am confident we can deliver this' },
    { timestamp: 1680, sentiment: 0.9, speaker: 'John Smith', text: 'Excellent work team, very excited about this' },
    { timestamp: 1920, sentiment: 0.8, speaker: 'Sarah Johnson', text: 'Looking forward to the next steps' },
  ];

  const sampleTopicData = [
    {
      topic: 'Product Roadmap',
      count: 15,
      duration: 900,
      segments: [
        { timestamp: 120, text: 'Let us review the Q1 roadmap items' },
        { timestamp: 480, text: 'The product team has prioritized these features' },
        { timestamp: 1200, text: 'We should finalize the roadmap by next week' },
      ],
    },
    {
      topic: 'Budget Review',
      count: 12,
      duration: 720,
      segments: [
        { timestamp: 240, text: 'Budget allocation needs discussion' },
        { timestamp: 600, text: 'We are under budget for this quarter' },
      ],
    },
    {
      topic: 'Team Performance',
      count: 10,
      duration: 600,
      segments: [
        { timestamp: 360, text: 'Team velocity has increased significantly' },
        { timestamp: 840, text: 'Great job on meeting the sprint goals' },
      ],
    },
    {
      topic: 'Technical Debt',
      count: 8,
      duration: 480,
      segments: [
        { timestamp: 720, text: 'We need to address the technical debt' },
        { timestamp: 1080, text: 'Let us allocate time for refactoring' },
      ],
    },
    {
      topic: 'Customer Feedback',
      count: 7,
      duration: 420,
      segments: [
        { timestamp: 180, text: 'Customers are very satisfied with the new features' },
      ],
    },
  ];

  const sampleQuestions = [
    {
      id: 'q1',
      speaker: 'Emily Davis',
      question: 'What is the timeline for the new feature launch?',
      timestamp: 300,
      answered: true,
      answerSnippet: 'We are targeting end of Q2 for the initial release',
      answerTimestamp: 360,
    },
    {
      id: 'q2',
      speaker: 'Mike Chen',
      question: 'Do we have the resources needed for this project?',
      timestamp: 600,
      answered: true,
      answerSnippet: 'Yes, we have allocated 3 engineers and 1 designer',
      answerTimestamp: 660,
    },
    {
      id: 'q3',
      speaker: 'Sarah Johnson',
      question: 'How are we handling the API versioning?',
      timestamp: 900,
      answered: true,
      answerSnippet: 'We will use semantic versioning with backward compatibility',
      answerTimestamp: 960,
    },
    {
      id: 'q4',
      speaker: 'Emily Davis',
      question: 'What about the security audit findings?',
      timestamp: 1200,
      answered: false,
    },
    {
      id: 'q5',
      speaker: 'Mike Chen',
      question: 'Can we integrate with the third-party service?',
      timestamp: 1500,
      answered: true,
      answerSnippet: 'Yes, they have a REST API we can use',
      answerTimestamp: 1560,
    },
  ];

  const sampleEngagementData = {
    overallScore: 85,
    participationBalance: 78,
    questionRate: 88,
    interactionLevel: 92,
    comparisonToPrevious: {
      change: 12.5,
      trend: 'up' as const,
    },
  };

  const handleMomentClick = (timestamp: number) => {
    console.log('Jump to timestamp:', timestamp);
    // In real implementation, this would seek to the timestamp in the video/audio
  };

  const handleSpeakerFilter = (speaker: string) => {
    console.log('Filter by speaker:', speaker);
    // In real implementation, this would filter the transcript
  };

  const handleTopicFilter = (topic: string) => {
    console.log('Filter by topic:', topic);
    // In real implementation, this would filter the transcript
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Meeting Insights Dashboard
        </h1>
        <p className="text-slate-400">
          Comprehensive analytics and insights from your meeting
        </p>
      </div>

      <MeetingInsightsPanel
        meetingId="sample-meeting-123"
        insights={sampleInsights}
        speakerData={sampleSpeakerData}
        sentimentData={sampleSentimentData}
        topicData={sampleTopicData}
        questions={sampleQuestions}
        engagementData={sampleEngagementData}
        duration={2400} // 40 minutes in seconds
      />
    </div>
  );
}
