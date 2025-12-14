import { PrismaClient, UserRole, SubscriptionTier, SubscriptionStatus, MeetingStatus, RecordingSource, TemplateType, TaskStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed...');

  // Clear existing data (in reverse order of dependencies)
  console.log('🧹 Clearing existing data...');
  await prisma.task.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.meetingSummary.deleteMany();
  await prisma.transcriptContent.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meetingTemplate.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('Demo123456!', 10);

  // ========================================
  // ORGANIZATIONS
  // ========================================
  console.log('🏢 Creating organizations...');
  const org1 = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      domain: 'acme.com',
      logoUrl: 'https://ui-avatars.com/api/?name=Acme+Corp&background=7a5af8&color=fff',
      subscriptionTier: SubscriptionTier.business,
      subscriptionStatus: SubscriptionStatus.active,
      settings: {
        timezone: 'America/New_York',
        language: 'en',
        autoRecording: true,
        aiSummaries: true,
      },
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: 'TechStart Inc',
      slug: 'techstart',
      domain: 'techstart.io',
      logoUrl: 'https://ui-avatars.com/api/?name=TechStart&background=9945ff&color=fff',
      subscriptionTier: SubscriptionTier.pro,
      subscriptionStatus: SubscriptionStatus.active,
      settings: {
        timezone: 'America/Los_Angeles',
        language: 'en',
        autoRecording: true,
        aiSummaries: true,
      },
    },
  });

  const org3 = await prisma.organization.create({
    data: {
      name: 'Freelance Consultants',
      slug: 'freelance-consultants',
      subscriptionTier: SubscriptionTier.free,
      subscriptionStatus: SubscriptionStatus.active,
      settings: {
        timezone: 'UTC',
        language: 'en',
        autoRecording: false,
        aiSummaries: false,
      },
    },
  });

  // ========================================
  // USERS
  // ========================================
  console.log('👥 Creating users...');

  const admin1 = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      passwordHash: hashedPassword,
      firstName: 'John',
      lastName: 'Admin',
      role: UserRole.admin,
      emailVerified: true,
      organizationId: org1.id,
      avatarUrl: 'https://ui-avatars.com/api/?name=John+Admin&background=7a5af8&color=fff',
      preferences: { notifications: true, emailDigest: 'weekly' },
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      email: 'sarah@techstart.io',
      passwordHash: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Chen',
      role: UserRole.admin,
      emailVerified: true,
      organizationId: org2.id,
      avatarUrl: 'https://ui-avatars.com/api/?name=Sarah+Chen&background=9945ff&color=fff',
      preferences: { notifications: true, emailDigest: 'daily' },
    },
  });

  const alice = await prisma.user.create({
    data: {
      email: 'alice@acme.com',
      passwordHash: hashedPassword,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: UserRole.user,
      emailVerified: true,
      organizationId: org1.id,
      avatarUrl: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=06b6d4&color=fff',
      preferences: { notifications: true },
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@acme.com',
      passwordHash: hashedPassword,
      firstName: 'Bob',
      lastName: 'Smith',
      role: UserRole.user,
      emailVerified: true,
      organizationId: org1.id,
      avatarUrl: 'https://ui-avatars.com/api/?name=Bob+Smith&background=8b5cf6&color=fff',
      preferences: { notifications: true },
    },
  });

  const carol = await prisma.user.create({
    data: {
      email: 'carol@acme.com',
      passwordHash: hashedPassword,
      firstName: 'Carol',
      lastName: 'Williams',
      role: UserRole.user,
      emailVerified: true,
      organizationId: org1.id,
      avatarUrl: 'https://ui-avatars.com/api/?name=Carol+Williams&background=ec4899&color=fff',
      preferences: { notifications: false },
    },
  });

  const david = await prisma.user.create({
    data: {
      email: 'david@techstart.io',
      passwordHash: hashedPassword,
      firstName: 'David',
      lastName: 'Lee',
      role: UserRole.user,
      emailVerified: true,
      organizationId: org2.id,
      avatarUrl: 'https://ui-avatars.com/api/?name=David+Lee&background=f59e0b&color=fff',
      preferences: { notifications: true },
    },
  });

  const emma = await prisma.user.create({
    data: {
      email: 'emma@techstart.io',
      passwordHash: hashedPassword,
      firstName: 'Emma',
      lastName: 'Brown',
      role: UserRole.user,
      emailVerified: true,
      organizationId: org2.id,
      avatarUrl: 'https://ui-avatars.com/api/?name=Emma+Brown&background=10b981&color=fff',
      preferences: { notifications: true },
    },
  });

  await prisma.user.create({
    data: {
      email: 'freelancer@example.com',
      passwordHash: hashedPassword,
      firstName: 'Frank',
      lastName: 'Miller',
      role: UserRole.user,
      emailVerified: true,
      organizationId: org3.id,
      avatarUrl: 'https://ui-avatars.com/api/?name=Frank+Miller&background=6366f1&color=fff',
      preferences: { notifications: true },
    },
  });

  // ========================================
  // WORKSPACES
  // ========================================
  console.log('💼 Creating workspaces...');
  const workspace1 = await prisma.workspace.create({
    data: {
      name: 'Sales Team',
      organizationId: org1.id,
      settings: { defaultRecording: true, autoTranscription: true },
    },
  });

  const workspace2 = await prisma.workspace.create({
    data: {
      name: 'Product Team',
      organizationId: org1.id,
      settings: { defaultRecording: true, autoTranscription: true },
    },
  });

  const workspace3 = await prisma.workspace.create({
    data: {
      name: 'Engineering',
      organizationId: org2.id,
      settings: { defaultRecording: true, autoTranscription: true },
    },
  });

  // ========================================
  // CUSTOM TEMPLATES
  // ========================================
  console.log('📋 Creating custom templates...');

  await prisma.meetingTemplate.create({
    data: {
      name: 'Acme Sales Call Notes',
      description: 'Custom template for Acme sales team calls',
      type: TemplateType.client_call,
      organizationId: org1.id,
      userId: admin1.id,
      templateData: {
        sections: [
          { title: 'Client Information', content: '**Company:** {{company}}\n**Contact:** {{contact}}\n**Industry:** {{industry}}' },
          { title: 'Current Pain Points', content: '### Challenges Discussed\n\n### Business Impact\n\n### Urgency Level' },
          { title: 'Solution Fit', content: '### Products Discussed\n\n### Value Proposition\n\n### Competitor Comparison' },
          { title: 'Next Steps', content: '### Immediate Actions\n\n### Follow-up Date\n\n### Decision Makers to Involve' },
        ],
        tags: ['sales', 'acme', 'client'],
      },
      variables: ['{{company}}', '{{contact}}', '{{industry}}', '{{meeting_title}}', '{{date}}'],
      isActive: true,
      usageCount: 15,
    },
  });

  await prisma.meetingTemplate.create({
    data: {
      name: 'Product Feature Review',
      description: 'Template for product team feature discussions',
      type: TemplateType.team_meeting,
      organizationId: org1.id,
      userId: alice.id,
      templateData: {
        sections: [
          { title: 'Feature Overview', content: '**Feature Name:** {{feature_name}}\n**Owner:** {{owner}}\n**Sprint:** {{sprint}}' },
          { title: 'Requirements Review', content: '### User Stories\n\n### Acceptance Criteria\n\n### Technical Requirements' },
          { title: 'Design Discussion', content: '### UI/UX Considerations\n\n### Technical Architecture\n\n### Dependencies' },
          { title: 'Timeline & Resources', content: '### Estimated Effort\n\n### Resource Needs\n\n### Risks & Blockers' },
        ],
        tags: ['product', 'feature', 'planning'],
      },
      variables: ['{{feature_name}}', '{{owner}}', '{{sprint}}'],
      isActive: true,
      usageCount: 8,
    },
  });

  await prisma.meetingTemplate.create({
    data: {
      name: 'Sprint Retrospective',
      description: 'TechStart engineering team retrospective template',
      type: TemplateType.retrospective,
      organizationId: org2.id,
      userId: admin2.id,
      templateData: {
        sections: [
          { title: 'Sprint Summary', content: '**Sprint:** {{sprint}}\n**Team:** {{team}}\n**Velocity:** {{velocity}}' },
          { title: 'What Went Well', content: '### Successes\n\n### Team Wins\n\n### Process Improvements' },
          { title: 'What Could Be Better', content: '### Challenges\n\n### Technical Debt\n\n### Process Issues' },
          { title: 'Action Items', content: '### High Priority\n\n### Nice to Have\n\n### Owner Assignments' },
        ],
        tags: ['engineering', 'retro', 'agile'],
      },
      variables: ['{{sprint}}', '{{team}}', '{{velocity}}'],
      isActive: true,
      usageCount: 12,
    },
  });

  // ========================================
  // MEETINGS WITH FULL DATA
  // ========================================
  console.log('📅 Creating meetings with transcripts and analysis...');
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Meeting 1: Q4 Sales Strategy Review
  const meeting1 = await prisma.meeting.create({
    data: {
      title: 'Q4 Sales Strategy Review',
      description: 'Quarterly sales performance review and strategy planning for Q4',
      organizationId: org1.id,
      userId: admin1.id,
      workspaceId: workspace1.id,
      scheduledStartAt: lastWeek,
      scheduledEndAt: new Date(lastWeek.getTime() + 60 * 60 * 1000),
      actualStartAt: lastWeek,
      actualEndAt: new Date(lastWeek.getTime() + 65 * 60 * 1000),
      status: MeetingStatus.completed,
      meetingUrl: 'https://zoom.us/j/123456789',
      platform: 'zoom',
      recordingSource: RecordingSource.bot,
      metadata: { attendeeCount: 4, recordingSize: 245000000, duration: 3900, hasVideo: true, hasScreenShare: true },
    },
  });

  await prisma.meetingParticipant.createMany({
    data: [
      { meetingId: meeting1.id, name: 'John Admin', email: 'admin@acme.com', role: 'host', talkTimeSeconds: 1200, joinedAt: lastWeek },
      { meetingId: meeting1.id, name: 'Alice Johnson', email: 'alice@acme.com', role: 'presenter', talkTimeSeconds: 900, joinedAt: lastWeek },
      { meetingId: meeting1.id, name: 'Bob Smith', email: 'bob@acme.com', role: 'participant', talkTimeSeconds: 600, joinedAt: lastWeek },
      { meetingId: meeting1.id, name: 'Carol Williams', email: 'carol@acme.com', role: 'participant', talkTimeSeconds: 450, joinedAt: lastWeek },
    ],
  });

  const transcript1 = await prisma.transcript.create({
    data: {
      meetingId: meeting1.id,
      language: 'en',
      wordCount: 4500,
      confidenceScore: 0.95,
      isFinal: true,
    },
  });

  const segments1 = [
    { id: '1', speaker: 'John Admin', text: "Good morning everyone. Let's start our Q4 sales strategy review. As you know, we've had an excellent Q3 with 15% growth.", startTime: 0, endTime: 15, confidence: 0.97 },
    { id: '2', speaker: 'John Admin', text: "I'd like Alice to walk us through the current pipeline and then we'll discuss our targets for Q4.", startTime: 15, endTime: 28, confidence: 0.96 },
    { id: '3', speaker: 'Alice Johnson', text: "Thanks John. So looking at our current pipeline, we have $2.5 million in qualified opportunities. The enterprise segment is particularly strong this quarter.", startTime: 28, endTime: 45, confidence: 0.95 },
    { id: '4', speaker: 'Alice Johnson', text: "Our win rate has improved to 32% which is up from 28% last quarter. The new demo process seems to be working well.", startTime: 45, endTime: 58, confidence: 0.94 },
    { id: '5', speaker: 'Bob Smith', text: "I've noticed the enterprise deals are taking longer to close. Average sales cycle is now 45 days versus 38 days last quarter.", startTime: 58, endTime: 72, confidence: 0.93 },
    { id: '6', speaker: 'Carol Williams', text: "That's a good point Bob. We should discuss strategies to accelerate enterprise deals. Maybe more executive involvement?", startTime: 72, endTime: 85, confidence: 0.95 },
    { id: '7', speaker: 'John Admin', text: "I agree. Let's plan for executive sponsorship on deals over $100K. Carol, can you own that initiative?", startTime: 85, endTime: 98, confidence: 0.96 },
    { id: '8', speaker: 'Carol Williams', text: "Absolutely. I'll draft a process document by end of week and share it with the team.", startTime: 98, endTime: 110, confidence: 0.94 },
    { id: '9', speaker: 'Alice Johnson', text: "For Q4 targets, I'm proposing we aim for $3.2 million in closed revenue. That's a 20% increase from Q3.", startTime: 110, endTime: 125, confidence: 0.95 },
    { id: '10', speaker: 'Bob Smith', text: "That's ambitious but achievable. We have several large deals that should close in November.", startTime: 125, endTime: 138, confidence: 0.93 },
  ];

  const fullText1 = segments1.map(s => `${s.speaker}: ${s.text}`).join('\n\n');

  await prisma.transcriptContent.create({
    data: {
      transcriptId: transcript1.id,
      meetingId: meeting1.id,
      organizationId: org1.id,
      fullText: fullText1,
      segments: segments1,
      speakers: [
        { id: '1', name: 'John Admin', talkTime: 1200 },
        { id: '2', name: 'Alice Johnson', talkTime: 900 },
        { id: '3', name: 'Bob Smith', talkTime: 600 },
        { id: '4', name: 'Carol Williams', talkTime: 450 },
      ],
      language: 'en',
      wordCount: 4500,
      duration: 3900,
      speakerCount: 4,
    },
  });

  await prisma.meetingSummary.create({
    data: {
      meetingId: meeting1.id,
      transcriptId: transcript1.id,
      summaryType: 'general',
      title: 'Q4 Sales Strategy Review Summary',
      overview: "The Q4 Sales Strategy Review covered current pipeline status, performance metrics, and quarterly targets. The team has $2.5M in qualified opportunities with an improved 32% win rate. Key discussion points included longer enterprise sales cycles (45 days vs 38 days) and the need for executive sponsorship on large deals. Q4 revenue target was set at $3.2M, representing a 20% increase from Q3.",
      keyPoints: [
        "Q3 showed 15% growth with strong enterprise segment performance",
        "Current pipeline at $2.5M with 32% win rate (up from 28%)",
        "Enterprise sales cycle increased to 45 days (from 38 days)",
        "Q4 target set at $3.2M revenue (20% increase)",
        "New initiative: Executive sponsorship for deals over $100K"
      ],
      actionItems: [
        { description: "Draft executive sponsorship process document", assignee: "Carol Williams", priority: "high", dueDate: "End of week" },
        { description: "Review and approve Q4 targets", assignee: "John Admin", priority: "high", dueDate: "Tomorrow" },
        { description: "Identify deals needing executive involvement", assignee: "Alice Johnson", priority: "medium", dueDate: "Next week" },
        { description: "Update CRM with new pipeline data", assignee: "Bob Smith", priority: "medium", dueDate: "End of day" }
      ],
      decisions: [
        "Q4 revenue target approved at $3.2M",
        "Executive sponsorship required for deals over $100K"
      ],
      aiModel: 'gpt-4',
      metadata: { sentiment: 0.72, topics: ['sales strategy', 'pipeline review', 'Q4 planning', 'enterprise sales', 'win rates'] },
    },
  });

  await prisma.task.createMany({
    data: [
      {
        id: randomUUID(),
        title: 'Draft executive sponsorship process document',
        description: 'Create a process document for executive involvement in deals over $100K',
        organizationId: org1.id,
        assignedTo: carol.id,
        createdBy: admin1.id,
        sourceType: 'meeting',
        sourceId: meeting1.id,
        status: TaskStatus.open,
        priority: TaskPriority.high,
        dueDate: new Date(lastWeek.getTime() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: randomUUID(),
        title: 'Review and approve Q4 targets',
        description: 'Final review and sign-off on Q4 revenue targets',
        organizationId: org1.id,
        assignedTo: admin1.id,
        createdBy: alice.id,
        sourceType: 'meeting',
        sourceId: meeting1.id,
        status: TaskStatus.completed,
        priority: TaskPriority.high,
        dueDate: new Date(lastWeek.getTime() + 1 * 24 * 60 * 60 * 1000),
      },
      {
        id: randomUUID(),
        title: 'Identify deals needing executive involvement',
        description: 'Review pipeline and flag deals over $100K for executive sponsorship',
        organizationId: org1.id,
        assignedTo: alice.id,
        createdBy: admin1.id,
        sourceType: 'meeting',
        sourceId: meeting1.id,
        status: TaskStatus.in_progress,
        priority: TaskPriority.medium,
        dueDate: new Date(lastWeek.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Meeting 2: Product Roadmap Planning
  const meeting2 = await prisma.meeting.create({
    data: {
      title: 'Product Roadmap Planning - H2 2024',
      description: 'Planning session for second half product roadmap',
      organizationId: org1.id,
      userId: alice.id,
      workspaceId: workspace2.id,
      scheduledStartAt: yesterday,
      scheduledEndAt: new Date(yesterday.getTime() + 90 * 60 * 1000),
      actualStartAt: yesterday,
      actualEndAt: new Date(yesterday.getTime() + 95 * 60 * 1000),
      status: MeetingStatus.completed,
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      platform: 'google_meet',
      recordingSource: RecordingSource.extension,
      metadata: { attendeeCount: 3, recordingSize: 180000000, duration: 5700, hasVideo: true, hasScreenShare: true },
    },
  });

  await prisma.meetingParticipant.createMany({
    data: [
      { meetingId: meeting2.id, name: 'Alice Johnson', email: 'alice@acme.com', role: 'host', talkTimeSeconds: 2100, joinedAt: yesterday },
      { meetingId: meeting2.id, name: 'Bob Smith', email: 'bob@acme.com', role: 'presenter', talkTimeSeconds: 1800, joinedAt: yesterday },
      { meetingId: meeting2.id, name: 'Carol Williams', email: 'carol@acme.com', role: 'participant', talkTimeSeconds: 1200, joinedAt: yesterday },
    ],
  });

  const transcript2 = await prisma.transcript.create({
    data: { meetingId: meeting2.id, language: 'en', wordCount: 6200, confidenceScore: 0.94, isFinal: true },
  });

  const segments2 = [
    { id: '1', speaker: 'Alice Johnson', text: "Welcome everyone to our H2 roadmap planning session. Today we need to finalize our priorities for the next two quarters.", startTime: 0, endTime: 12, confidence: 0.96 },
    { id: '2', speaker: 'Alice Johnson', text: "Based on customer feedback and market analysis, I've identified three major themes: AI integration, mobile experience, and enterprise security.", startTime: 12, endTime: 28, confidence: 0.95 },
    { id: '3', speaker: 'Bob Smith', text: "The AI integration is crucial. Our competitors have already launched similar features. We need to move fast on this.", startTime: 28, endTime: 42, confidence: 0.94 },
    { id: '4', speaker: 'Carol Williams', text: "I agree with Bob. From a sales perspective, AI features are the number one request from enterprise prospects.", startTime: 42, endTime: 55, confidence: 0.95 },
    { id: '5', speaker: 'Alice Johnson', text: "Good. Let's prioritize AI integration for Q3 then. Bob, can you estimate the engineering effort?", startTime: 55, endTime: 68, confidence: 0.96 },
    { id: '6', speaker: 'Bob Smith', text: "We'll need about 6 weeks for the core AI engine and another 4 weeks for the UI integration. So roughly 2.5 months total.", startTime: 68, endTime: 85, confidence: 0.93 },
    { id: '7', speaker: 'Carol Williams', text: "What about the mobile app? Several customers have mentioned they need offline capabilities.", startTime: 85, endTime: 98, confidence: 0.94 },
    { id: '8', speaker: 'Bob Smith', text: "Mobile offline is complex. We'd need to implement local storage and sync mechanisms. I'd estimate 8 weeks for a proper implementation.", startTime: 98, endTime: 115, confidence: 0.92 },
    { id: '9', speaker: 'Alice Johnson', text: "Let's slot mobile improvements for Q4 then. That gives us time to do it right.", startTime: 115, endTime: 128, confidence: 0.95 },
  ];

  const fullText2 = segments2.map(s => `${s.speaker}: ${s.text}`).join('\n\n');

  await prisma.transcriptContent.create({
    data: {
      transcriptId: transcript2.id,
      meetingId: meeting2.id,
      organizationId: org1.id,
      fullText: fullText2,
      segments: segments2,
      speakers: [
        { id: '1', name: 'Alice Johnson', talkTime: 2100 },
        { id: '2', name: 'Bob Smith', talkTime: 1800 },
        { id: '3', name: 'Carol Williams', talkTime: 1200 },
      ],
      language: 'en',
      wordCount: 6200,
      duration: 5700,
      speakerCount: 3,
    },
  });

  await prisma.meetingSummary.create({
    data: {
      meetingId: meeting2.id,
      transcriptId: transcript2.id,
      summaryType: 'general',
      title: 'H2 2024 Product Roadmap Summary',
      overview: "The H2 2024 product roadmap planning session focused on three major themes: AI integration, mobile experience, and enterprise security. AI integration was prioritized for Q3 with an estimated 2.5 month timeline. Mobile improvements including offline capabilities were scheduled for Q4 due to complexity (8-week estimate). The team aligned on customer feedback driving priorities.",
      keyPoints: [
        "Three major themes identified: AI integration, mobile experience, enterprise security",
        "AI integration prioritized for Q3 (2.5 month estimate)",
        "Mobile offline capabilities scheduled for Q4 (8 week estimate)",
        "Customer feedback and competitive pressure driving AI priority",
        "Enterprise security features to be scoped separately"
      ],
      actionItems: [
        { description: "Create detailed AI integration technical spec", assignee: "Bob Smith", priority: "high", dueDate: "Next week" },
        { description: "Draft mobile offline requirements document", assignee: "Alice Johnson", priority: "medium", dueDate: "End of month" },
        { description: "Schedule security feature scoping session", assignee: "Carol Williams", priority: "medium", dueDate: "Next week" },
      ],
      decisions: ["AI integration prioritized for Q3", "Mobile improvements scheduled for Q4"],
      aiModel: 'gpt-4',
      metadata: { sentiment: 0.78, topics: ['product roadmap', 'AI integration', 'mobile development', 'enterprise features', 'Q3/Q4 planning'] },
    },
  });

  // Meeting 3: Client Demo
  const meeting3 = await prisma.meeting.create({
    data: {
      title: 'Client Demo - Enterprise Features',
      description: 'Product demonstration for potential enterprise client',
      organizationId: org1.id,
      userId: bob.id,
      workspaceId: workspace1.id,
      scheduledStartAt: twoDaysAgo,
      scheduledEndAt: new Date(twoDaysAgo.getTime() + 45 * 60 * 1000),
      actualStartAt: twoDaysAgo,
      actualEndAt: new Date(twoDaysAgo.getTime() + 50 * 60 * 1000),
      status: MeetingStatus.completed,
      meetingUrl: 'https://zoom.us/j/987654321',
      platform: 'zoom',
      recordingSource: RecordingSource.bot,
      metadata: { attendeeCount: 5, recordingSize: 120000000, duration: 3000, hasVideo: true, hasScreenShare: true },
    },
  });

  await prisma.meetingParticipant.createMany({
    data: [
      { meetingId: meeting3.id, name: 'Bob Smith', email: 'bob@acme.com', role: 'host', talkTimeSeconds: 1500, joinedAt: twoDaysAgo },
      { meetingId: meeting3.id, name: 'Carol Williams', email: 'carol@acme.com', role: 'presenter', talkTimeSeconds: 800, joinedAt: twoDaysAgo },
      { meetingId: meeting3.id, name: 'Michael Chen', email: 'mchen@prospect.com', role: 'participant', talkTimeSeconds: 400, joinedAt: twoDaysAgo },
      { meetingId: meeting3.id, name: 'Lisa Park', email: 'lpark@prospect.com', role: 'participant', talkTimeSeconds: 200, joinedAt: twoDaysAgo },
      { meetingId: meeting3.id, name: 'James Wilson', email: 'jwilson@prospect.com', role: 'participant', talkTimeSeconds: 100, joinedAt: twoDaysAgo },
    ],
  });

  const transcript3 = await prisma.transcript.create({
    data: { meetingId: meeting3.id, language: 'en', wordCount: 3800, confidenceScore: 0.96, isFinal: true },
  });

  const segments3 = [
    { id: '1', speaker: 'Bob Smith', text: "Thank you all for joining today. We're excited to show you our enterprise platform and how it can transform your meeting workflows.", startTime: 0, endTime: 15, confidence: 0.97 },
    { id: '2', speaker: 'Michael Chen', text: "Thanks Bob. We're particularly interested in the AI transcription and the security features you mentioned.", startTime: 15, endTime: 28, confidence: 0.95 },
    { id: '3', speaker: 'Bob Smith', text: "Perfect. Let me start with a live demo of our transcription. Carol will handle the security walkthrough.", startTime: 28, endTime: 42, confidence: 0.96 },
    { id: '4', speaker: 'Bob Smith', text: "As you can see, the transcription is happening in real-time with speaker identification. Our accuracy rate is over 95%.", startTime: 42, endTime: 58, confidence: 0.94 },
    { id: '5', speaker: 'Lisa Park', text: "Impressive. How does the speaker identification work with multiple speakers?", startTime: 58, endTime: 68, confidence: 0.93 },
    { id: '6', speaker: 'Bob Smith', text: "Great question. We use AI-powered voice fingerprinting combined with meeting context to identify speakers with 90% accuracy.", startTime: 68, endTime: 82, confidence: 0.95 },
    { id: '7', speaker: 'Carol Williams', text: "Now let me walk you through our security features. We're SOC 2 Type II certified and support SSO with SAML 2.0.", startTime: 82, endTime: 98, confidence: 0.96 },
    { id: '8', speaker: 'James Wilson', text: "Do you support data residency options? We have requirements to keep data in the EU.", startTime: 98, endTime: 110, confidence: 0.94 },
    { id: '9', speaker: 'Carol Williams', text: "Absolutely. We have data centers in the US, EU, and APAC. You can choose where your data is stored.", startTime: 110, endTime: 125, confidence: 0.95 },
  ];

  const fullText3 = segments3.map(s => `${s.speaker}: ${s.text}`).join('\n\n');

  await prisma.transcriptContent.create({
    data: {
      transcriptId: transcript3.id,
      meetingId: meeting3.id,
      organizationId: org1.id,
      fullText: fullText3,
      segments: segments3,
      speakers: [
        { id: '1', name: 'Bob Smith', talkTime: 1500 },
        { id: '2', name: 'Carol Williams', talkTime: 800 },
        { id: '3', name: 'Michael Chen', talkTime: 400 },
        { id: '4', name: 'Lisa Park', talkTime: 200 },
        { id: '5', name: 'James Wilson', talkTime: 100 },
      ],
      language: 'en',
      wordCount: 3800,
      duration: 3000,
      speakerCount: 5,
    },
  });

  await prisma.meetingSummary.create({
    data: {
      meetingId: meeting3.id,
      transcriptId: transcript3.id,
      summaryType: 'general',
      title: 'Enterprise Demo Summary',
      overview: "Enterprise demo for potential client focusing on AI transcription and security features. Demonstrated real-time transcription with 95%+ accuracy and AI speaker identification (90% accuracy). Security walkthrough covered SOC 2 Type II certification, SAML 2.0 SSO support, and multi-region data residency options (US, EU, APAC). Client showed strong interest particularly in EU data residency capabilities.",
      keyPoints: [
        "Real-time AI transcription demonstrated with 95%+ accuracy",
        "Speaker identification using AI voice fingerprinting (90% accuracy)",
        "SOC 2 Type II certified with SAML 2.0 SSO support",
        "Multi-region data residency: US, EU, and APAC data centers",
        "Client has EU data residency requirement"
      ],
      actionItems: [
        { description: "Send EU data residency documentation", assignee: "Carol Williams", priority: "high", dueDate: "Today" },
        { description: "Prepare custom pricing proposal", assignee: "Bob Smith", priority: "high", dueDate: "Tomorrow" },
        { description: "Schedule technical deep-dive with client IT team", assignee: "Bob Smith", priority: "medium", dueDate: "Next week" },
      ],
      decisions: [],
      aiModel: 'gpt-4',
      metadata: { sentiment: 0.85, topics: ['enterprise demo', 'AI transcription', 'security', 'data residency', 'SOC 2', 'SSO'] },
    },
  });

  // Meeting 4: TechStart Engineering Sprint Planning
  const meeting4 = await prisma.meeting.create({
    data: {
      title: 'Engineering Sprint Planning',
      description: 'Two-week sprint planning for engineering team',
      organizationId: org2.id,
      userId: admin2.id,
      workspaceId: workspace3.id,
      scheduledStartAt: new Date(yesterday.getTime() - 3 * 24 * 60 * 60 * 1000),
      scheduledEndAt: new Date(yesterday.getTime() - 3 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000),
      actualStartAt: new Date(yesterday.getTime() - 3 * 24 * 60 * 60 * 1000),
      actualEndAt: new Date(yesterday.getTime() - 3 * 24 * 60 * 60 * 1000 + 110 * 60 * 1000),
      status: MeetingStatus.completed,
      meetingUrl: 'https://teams.microsoft.com/l/meetup-join/xyz',
      platform: 'teams',
      recordingSource: RecordingSource.bot,
      metadata: { attendeeCount: 3, recordingSize: 290000000, duration: 6600, hasVideo: true, hasScreenShare: false },
    },
  });

  const sprintDate = new Date(yesterday.getTime() - 3 * 24 * 60 * 60 * 1000);
  await prisma.meetingParticipant.createMany({
    data: [
      { meetingId: meeting4.id, name: 'Sarah Chen', email: 'sarah@techstart.io', role: 'host', talkTimeSeconds: 2400, joinedAt: sprintDate },
      { meetingId: meeting4.id, name: 'David Lee', email: 'david@techstart.io', role: 'presenter', talkTimeSeconds: 1800, joinedAt: sprintDate },
      { meetingId: meeting4.id, name: 'Emma Brown', email: 'emma@techstart.io', role: 'participant', talkTimeSeconds: 1500, joinedAt: sprintDate },
    ],
  });

  const transcript4 = await prisma.transcript.create({
    data: { meetingId: meeting4.id, language: 'en', wordCount: 8500, confidenceScore: 0.93, isFinal: true },
  });

  const segments4 = [
    { id: '1', speaker: 'Sarah Chen', text: "Alright team, let's kick off our sprint planning. We have a lot to cover for the next two weeks.", startTime: 0, endTime: 12, confidence: 0.95 },
    { id: '2', speaker: 'Sarah Chen', text: "Our velocity last sprint was 42 points. I think we can commit to similar capacity this sprint.", startTime: 12, endTime: 25, confidence: 0.94 },
    { id: '3', speaker: 'David Lee', text: "The API refactoring work is carrying over. I'd estimate another 13 points to complete it.", startTime: 25, endTime: 38, confidence: 0.93 },
    { id: '4', speaker: 'Emma Brown', text: "I can pair with David on the API work. That should help accelerate it.", startTime: 38, endTime: 48, confidence: 0.95 },
    { id: '5', speaker: 'Sarah Chen', text: "Great. Emma, that's a good idea. What about the new authentication feature?", startTime: 48, endTime: 58, confidence: 0.94 },
    { id: '6', speaker: 'David Lee', text: "The auth feature is about 21 points. We should be able to complete the backend this sprint.", startTime: 58, endTime: 72, confidence: 0.93 },
    { id: '7', speaker: 'Emma Brown', text: "I'll handle the frontend integration after the API work is done. Maybe mid-sprint.", startTime: 72, endTime: 85, confidence: 0.94 },
    { id: '8', speaker: 'Sarah Chen', text: "Perfect. So we're looking at API refactoring plus auth backend, roughly 34 points. That leaves room for bugs.", startTime: 85, endTime: 100, confidence: 0.95 },
  ];

  const fullText4 = segments4.map(s => `${s.speaker}: ${s.text}`).join('\n\n');

  await prisma.transcriptContent.create({
    data: {
      transcriptId: transcript4.id,
      meetingId: meeting4.id,
      organizationId: org2.id,
      fullText: fullText4,
      segments: segments4,
      speakers: [
        { id: '1', name: 'Sarah Chen', talkTime: 2400 },
        { id: '2', name: 'David Lee', talkTime: 1800 },
        { id: '3', name: 'Emma Brown', talkTime: 1500 },
      ],
      language: 'en',
      wordCount: 8500,
      duration: 6600,
      speakerCount: 3,
    },
  });

  await prisma.meetingSummary.create({
    data: {
      meetingId: meeting4.id,
      transcriptId: transcript4.id,
      summaryType: 'general',
      title: 'Sprint Planning Summary',
      overview: "Sprint planning for the engineering team covering two-week capacity. Team velocity established at 42 points. Prioritized work includes completing API refactoring (13 points carryover) and new authentication feature backend (21 points). Emma will pair with David on API work, then handle frontend integration mid-sprint. Total committed: 34 points, leaving buffer for bug fixes.",
      keyPoints: [
        "Sprint velocity: 42 points from last sprint",
        "API refactoring carryover: 13 points remaining",
        "New authentication feature: 21 points for backend",
        "Pair programming planned for API work",
        "Total commitment: 34 points with buffer for bugs"
      ],
      actionItems: [
        { description: "Complete API refactoring", assignee: "David Lee", priority: "high", dueDate: "Mid-sprint" },
        { description: "Implement auth backend", assignee: "David Lee", priority: "high", dueDate: "End of sprint" },
        { description: "Frontend auth integration", assignee: "Emma Brown", priority: "medium", dueDate: "End of sprint" },
        { description: "Review and merge API changes", assignee: "Sarah Chen", priority: "medium", dueDate: "Mid-sprint" },
      ],
      decisions: ["Sprint capacity set at 34 points", "Pair programming approach for API work"],
      aiModel: 'gpt-4',
      metadata: { sentiment: 0.75, topics: ['sprint planning', 'API development', 'authentication', 'velocity', 'pair programming'] },
    },
  });

  // Comments
  console.log('💬 Creating comments...');
  await prisma.comment.createMany({
    data: [
      { meetingId: meeting1.id, userId: alice.id, content: 'Great progress on the win rate improvement! The new demo process is really paying off.', timestampSeconds: 45, createdAt: new Date(lastWeek.getTime() + 60 * 60 * 1000) },
      { meetingId: meeting1.id, userId: bob.id, content: 'We should discuss the enterprise sales cycle in more detail next meeting.', timestampSeconds: 72, createdAt: new Date(lastWeek.getTime() + 62 * 60 * 1000) },
      { meetingId: meeting2.id, userId: bob.id, content: 'The AI timeline is aggressive but achievable if we start immediately.', timestampSeconds: 68, createdAt: new Date(yesterday.getTime() + 95 * 60 * 1000) },
      { meetingId: meeting3.id, userId: carol.id, content: 'Client seemed very interested in the EU data residency option - this could be the key differentiator.', timestampSeconds: 110, createdAt: new Date(twoDaysAgo.getTime() + 50 * 60 * 1000) },
    ],
  });

  // Scheduled meetings (upcoming)
  console.log('📆 Creating scheduled meetings...');
  await prisma.meeting.create({
    data: {
      title: 'Weekly Team Standup',
      description: 'Regular team sync and updates',
      organizationId: org1.id,
      userId: admin1.id,
      workspaceId: workspace1.id,
      scheduledStartAt: tomorrow,
      scheduledEndAt: new Date(tomorrow.getTime() + 30 * 60 * 1000),
      status: MeetingStatus.scheduled,
      meetingUrl: 'https://zoom.us/j/111222333',
      platform: 'zoom',
      metadata: { isRecurring: true, recurrencePattern: 'weekly' },
    },
  });

  await prisma.meeting.create({
    data: {
      title: 'Board Meeting - Monthly Review',
      description: 'Monthly board meeting and financial review',
      organizationId: org1.id,
      userId: admin1.id,
      workspaceId: workspace2.id,
      scheduledStartAt: nextWeek,
      scheduledEndAt: new Date(nextWeek.getTime() + 120 * 60 * 1000),
      status: MeetingStatus.scheduled,
      meetingUrl: 'https://zoom.us/j/444555666',
      platform: 'zoom',
      metadata: { isConfidential: true },
    },
  });

  await prisma.meeting.create({
    data: {
      title: 'Customer Interview - User Research',
      description: 'Interview session for product research',
      organizationId: org2.id,
      userId: david.id,
      workspaceId: workspace3.id,
      scheduledStartAt: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000),
      scheduledEndAt: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      status: MeetingStatus.scheduled,
      meetingUrl: 'https://meet.google.com/user-research-123',
      platform: 'google_meet',
      metadata: { customerSegment: 'enterprise', researchType: 'feature_validation' },
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('   - Organizations: 3');
  console.log('   - Users: 8 (including 2 admins)');
  console.log('   - Workspaces: 3');
  console.log('   - Custom Templates: 3');
  console.log('   - Meetings: 7 (4 completed with full data, 3 scheduled)');
  console.log('   - Transcripts: 4 (with full segments)');
  console.log('   - AI Summaries: 4 (with action items)');
  console.log('   - Tasks: 3');
  console.log('   - Comments: 4');
  console.log('\n🔑 Test Credentials:');
  console.log('   Admin Accounts:');
  console.log('     - admin@acme.com (Acme Corporation - Business tier)');
  console.log('     - sarah@techstart.io (TechStart Inc - Pro tier)');
  console.log('   Regular Users:');
  console.log('     - alice@acme.com, bob@acme.com, carol@acme.com (Acme)');
  console.log('     - david@techstart.io, emma@techstart.io (TechStart)');
  console.log('     - freelancer@example.com (Free tier)');
  console.log('   Password (all users): Demo123456!');
  console.log('\n📋 Pre-built Templates: 10 available (sales, interview, standup, etc.)');
  console.log('   Custom Templates per org: Acme (2), TechStart (1)');
  console.log('\n🎯 Demo Features Ready:');
  console.log('   ✓ Meeting list with various statuses');
  console.log('   ✓ Transcript playback with segments');
  console.log('   ✓ AI summaries with key points');
  console.log('   ✓ Action items/tasks');
  console.log('   ✓ Template application');
  console.log('   ✓ Ask AI about meetings');
  console.log('   ✓ Multi-tenant isolation\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
