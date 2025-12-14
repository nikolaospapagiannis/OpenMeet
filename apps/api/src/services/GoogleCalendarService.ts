/**
 * Google Calendar Integration Service
 * Handles calendar availability, event creation, and scheduling
 */

import { google, calendar_v3 } from 'googleapis';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

const prisma = new PrismaClient();

export interface CalendarBusyTime {
  start: Date;
  end: Date;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  attendees?: string[];
}

export class GoogleCalendarService {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI || 'http://localhost:4000/api/workflows/calendar/callback'
    );
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // Pass user ID in state for callback
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      logger.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Set user credentials
   */
  private async setUserCredentials(userId: string): Promise<void> {
    try {
      // Fetch user's Google Calendar integration from database
      const integration = await prisma.integration.findFirst({
        where: {
          userId,
          type: 'google_calendar',
          isActive: true,
        },
      });

      if (!integration) {
        throw new Error('Google Calendar integration not found for user');
      }

      // Decrypt tokens (assuming they're stored encrypted)
      const accessToken = integration.accessToken;
      const refreshToken = integration.refreshToken;
      const expiryDate = integration.expiresAt ? integration.expiresAt.getTime() : undefined;

      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: expiryDate,
      });

      // Handle token refresh
      this.oauth2Client.on('tokens', async (tokens: any) => {
        if (tokens.refresh_token) {
          // Update refresh token in database
          await prisma.integration.update({
            where: { id: integration.id },
            data: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            },
          });
        } else if (tokens.access_token) {
          // Update access token only
          await prisma.integration.update({
            where: { id: integration.id },
            data: {
              accessToken: tokens.access_token,
              expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            },
          });
        }
      });
    } catch (error) {
      logger.error('Error setting user credentials:', error);
      throw error;
    }
  }

  /**
   * Get user's busy times (free/busy query)
   */
  async getUserBusyTimes(
    userId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<CalendarBusyTime[]> {
    try {
      await this.setUserCredentials(userId);

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: 'primary' }], // Primary calendar
        },
      });

      const busyTimes: CalendarBusyTime[] = [];

      const calendars = response.data.calendars;
      if (calendars && calendars['primary']) {
        const busy = calendars['primary'].busy || [];

        busy.forEach((period: any) => {
          if (period.start && period.end) {
            busyTimes.push({
              start: new Date(period.start),
              end: new Date(period.end),
            });
          }
        });
      }

      logger.info('Fetched busy times for user', {
        userId,
        busyPeriods: busyTimes.length,
      });

      return busyTimes;
    } catch (error) {
      logger.error('Error fetching busy times:', error);
      throw error;
    }
  }

  /**
   * Get busy times for multiple users
   */
  async getMultiUserBusyTimes(
    userIds: string[],
    timeMin: Date,
    timeMax: Date
  ): Promise<Map<string, CalendarBusyTime[]>> {
    const busyTimesMap = new Map<string, CalendarBusyTime[]>();

    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const busyTimes = await this.getUserBusyTimes(userId, timeMin, timeMax);
          busyTimesMap.set(userId, busyTimes);
        } catch (error) {
          logger.warn(`Could not fetch busy times for user ${userId}:`, error);
          // If calendar integration not available, assume no busy times
          busyTimesMap.set(userId, []);
        }
      })
    );

    return busyTimesMap;
  }

  /**
   * Get busy times by email (for external attendees)
   * Note: This requires calendar access for those emails
   */
  async getBusyTimesByEmail(
    organizerUserId: string,
    emails: string[],
    timeMin: Date,
    timeMax: Date
  ): Promise<Map<string, CalendarBusyTime[]>> {
    try {
      await this.setUserCredentials(organizerUserId);

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: emails.map(email => ({ id: email })),
        },
      });

      const busyTimesMap = new Map<string, CalendarBusyTime[]>();

      const calendars = response.data.calendars;
      if (calendars) {
        emails.forEach(email => {
          const busyTimes: CalendarBusyTime[] = [];

          if (calendars[email]) {
            const busy = calendars[email].busy || [];

            busy.forEach((period: any) => {
              if (period.start && period.end) {
                busyTimes.push({
                  start: new Date(period.start),
                  end: new Date(period.end),
                });
              }
            });
          }

          busyTimesMap.set(email, busyTimes);
        });
      }

      logger.info('Fetched busy times for emails', {
        emails: emails.length,
        totalBusyPeriods: Array.from(busyTimesMap.values()).reduce((sum, times) => sum + times.length, 0),
      });

      return busyTimesMap;
    } catch (error) {
      logger.error('Error fetching busy times by email:', error);
      // Return empty busy times for all emails on error
      const emptyMap = new Map<string, CalendarBusyTime[]>();
      emails.forEach(email => emptyMap.set(email, []));
      return emptyMap;
    }
  }

  /**
   * Create calendar event
   */
  async createEvent(
    userId: string,
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      attendees?: string[];
      location?: string;
    }
  ): Promise<CalendarEvent> {
    try {
      await this.setUserCredentials(userId);

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: {
            dateTime: event.start.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: 'UTC',
          },
          attendees: event.attendees?.map(email => ({ email })),
          reminders: {
            useDefault: true,
          },
        },
      });

      const createdEvent = response.data;

      logger.info('Calendar event created', {
        userId,
        eventId: createdEvent.id,
        summary: event.summary,
      });

      return {
        id: createdEvent.id!,
        summary: createdEvent.summary!,
        start: new Date(createdEvent.start!.dateTime!),
        end: new Date(createdEvent.end!.dateTime!),
        attendees: event.attendees,
      };
    } catch (error) {
      logger.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  async updateEvent(
    userId: string,
    eventId: string,
    updates: {
      summary?: string;
      description?: string;
      start?: Date;
      end?: Date;
      attendees?: string[];
    }
  ): Promise<void> {
    try {
      await this.setUserCredentials(userId);

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const requestBody: any = {};

      if (updates.summary) requestBody.summary = updates.summary;
      if (updates.description) requestBody.description = updates.description;
      if (updates.start) {
        requestBody.start = {
          dateTime: updates.start.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (updates.end) {
        requestBody.end = {
          dateTime: updates.end.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (updates.attendees) {
        requestBody.attendees = updates.attendees.map(email => ({ email }));
      }

      await calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody,
      });

      logger.info('Calendar event updated', { userId, eventId });
    } catch (error) {
      logger.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      await this.setUserCredentials(userId);

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });

      logger.info('Calendar event deleted', { userId, eventId });
    } catch (error) {
      logger.error('Error deleting calendar event:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
