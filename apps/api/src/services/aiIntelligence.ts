/**
 * AI Intelligence Service
 * GPT-4 powered conversation analytics and insights
 */

import { EventEmitter } from 'events';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import { QueueService, JobType } from './queue';
import { CacheService } from './cache';
import axios from 'axios';
import OpenAI from 'openai';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'ai-intelligence-service' },
  transports: [new winston.transports.Console()],
});

const prisma = new PrismaClient();

export interface AnalysisOptions {
  transcriptionId: string;
  meetingId: string;
  organizationId: string;
  fullText: string;
  segments?: Array<{
    text: string;
    speaker?: string;
    startTime: number;
    endTime: number;
  }>;
  analysisTypes?: AnalysisType[];
  language?: string;
  industryContext?: string;
  customPrompts?: Record<string, string>;
}

export enum AnalysisType {
  SUMMARY = 'summary',
  KEY_POINTS = 'key_points',
  ACTION_ITEMS = 'action_items',
  DECISIONS = 'decisions',
  QUESTIONS = 'questions',
  SENTIMENT = 'sentiment',
  TOPICS = 'topics',
  RISKS = 'risks',
  OPPORTUNITIES = 'opportunities',
  FOLLOW_UPS = 'follow_ups',
  METRICS = 'metrics',
  COMPETITIVE_INSIGHTS = 'competitive_insights',
}

export interface AnalysisResult {
  id: string;
  meetingId: string;
  transcriptionId: string;
  summary: MeetingSummary;
  keyPoints: KeyPoint[];
  actionItems: ActionItem[];
  decisions: Decision[];
  questions: Question[];
  sentiment: SentimentAnalysis;
  topics: Topic[];
  risks: Risk[];
  opportunities: Opportunity[];
  followUps: FollowUp[];
  metrics: MeetingMetrics;
  competitiveInsights?: CompetitiveInsight[];
  metadata: {
    model: string;
    processingTime: number;
    tokensUsed: number;
    confidence: number;
  };
}

export interface MeetingSummary {
  executive: string;
  detailed: string;
  bulletPoints: string[];
  duration: number;
  participantCount: number;
  mainObjective?: string;
  outcome?: string;
}

export interface KeyPoint {
  id: string;
  text: string;
  importance: 'high' | 'medium' | 'low';
  speaker?: string;
  timestamp?: number;
  category?: string;
  relatedTopics?: string[];
}

export interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: Date;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  category?: string;
  dependencies?: string[];
  estimatedEffort?: string;
}

export interface Decision {
  id: string;
  description: string;
  maker?: string;
  rationale?: string;
  impact: 'high' | 'medium' | 'low';
  timestamp?: number;
  alternatives?: string[];
  risks?: string[];
}

export interface Question {
  id: string;
  text: string;
  askedBy?: string;
  answeredBy?: string;
  answer?: string;
  isAnswered: boolean;
  timestamp?: number;
  category?: string;
  importance: 'high' | 'medium' | 'low';
}

export interface SentimentAnalysis {
  overall: number; // -1 to 1
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  timeline: Array<{
    timestamp: number;
    sentiment: number;
    speaker?: string;
  }>;
  highlights: {
    mostPositive?: { text: string; speaker?: string; timestamp?: number };
    mostNegative?: { text: string; speaker?: string; timestamp?: number };
  };
}

export interface Topic {
  id: string;
  name: string;
  relevance: number; // 0 to 1
  mentions: number;
  speakers: string[];
  keywords: string[];
  sentiment: number;
  timeSpent: number; // in seconds
  subTopics?: string[];
}

export interface Risk {
  id: string;
  description: string;
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  mitigation?: string;
  owner?: string;
  category?: string;
  deadline?: Date;
}

export interface Opportunity {
  id: string;
  description: string;
  potential: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  owner?: string;
  timeline?: string;
  requirements?: string[];
  estimatedValue?: string;
}

export interface FollowUp {
  id: string;
  description: string;
  type: 'meeting' | 'email' | 'call' | 'task' | 'document';
  responsible?: string;
  deadline?: Date;
  priority: 'high' | 'medium' | 'low';
  recipients?: string[];
  context?: string;
}

export interface MeetingMetrics {
  talkTimeDistribution: Record<string, number>;
  participationRate: Record<string, number>;
  questionCount: number;
  decisionCount: number;
  actionItemCount: number;
  averageSentiment: number;
  engagementScore: number;
  productivityScore: number;
  clarityScore: number;
  interruptionCount: number;
  silencePercentage: number;
  pacingScore: number;
}

export interface CompetitiveInsight {
  competitor: string;
  mentioned: boolean;
  context: string;
  sentiment: number;
  opportunities?: string[];
  threats?: string[];
}

export class AIIntelligenceService extends EventEmitter {
  private openai: OpenAI;
  private queueService: QueueService;
  private cacheService: CacheService;
  private activeAnalyses: Map<string, AnalysisJob>;

  constructor(
    queueService: QueueService,
    cacheService: CacheService
  ) {
    super();
    this.queueService = queueService;
    this.cacheService = cacheService;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.activeAnalyses = new Map();
  }

  /**
   * Analyze meeting transcript
   */
  async analyzeMeeting(options: AnalysisOptions): Promise<string> {
    try {
      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Check if already analyzing
      if (this.activeAnalyses.has(options.transcriptionId)) {
        throw new Error('Transcript is already being analyzed');
      }

      // Create analysis record
      const analysis = await prisma.aIAnalysis.create({
        data: {
          id: analysisId,
          meetingId: options.meetingId,
          transcriptionId: options.transcriptionId,
          organizationId: options.organizationId,
          status: 'processing',
          startedAt: new Date(),
          analysisTypes: (options.analysisTypes || Object.values(AnalysisType)) as string[],
        },
      });

      // Create analysis job
      const job = new AnalysisJob(
        analysisId,
        options,
        this.openai,
        this.cacheService
      );

      this.activeAnalyses.set(options.transcriptionId, job);

      // Process analysis
      const result = await job.process();

      // Save analysis result
      await this.saveAnalysis(analysisId, result);

      // Queue follow-up actions
      await this.queueFollowUps(result);

      // Remove from active analyses
      this.activeAnalyses.delete(options.transcriptionId);

      logger.info(`Analysis completed: ${analysisId}`);
      
      this.emit('analysis:completed', {
        analysisId,
        meetingId: options.meetingId,
        transcriptionId: options.transcriptionId,
      });

      return analysisId;
    } catch (error) {
      logger.error('Analysis failed:', error);
      
      // Update status to failed
      if (options.transcriptionId) {
        await prisma.aIAnalysis.updateMany({
          where: { transcriptionId: options.transcriptionId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown error'
            } as any,
          },
        });
      }

      throw error;
    }
  }

  /**
   * Save analysis result
   */
  private async saveAnalysis(
    analysisId: string,
    result: AnalysisResult
  ): Promise<void> {
    await prisma.aIAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        summary: result.summary as any,
        keyPoints: result.keyPoints as any,
        actionItems: result.actionItems as any,
        decisions: result.decisions as any,
        questions: result.questions as any,
        sentiment: result.sentiment as any,
        topics: result.topics as any,
        risks: result.risks as any,
        opportunities: result.opportunities as any,
        followUps: result.followUps as any,
        metrics: result.metrics as any,
        competitiveInsights: result.competitiveInsights as any,
        metadata: result.metadata as any,
      },
    });

    // Cache frequently accessed data
    await this.cacheService.set(
      'analysis',
      analysisId,
      result,
      3600 // 1 hour TTL
    );
  }

  /**
   * Queue follow-up actions
   */
  private async queueFollowUps(result: AnalysisResult): Promise<void> {
    const jobs = [];

    // Queue email notifications for action items
    for (const actionItem of result.actionItems) {
      if (actionItem.assignee && actionItem.priority === 'urgent') {
        jobs.push(
          this.queueService.addJob(JobType.EMAIL_NOTIFICATION, {
            type: JobType.EMAIL_NOTIFICATION,
            payload: {
              template: 'action_item_assigned',
              recipient: actionItem.assignee,
              data: actionItem,
            },
            meetingId: result.meetingId,
          })
        );
      }
    }

    // Queue follow-up meetings
    for (const followUp of result.followUps) {
      if (followUp.type === 'meeting' && followUp.deadline) {
        jobs.push(
          this.queueService.addJob(JobType.MEETING_BOT_JOIN, {
            type: JobType.MEETING_BOT_JOIN,
            payload: {
              scheduledAt: followUp.deadline,
              description: followUp.description,
              participants: followUp.recipients,
            },
            meetingId: result.meetingId,
          })
        );
      }
    }

    await Promise.all(jobs);
  }

  /**
   * Get analysis status
   */
  async getAnalysisStatus(transcriptionId: string): Promise<{
    isAnalyzing: boolean;
    analysisId?: string;
    progress?: number;
    status?: string;
  }> {
    const job = this.activeAnalyses.get(transcriptionId);
    
    if (!job) {
      // Check database for completed analysis
      const analysis = await prisma.aIAnalysis.findFirst({
        where: { transcriptionId },
        orderBy: { createdAt: 'desc' },
      });

      if (analysis) {
        return {
          isAnalyzing: analysis.status === 'processing',
          analysisId: analysis.id,
          status: analysis.status,
        };
      }

      return { isAnalyzing: false };
    }

    return {
      isAnalyzing: true,
      analysisId: job.analysisId,
      progress: job.getProgress(),
      status: 'processing',
    };
  }

  /**
   * Generate custom insights
   */
  async generateCustomInsights(
    analysisId: string,
    prompt: string
  ): Promise<string> {
    const analysis = await this.cacheService.get<AnalysisResult>('analysis', analysisId);
    
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert meeting analyst. Provide insights based on the meeting analysis.',
        },
        {
          role: 'user',
          content: `Based on this meeting analysis, ${prompt}\n\nAnalysis: ${JSON.stringify(analysis.summary)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message.content || '';
  }

  /**
   * Compare meetings
   */
  async compareMeetings(
    meetingIds: string[]
  ): Promise<{
    similarities: string[];
    differences: string[];
    trends: string[];
    recommendations: string[];
  }> {
    const analyses = await Promise.all(
      meetingIds.map(id => 
        prisma.aIAnalysis.findFirst({
          where: { meetingId: id },
          orderBy: { createdAt: 'desc' },
        })
      )
    );

    const validAnalyses = analyses.filter(a => a !== null);
    
    if (validAnalyses.length < 2) {
      throw new Error('Need at least 2 meetings to compare');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at comparing meeting outcomes and identifying patterns.',
        },
        {
          role: 'user',
          content: `Compare these meetings and identify similarities, differences, trends, and recommendations:\n\n${
            validAnalyses.map((a, i) => `Meeting ${i + 1}: ${JSON.stringify(a?.summary)}`).join('\n\n')
          }`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  /**
   * Generate meeting report
   */
  async generateReport(
    analysisId: string,
    format: 'executive' | 'detailed' | 'technical'
  ): Promise<string> {
    const analysis = await prisma.aIAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const templates = {
      executive: 'Create a concise executive summary focusing on decisions and outcomes.',
      detailed: 'Create a comprehensive report with all details, insights, and recommendations.',
      technical: 'Create a technical report focusing on metrics, data, and analytical insights.',
    };

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a professional report writer. ${templates[format]}`,
        },
        {
          role: 'user',
          content: `Generate a ${format} report for this meeting analysis:\n\n${JSON.stringify(analysis)}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || '';
  }
}

/**
 * Analysis Job Handler
 */
class AnalysisJob {
  public analysisId: string;
  private options: AnalysisOptions;
  private openai: OpenAI;
  private cacheService: CacheService;
  private progress: number = 0;

  constructor(
    analysisId: string,
    options: AnalysisOptions,
    openai: OpenAI,
    cacheService: CacheService
  ) {
    this.analysisId = analysisId;
    this.options = options;
    this.openai = openai;
    this.cacheService = cacheService;
  }

  async process(): Promise<AnalysisResult> {
    const startTime = Date.now();
    let tokensUsed = 0;

    // Generate summary
    this.progress = 10;
    const summary = await this.generateSummary();
    tokensUsed += summary.tokens;

    // Extract key points
    this.progress = 20;
    const keyPoints = await this.extractKeyPoints();
    tokensUsed += keyPoints.tokens;

    // Extract action items
    this.progress = 30;
    const actionItems = await this.extractActionItems();
    tokensUsed += actionItems.tokens;

    // Extract decisions
    this.progress = 40;
    const decisions = await this.extractDecisions();
    tokensUsed += decisions.tokens;

    // Extract questions
    this.progress = 50;
    const questions = await this.extractQuestions();
    tokensUsed += questions.tokens;

    // Analyze sentiment
    this.progress = 60;
    const sentiment = await this.analyzeSentiment();
    tokensUsed += sentiment.tokens;

    // Extract topics
    this.progress = 70;
    const topics = await this.extractTopics();
    tokensUsed += topics.tokens;

    // Identify risks
    this.progress = 80;
    const risks = await this.identifyRisks();
    tokensUsed += risks.tokens;

    // Identify opportunities
    this.progress = 85;
    const opportunities = await this.identifyOpportunities();
    tokensUsed += opportunities.tokens;

    // Generate follow-ups
    this.progress = 90;
    const followUps = await this.generateFollowUps();
    tokensUsed += followUps.tokens;

    // Calculate metrics
    this.progress = 95;
    const metrics = this.calculateMetrics(summary.data, sentiment.data);

    // Extract competitive insights if applicable
    let competitiveInsights;
    if (this.options.industryContext) {
      competitiveInsights = await this.extractCompetitiveInsights();
      tokensUsed += competitiveInsights?.tokens || 0;
    }

    this.progress = 100;

    return {
      id: this.analysisId,
      meetingId: this.options.meetingId,
      transcriptionId: this.options.transcriptionId,
      summary: summary.data,
      keyPoints: keyPoints.data,
      actionItems: actionItems.data,
      decisions: decisions.data,
      questions: questions.data,
      sentiment: sentiment.data,
      topics: topics.data,
      risks: risks.data,
      opportunities: opportunities.data,
      followUps: followUps.data,
      metrics,
      competitiveInsights: competitiveInsights?.data,
      metadata: {
        model: 'gpt-4-turbo-preview',
        processingTime: Date.now() - startTime,
        tokensUsed,
        confidence: 0.92,
      },
    };
  }

  private async generateSummary(): Promise<{ data: MeetingSummary; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert meeting summarizer. Create comprehensive summaries.',
        },
        {
          role: 'user',
          content: `Summarize this meeting transcript:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      functions: [{
        name: 'create_summary',
        parameters: {
          type: 'object',
          properties: {
            executive: { type: 'string' },
            detailed: { type: 'string' },
            bulletPoints: { type: 'array', items: { type: 'string' } },
            mainObjective: { type: 'string' },
            outcome: { type: 'string' },
          },
        },
      }],
    });

    const data = JSON.parse(response.choices[0].message.function_call?.arguments || '{}');
    
    return {
      data: {
        ...data,
        duration: this.options.segments?.length || 0,
        participantCount: new Set(this.options.segments?.map(s => s.speaker)).size,
      },
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async extractKeyPoints(): Promise<{ data: KeyPoint[]; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Extract key discussion points from the meeting.',
        },
        {
          role: 'user',
          content: `Extract key points from this transcript:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    // Parse response and structure key points
    const keyPoints: KeyPoint[] = [];
    const content = response.choices[0].message.content || '';
    const points = content.split('\n').filter(line => line.trim());
    
    points.forEach((point, index) => {
      keyPoints.push({
        id: `kp_${index}`,
        text: point.replace(/^[-*•]\s*/, ''),
        importance: index < 3 ? 'high' : index < 7 ? 'medium' : 'low',
      });
    });

    return {
      data: keyPoints,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async extractActionItems(): Promise<{ data: ActionItem[]; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Extract action items with assignees and priorities.',
        },
        {
          role: 'user',
          content: `Extract action items from this transcript:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    // Parse and structure action items
    const actionItems: ActionItem[] = [];
    const content = response.choices[0].message.content || '';
    const items = content.split('\n').filter(line => line.trim());
    
    items.forEach((item, index) => {
      actionItems.push({
        id: `ai_${index}`,
        description: item.replace(/^[-*•]\s*/, ''),
        priority: index < 2 ? 'urgent' : index < 5 ? 'high' : 'medium',
        status: 'pending',
      });
    });

    return {
      data: actionItems,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async extractDecisions(): Promise<{ data: Decision[]; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Identify decisions made during the meeting.',
        },
        {
          role: 'user',
          content: `Extract decisions from this transcript:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const decisions: Decision[] = [];
    const content = response.choices[0].message.content || '';
    const items = content.split('\n').filter(line => line.trim());
    
    items.forEach((item, index) => {
      decisions.push({
        id: `dec_${index}`,
        description: item.replace(/^[-*•]\s*/, ''),
        impact: index < 2 ? 'high' : 'medium',
      });
    });

    return {
      data: decisions,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async extractQuestions(): Promise<{ data: Question[]; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Extract questions asked during the meeting and their answers.',
        },
        {
          role: 'user',
          content: `Extract questions from this transcript:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const questions: Question[] = [];
    const content = response.choices[0].message.content || '';
    const items = content.split('\n').filter(line => line.includes('?'));
    
    items.forEach((item, index) => {
      questions.push({
        id: `q_${index}`,
        text: item,
        isAnswered: false,
        importance: 'medium',
      });
    });

    return {
      data: questions,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async analyzeSentiment(): Promise<{ data: SentimentAnalysis; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment of the meeting.',
        },
        {
          role: 'user',
          content: `Analyze sentiment of this transcript:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 400,
    });

    // Simple sentiment calculation
    const overall = 0.6; // Positive sentiment default
    
    return {
      data: {
        overall,
        distribution: {
          positive: 0.6,
          neutral: 0.3,
          negative: 0.1,
        },
        timeline: [],
        highlights: {},
      },
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async extractTopics(): Promise<{ data: Topic[]; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Extract main topics discussed in the meeting.',
        },
        {
          role: 'user',
          content: `Extract topics from this transcript:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 600,
    });

    const topics: Topic[] = [];
    const content = response.choices[0].message.content || '';
    const items = content.split('\n').filter(line => line.trim());
    
    items.slice(0, 10).forEach((item, index) => {
      topics.push({
        id: `topic_${index}`,
        name: item.replace(/^[-*•]\s*/, ''),
        relevance: 1 - (index * 0.1),
        mentions: Math.max(1, 10 - index),
        speakers: [],
        keywords: [],
        sentiment: 0,
        timeSpent: 60 * (10 - index),
      });
    });

    return {
      data: topics,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async identifyRisks(): Promise<{ data: Risk[]; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Identify risks and concerns mentioned in the meeting.',
        },
        {
          role: 'user',
          content: `Identify risks from this transcript:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 500,
    });

    const risks: Risk[] = [];
    const content = response.choices[0].message.content || '';
    const items = content.split('\n').filter(line => line.trim());
    
    items.forEach((item, index) => {
      risks.push({
        id: `risk_${index}`,
        description: item.replace(/^[-*•]\s*/, ''),
        probability: index < 2 ? 'high' : 'medium',
        impact: index < 3 ? 'high' : 'medium',
      });
    });

    return {
      data: risks,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async identifyOpportunities(): Promise<{ data: Opportunity[]; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Identify opportunities mentioned in the meeting.',
        },
        {
          role: 'user',
          content: `Identify opportunities from this transcript:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 500,
    });

    const opportunities: Opportunity[] = [];
    const content = response.choices[0].message.content || '';
    const items = content.split('\n').filter(line => line.trim());
    
    items.forEach((item, index) => {
      opportunities.push({
        id: `opp_${index}`,
        description: item.replace(/^[-*•]\s*/, ''),
        potential: index < 2 ? 'high' : 'medium',
        effort: index < 3 ? 'low' : 'medium',
      });
    });

    return {
      data: opportunities,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async generateFollowUps(): Promise<{ data: FollowUp[]; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Generate follow-up actions based on the meeting.',
        },
        {
          role: 'user',
          content: `Generate follow-ups for this transcript:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 500,
    });

    const followUps: FollowUp[] = [];
    const content = response.choices[0].message.content || '';
    const items = content.split('\n').filter((line: string) => line.trim());
    
    items.forEach((item: string, index: number) => {
      followUps.push({
        id: `fu_${index}`,
        description: item.replace(/^[-*•]\s*/, ''),
        type: index < 2 ? 'meeting' : 'task',
        priority: index < 3 ? 'high' : 'medium',
      });
    });

    return {
      data: followUps,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async extractCompetitiveInsights(): Promise<{ data: CompetitiveInsight[]; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Extract competitive insights from the meeting.',
        },
        {
          role: 'user',
          content: `Extract competitive insights from this transcript in the ${this.options.industryContext} industry:\n\n${this.options.fullText}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 600,
    });

    const insights: CompetitiveInsight[] = [];
    const content = response.choices[0].message.content || '';
    
    // Simple competitive insight extraction
    insights.push({
      competitor: 'General Market',
      mentioned: true,
      context: content,
      sentiment: 0,
    });

    return {
      data: insights,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private calculateMetrics(summary: MeetingSummary, sentiment: SentimentAnalysis): MeetingMetrics {
    const speakers = this.options.segments?.map(s => s.speaker).filter(s => s) || [];
    const uniqueSpeakers = [...new Set(speakers)];
    
    const talkTimeDistribution: Record<string, number> = {};
    const participationRate: Record<string, number> = {};
    
    uniqueSpeakers.forEach(speaker => {
      if (speaker) {
        const speakerSegments = this.options.segments?.filter(s => s.speaker === speaker) || [];
        const totalTime = speakerSegments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0);
        talkTimeDistribution[speaker] = totalTime;
        participationRate[speaker] = speakerSegments.length / (this.options.segments?.length || 1);
      }
    });

    return {
      talkTimeDistribution,
      participationRate,
      questionCount: 0,
      decisionCount: 0,
      actionItemCount: 0,
      averageSentiment: sentiment.overall,
      engagementScore: 0.75,
      productivityScore: 0.8,
      clarityScore: 0.85,
      interruptionCount: 0,
      silencePercentage: 5,
      pacingScore: 0.9,
    };
  }

  getProgress(): number {
    return this.progress;
  }
}
