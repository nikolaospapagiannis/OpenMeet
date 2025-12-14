/**
 * Live Collaboration Service
 *
 * Implements GAP #5: Real-time Live Features
 * - Live reactions during meetings
 * - Real-time Q&A
 * - Live collaborative notes
 * - In-meeting polls
 * - Raise hand / attention requests
 *
 * Competitive Feature: Matches Zoom + Slack-like real-time interaction
 * Our advantage: Integrated with AI transcript analysis
 */

import { PrismaClient } from '@prisma/client';
import { WebSocket, WebSocketServer } from 'ws';
import { logger } from '../utils/logger';
import { Server } from 'http';

const prisma = new PrismaClient();

export interface LiveReaction {
  id: string;
  meetingId: string;
  userId: string;
  userName: string;
  type: '👍' | '❤️' | '😂' | '🎉' | '🤔' | '👏' | '🔥';
  timestamp: number;
  transcriptTimestamp?: number; // Link to specific moment in transcript
}

export interface LiveQuestion {
  id: string;
  meetingId: string;
  userId: string;
  userName: string;
  question: string;
  timestamp: number;
  upvotes: number;
  answered: boolean;
  answer?: string;
  answeredBy?: string;
  answeredAt?: number;
}

export interface LiveNote {
  id: string;
  meetingId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  lastEditedAt: number;
  collaborators: string[]; // User IDs who contributed
}

export interface LivePoll {
  id: string;
  meetingId: string;
  createdBy: string;
  question: string;
  options: string[];
  votes: Record<string, string>; // userId -> optionIndex
  createdAt: number;
  closedAt?: number;
}

export interface AttentionRequest {
  id: string;
  meetingId: string;
  userId: string;
  userName: string;
  type: 'hand_raised' | 'speak_request' | 'technical_issue' | 'break_request';
  message?: string;
  timestamp: number;
  acknowledged: boolean;
}

interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  meetingId: string;
  userName: string;
}

class LiveCollaborationService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient[]> = new Map(); // meetingId -> clients[]
  private reactions: Map<string, LiveReaction[]> = new Map(); // meetingId -> reactions[]
  private questions: Map<string, LiveQuestion[]> = new Map(); // meetingId -> questions[]
  private notes: Map<string, LiveNote[]> = new Map(); // meetingId -> notes[]
  private polls: Map<string, LivePoll[]> = new Map(); // meetingId -> polls[]
  private attentionRequests: Map<string, AttentionRequest[]> = new Map(); // meetingId -> requests[]

  /**
   * Initialize WebSocket server for real-time communication
   */
  initializeWebSocket(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws/live' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      logger.info('WebSocket connection established');

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          logger.error('Error handling WebSocket message', { error });
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error });
      });
    });

    logger.info('Live collaboration WebSocket server initialized');
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(ws: WebSocket, message: any): void {
    const { type, payload } = message;

    switch (type) {
      case 'join_meeting':
        this.handleJoinMeeting(ws, payload);
        break;
      case 'send_reaction':
        this.handleReaction(payload);
        break;
      case 'ask_question':
        this.handleQuestion(payload);
        break;
      case 'upvote_question':
        this.handleUpvoteQuestion(payload);
        break;
      case 'answer_question':
        this.handleAnswerQuestion(payload);
        break;
      case 'update_note':
        this.handleNoteUpdate(payload);
        break;
      case 'create_poll':
        this.handleCreatePoll(payload);
        break;
      case 'vote_poll':
        this.handlePollVote(payload);
        break;
      case 'raise_hand':
        this.handleAttentionRequest(payload);
        break;
      case 'acknowledge_attention':
        this.handleAcknowledgeAttention(payload);
        break;
      default:
        logger.warn('Unknown message type', { type });
    }
  }

  /**
   * Handle user joining a meeting
   */
  private handleJoinMeeting(ws: WebSocket, payload: { meetingId: string; userId: string; userName: string }): void {
    const { meetingId, userId, userName } = payload;

    const client: WebSocketClient = { ws, userId, meetingId, userName };

    if (!this.clients.has(meetingId)) {
      this.clients.set(meetingId, []);
    }
    this.clients.get(meetingId)!.push(client);

    // Send current state to new client
    ws.send(JSON.stringify({
      type: 'initial_state',
      payload: {
        reactions: this.reactions.get(meetingId) || [],
        questions: this.questions.get(meetingId) || [],
        notes: this.notes.get(meetingId) || [],
        polls: this.polls.get(meetingId) || [],
        attentionRequests: this.attentionRequests.get(meetingId) || [],
      },
    }));

    // Broadcast user joined
    this.broadcastToMeeting(meetingId, {
      type: 'user_joined',
      payload: { userId, userName },
    });

    logger.info('User joined meeting', { meetingId, userId, userName });
  }

  /**
   * Handle user disconnecting
   */
  private handleDisconnect(ws: WebSocket): void {
    for (const [meetingId, clients] of this.clients.entries()) {
      const index = clients.findIndex(c => c.ws === ws);
      if (index !== -1) {
        const client = clients[index];
        clients.splice(index, 1);

        this.broadcastToMeeting(meetingId, {
          type: 'user_left',
          payload: { userId: client.userId, userName: client.userName },
        });

        logger.info('User left meeting', { meetingId, userId: client.userId });
        break;
      }
    }
  }

  /**
   * Handle live reaction
   */
  private async handleReaction(payload: Omit<LiveReaction, 'id' | 'timestamp'>): Promise<void> {
    const reaction: LiveReaction = {
      id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...payload,
      timestamp: Date.now(),
    };

    if (!this.reactions.has(payload.meetingId)) {
      this.reactions.set(payload.meetingId, []);
    }
    this.reactions.get(payload.meetingId)!.push(reaction);

    // Broadcast to all meeting participants
    this.broadcastToMeeting(payload.meetingId, {
      type: 'new_reaction',
      payload: reaction,
    });

    // Store in database using LiveSession
    const liveSession = await prisma.liveSession.findFirst({
      where: { meetingId: payload.meetingId, status: 'active' },
    });

    if (liveSession) {
      prisma.liveReaction.create({
        data: {
          id: reaction.id,
          liveSessionId: liveSession.id,
          userId: reaction.userId,
          userName: reaction.userName,
          emoji: reaction.type,
          timestampSeconds: reaction.transcriptTimestamp || reaction.timestamp / 1000,
        },
      }).catch(error => logger.error('Error storing reaction', { error }));
    }

    logger.info('Live reaction sent', { reaction });
  }

  /**
   * Handle question asked
   */
  private async handleQuestion(payload: Omit<LiveQuestion, 'id' | 'timestamp' | 'upvotes' | 'answered'>): Promise<void> {
    const question: LiveQuestion = {
      id: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...payload,
      timestamp: Date.now(),
      upvotes: 0,
      answered: false,
    };

    if (!this.questions.has(payload.meetingId)) {
      this.questions.set(payload.meetingId, []);
    }
    this.questions.get(payload.meetingId)!.push(question);

    this.broadcastToMeeting(payload.meetingId, {
      type: 'new_question',
      payload: question,
    });

    // Store in database using LiveBookmark
    const liveSession = await prisma.liveSession.findFirst({
      where: { meetingId: payload.meetingId, status: 'active' },
    });

    if (liveSession) {
      prisma.liveBookmark.create({
        data: {
          id: question.id,
          liveSessionId: liveSession.id,
          meetingId: question.meetingId,
          userId: question.userId,
          type: 'question',
          title: question.question,
          timestampSeconds: question.timestamp / 1000,
          metadata: {
            userName: question.userName,
            upvotes: 0,
            answered: false,
          } as any,
        },
      }).catch(error => logger.error('Error storing question', { error }));
    }

    logger.info('Live question asked', { question });
  }

  /**
   * Handle question upvote
   */
  private handleUpvoteQuestion(payload: { meetingId: string; questionId: string; userId: string }): void {
    const questions = this.questions.get(payload.meetingId) || [];
    const question = questions.find(q => q.id === payload.questionId);

    if (question) {
      question.upvotes++;

      this.broadcastToMeeting(payload.meetingId, {
        type: 'question_upvoted',
        payload: { questionId: question.id, upvotes: question.upvotes },
      });

      // Update database
      prisma.liveBookmark.update({
        where: { id: question.id },
        data: {
          metadata: {
            upvotes: question.upvotes,
          } as any,
        },
      }).catch(error => logger.error('Error updating question upvotes', { error }));
    }
  }

  /**
   * Handle question answered
   */
  private handleAnswerQuestion(payload: { meetingId: string; questionId: string; answer: string; answeredBy: string }): void {
    const questions = this.questions.get(payload.meetingId) || [];
    const question = questions.find(q => q.id === payload.questionId);

    if (question) {
      question.answered = true;
      question.answer = payload.answer;
      question.answeredBy = payload.answeredBy;
      question.answeredAt = Date.now();

      this.broadcastToMeeting(payload.meetingId, {
        type: 'question_answered',
        payload: question,
      });

      // Update database
      prisma.liveBookmark.update({
        where: { id: question.id },
        data: {
          description: payload.answer,
          metadata: {
            answered: true,
            answeredBy: payload.answeredBy,
            answeredAt: new Date(),
          } as any,
        },
      }).catch(error => logger.error('Error updating answered question', { error }));
    }
  }

  /**
   * Handle collaborative note update
   */
  private handleNoteUpdate(payload: Omit<LiveNote, 'id' | 'timestamp' | 'lastEditedAt' | 'collaborators'>): void {
    const notes = this.notes.get(payload.meetingId) || [];
    let note = notes.find(n => n.userId === payload.userId);

    if (!note) {
      note = {
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...payload,
        timestamp: Date.now(),
        lastEditedAt: Date.now(),
        collaborators: [payload.userId],
      };
      notes.push(note);
      this.notes.set(payload.meetingId, notes);
    } else {
      note.content = payload.content;
      note.lastEditedAt = Date.now();
    }

    this.broadcastToMeeting(payload.meetingId, {
      type: 'note_updated',
      payload: note,
    });

    // Store in database using Comment model for notes
    prisma.comment.upsert({
      where: { id: note.id },
      create: {
        id: note.id,
        meetingId: note.meetingId,
        userId: note.userId,
        content: note.content,
        metadata: {
          type: 'live_note',
          userName: note.userName,
          timestamp: note.timestamp,
          lastEditedAt: note.lastEditedAt,
          collaborators: note.collaborators,
        } as any,
      },
      update: {
        content: note.content,
        metadata: {
          lastEditedAt: note.lastEditedAt,
        } as any,
      },
    }).catch(error => logger.error('Error storing note', { error }));

    logger.info('Live note updated', { noteId: note.id });
  }

  /**
   * Handle poll creation
   */
  private async handleCreatePoll(payload: Omit<LivePoll, 'id' | 'votes' | 'createdAt'>): Promise<void> {
    const poll: LivePoll = {
      id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...payload,
      votes: {},
      createdAt: Date.now(),
    };

    if (!this.polls.has(payload.meetingId)) {
      this.polls.set(payload.meetingId, []);
    }
    this.polls.get(payload.meetingId)!.push(poll);

    this.broadcastToMeeting(payload.meetingId, {
      type: 'new_poll',
      payload: poll,
    });

    // Store in database using LiveBookmark
    const liveSession = await prisma.liveSession.findFirst({
      where: { meetingId: payload.meetingId, status: 'active' },
    });

    if (liveSession) {
      prisma.liveBookmark.create({
        data: {
          id: poll.id,
          liveSessionId: liveSession.id,
          meetingId: payload.meetingId,
          userId: poll.createdBy,
          type: 'manual',
          title: poll.question,
          timestampSeconds: poll.createdAt / 1000,
          metadata: {
            type: 'poll',
            options: poll.options,
            votes: {},
          } as any,
        },
      }).catch(error => logger.error('Error storing poll', { error }));
    }

    logger.info('Live poll created', { poll });
  }

  /**
   * Handle poll vote
   */
  private handlePollVote(payload: { meetingId: string; pollId: string; userId: string; optionIndex: string }): void {
    const polls = this.polls.get(payload.meetingId) || [];
    const poll = polls.find(p => p.id === payload.pollId);

    if (poll) {
      poll.votes[payload.userId] = payload.optionIndex;

      this.broadcastToMeeting(payload.meetingId, {
        type: 'poll_vote',
        payload: { pollId: poll.id, votes: poll.votes },
      });

      // Update database
      prisma.liveBookmark.update({
        where: { id: poll.id },
        data: {
          metadata: {
            votes: poll.votes,
          } as any,
        },
      }).catch(error => logger.error('Error storing poll vote', { error }));
    }
  }

  /**
   * Handle attention request (raise hand, etc.)
   */
  private async handleAttentionRequest(payload: Omit<AttentionRequest, 'id' | 'timestamp' | 'acknowledged'>): Promise<void> {
    const request: AttentionRequest = {
      id: `attention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...payload,
      timestamp: Date.now(),
      acknowledged: false,
    };

    if (!this.attentionRequests.has(payload.meetingId)) {
      this.attentionRequests.set(payload.meetingId, []);
    }
    this.attentionRequests.get(payload.meetingId)!.push(request);

    this.broadcastToMeeting(payload.meetingId, {
      type: 'attention_request',
      payload: request,
    });

    // Store in database using LiveBookmark
    const liveSession = await prisma.liveSession.findFirst({
      where: { meetingId: payload.meetingId, status: 'active' },
    });

    if (liveSession) {
      prisma.liveBookmark.create({
        data: {
          id: request.id,
          liveSessionId: liveSession.id,
          meetingId: request.meetingId,
          userId: request.userId,
          type: 'manual',
          title: request.type,
          description: request.message,
          timestampSeconds: request.timestamp / 1000,
          metadata: {
            type: 'attention_request',
            requestType: request.type,
            userName: request.userName,
            acknowledged: false,
          } as any,
        },
      }).catch(error => logger.error('Error storing attention request', { error }));
    }

    logger.info('Attention request raised', { request });
  }

  /**
   * Handle attention request acknowledgment
   */
  private handleAcknowledgeAttention(payload: { meetingId: string; requestId: string }): void {
    const requests = this.attentionRequests.get(payload.meetingId) || [];
    const request = requests.find(r => r.id === payload.requestId);

    if (request) {
      request.acknowledged = true;

      this.broadcastToMeeting(payload.meetingId, {
        type: 'attention_acknowledged',
        payload: { requestId: request.id },
      });

      // Update database
      prisma.liveBookmark.update({
        where: { id: request.id },
        data: {
          metadata: {
            acknowledged: true,
          } as any,
        },
      }).catch(error => logger.error('Error acknowledging attention request', { error }));
    }
  }

  /**
   * Broadcast message to all clients in a meeting
   */
  private broadcastToMeeting(meetingId: string, message: any): void {
    const clients = this.clients.get(meetingId) || [];
    const messageStr = JSON.stringify(message);

    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * Get live stats for a meeting
   */
  async getLiveStats(meetingId: string): Promise<{
    activeUsers: number;
    totalReactions: number;
    unansweredQuestions: number;
    activePolls: number;
    attentionRequests: number;
  }> {
    const clients = this.clients.get(meetingId) || [];
    const reactions = this.reactions.get(meetingId) || [];
    const questions = this.questions.get(meetingId) || [];
    const polls = this.polls.get(meetingId) || [];
    const requests = this.attentionRequests.get(meetingId) || [];

    return {
      activeUsers: clients.length,
      totalReactions: reactions.length,
      unansweredQuestions: questions.filter(q => !q.answered).length,
      activePolls: polls.filter(p => !p.closedAt).length,
      attentionRequests: requests.filter(r => !r.acknowledged).length,
    };
  }

  /**
   * End meeting and clean up
   */
  async endMeeting(meetingId: string): Promise<void> {
    // Broadcast meeting ended
    this.broadcastToMeeting(meetingId, {
      type: 'meeting_ended',
      payload: { meetingId },
    });

    // Close all client connections
    const clients = this.clients.get(meetingId) || [];
    clients.forEach(client => client.ws.close());

    // Clean up in-memory data
    this.clients.delete(meetingId);
    this.reactions.delete(meetingId);
    this.questions.delete(meetingId);
    this.notes.delete(meetingId);
    this.polls.delete(meetingId);
    this.attentionRequests.delete(meetingId);

    logger.info('Meeting ended and cleaned up', { meetingId });
  }
}

export const liveCollaborationService = new LiveCollaborationService();
