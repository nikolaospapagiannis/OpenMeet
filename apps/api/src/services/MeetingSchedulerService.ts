/**
 * Meeting Scheduler Service
 *
 * Built-in meeting scheduling with smart time finding
 * Competitive Feature: Avoma Meeting Scheduler + Calendly-like functionality
 *
 * Features:
 * - Smart time slot suggestions
 * - Booking page generation
 * - Calendar integration
 * - Automatic reminders
 * - Buffer time management
 * - Team scheduling (round-robin, collective)
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { googleCalendarService } from './GoogleCalendarService';
import { EmailService } from './email';

const prisma = new PrismaClient();
const emailService = new EmailService();

export interface SchedulingLink {
  id: string;
  slug: string; // e.g., "john-doe/30-min-demo"
  userId: string;
  organizationId: string;
  title: string;
  description?: string;
  duration: number; // minutes
  bufferTime: number; // minutes before/after
  availability: AvailabilityRules;
  customQuestions?: CustomQuestion[];
  confirmationMessage?: string;
  redirectUrl?: string;
  isActive: boolean;
  bookingCount: number;
  createdAt: Date;
}

export interface AvailabilityRules {
  timezone: string;
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  timeSlots: TimeSlot[];
  minNotice: number; // hours
  maxAdvanceBooking: number; // days
  excludeDates: string[]; // ISO dates to exclude
}

export interface TimeSlot {
  day: number; // 0-6
  startTime: string; // "09:00"
  endTime: string; // "17:00"
}

export interface CustomQuestion {
  id: string;
  question: string;
  type: 'text' | 'email' | 'phone' | 'select';
  required: boolean;
  options?: string[]; // for select type
}

export interface BookingRequest {
  schedulingLinkId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  selectedTime: Date;
  timezone: string;
  customAnswers?: Record<string, string>;
  notes?: string;
}

export interface Booking {
  id: string;
  schedulingLinkId: string;
  meetingId?: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  scheduledTime: Date;
  timezone: string;
  duration: number;
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'completed';
  customAnswers?: Record<string, string>;
  notes?: string;
  confirmationToken: string;
  reminderSentAt?: Date;
  createdAt: Date;
}

class MeetingSchedulerService {
  /**
   * Create scheduling link
   */
  async createSchedulingLink(
    userId: string,
    organizationId: string,
    data: {
      title: string;
      slug: string;
      description?: string;
      duration: number;
      bufferTime?: number;
      availability: AvailabilityRules;
      customQuestions?: CustomQuestion[];
      confirmationMessage?: string;
      redirectUrl?: string;
    }
  ): Promise<SchedulingLink> {
    try {
      // Validate slug uniqueness
      const existing = await prisma.schedulingLink.findFirst({
        where: { slug: data.slug },
      });

      if (existing) {
        throw new Error('Slug already exists');
      }

      const link = await prisma.schedulingLink.create({
        data: {
          id: `link_${Date.now()}`,
          slug: data.slug,
          userId,
          organizationId,
          title: data.title,
          description: data.description,
          duration: data.duration,
          bufferTime: data.bufferTime || 0,
          availability: data.availability as any,
          customQuestions: data.customQuestions as any,
          confirmationMessage: data.confirmationMessage,
          redirectUrl: data.redirectUrl,
          isActive: true,
          bookingCount: 0,
        },
      });

      logger.info('Scheduling link created', { linkId: link.id, slug: link.slug });

      return link as any;
    } catch (error) {
      logger.error('Error creating scheduling link', { error });
      throw error;
    }
  }

  /**
   * Get available time slots for booking
   */
  async getAvailableSlots(
    schedulingLinkId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Date[]> {
    try {
      const link = await prisma.schedulingLink.findUnique({
        where: { id: schedulingLinkId },
      });

      if (!link || !link.isActive) {
        throw new Error('Scheduling link not found or inactive');
      }

      const availability = link.availability as any;
      const slots: Date[] = [];

      // Generate potential slots based on availability rules
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        const dayOfWeek = current.getDay();

        // Check if this day is available
        if (availability.daysOfWeek.includes(dayOfWeek)) {
          // Find time slots for this day
          const daySlots = availability.timeSlots.filter(
            (ts: TimeSlot) => ts.day === dayOfWeek
          );

          for (const timeSlot of daySlots) {
            const [startHour, startMin] = timeSlot.startTime.split(':').map(Number);
            const [endHour, endMin] = timeSlot.endTime.split(':').map(Number);

            // Generate slots in 15-minute increments
            for (let hour = startHour; hour < endHour; hour++) {
              for (let min = 0; min < 60; min += 15) {
                if (hour === endHour && min >= endMin) break;

                const slotTime = new Date(current);
                slotTime.setHours(hour, min, 0, 0);

                // Check min notice
                const minNoticeMs = availability.minNotice * 60 * 60 * 1000;
                if (slotTime.getTime() < Date.now() + minNoticeMs) {
                  continue;
                }

                // Check max advance booking
                const maxAdvanceMs = availability.maxAdvanceBooking * 24 * 60 * 60 * 1000;
                if (slotTime.getTime() > Date.now() + maxAdvanceMs) {
                  continue;
                }

                // Check if slot accommodates duration + buffer
                const slotEnd = new Date(slotTime.getTime() + (link.duration + link.bufferTime * 2) * 60 * 1000);
                const slotEndHour = slotEnd.getHours();
                const slotEndMin = slotEnd.getMinutes();

                if (slotEndHour > endHour || (slotEndHour === endHour && slotEndMin > endMin)) {
                  continue;
                }

                slots.push(new Date(slotTime));
              }
            }
          }
        }

        // Move to next day
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
      }

      // Filter out booked slots
      const availableSlots = await this.filterBookedSlots(
        link.userId,
        slots,
        link.duration + link.bufferTime * 2
      );

      logger.info('Available slots calculated', {
        linkId: schedulingLinkId,
        totalSlots: availableSlots.length
      });

      return availableSlots;
    } catch (error) {
      logger.error('Error getting available slots', { error });
      throw error;
    }
  }

  /**
   * Filter out slots that conflict with existing bookings
   */
  private async filterBookedSlots(
    userId: string,
    slots: Date[],
    duration: number
  ): Promise<Date[]> {
    try {
      // Get existing bookings
      const existingBookings = await prisma.booking.findMany({
        where: {
          schedulingLink: { userId },
          status: { in: ['confirmed', 'rescheduled'] },
          scheduledTime: {
            gte: new Date(Math.min(...slots.map(s => s.getTime()))),
            lte: new Date(Math.max(...slots.map(s => s.getTime())) + duration * 60 * 1000),
          },
        },
      });

      // Also check Google Calendar for conflicts
      let calendarBusyTimes: Array<{ start: Date; end: Date }> = [];
      try {
        const busyTimesMap = await googleCalendarService.getBusyTimesByEmail(
          userId,
          [userId],
          slots[0],
          new Date(slots[slots.length - 1].getTime() + 24 * 60 * 60 * 1000)
        );
        calendarBusyTimes = busyTimesMap.get(userId) || [];
      } catch (error) {
        logger.warn('Could not fetch calendar busy times', { error });
      }

      // Filter slots
      return slots.filter(slot => {
        const slotEnd = new Date(slot.getTime() + duration * 60 * 1000);

        // Check against existing bookings
        const hasBookingConflict = existingBookings.some(booking => {
          const bookingEnd = new Date(
            booking.scheduledTime.getTime() + booking.duration * 60 * 1000
          );
          return (
            (slot >= booking.scheduledTime && slot < bookingEnd) ||
            (slotEnd > booking.scheduledTime && slotEnd <= bookingEnd) ||
            (slot <= booking.scheduledTime && slotEnd >= bookingEnd)
          );
        });

        // Check against calendar busy times
        const hasCalendarConflict = calendarBusyTimes.some(busy => {
          return (
            (slot >= busy.start && slot < busy.end) ||
            (slotEnd > busy.start && slotEnd <= busy.end) ||
            (slot <= busy.start && slotEnd >= busy.end)
          );
        });

        return !hasBookingConflict && !hasCalendarConflict;
      });
    } catch (error) {
      logger.error('Error filtering booked slots', { error });
      return slots; // Return all slots on error
    }
  }

  /**
   * Create booking
   */
  async createBooking(request: BookingRequest): Promise<Booking> {
    try {
      const link = await prisma.schedulingLink.findUnique({
        where: { id: request.schedulingLinkId },
      });

      if (!link || !link.isActive) {
        throw new Error('Scheduling link not found or inactive');
      }

      // Verify time slot is available
      const availableSlots = await this.getAvailableSlots(
        request.schedulingLinkId,
        new Date(request.selectedTime.getTime() - 60 * 60 * 1000), // 1 hour before
        new Date(request.selectedTime.getTime() + 60 * 60 * 1000)  // 1 hour after
      );

      const isAvailable = availableSlots.some(
        slot => Math.abs(slot.getTime() - request.selectedTime.getTime()) < 1000
      );

      if (!isAvailable) {
        throw new Error('Selected time slot is no longer available');
      }

      // Generate confirmation token
      const confirmationToken = `conf_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

      // Create meeting
      const meeting = await prisma.meeting.create({
        data: {
          title: link.title,
          description: link.description,
          scheduledStartAt: request.selectedTime,
          durationSeconds: link.duration * 60,
          status: 'scheduled',
          organization: { connect: { id: link.organizationId } },
          user: { connect: { id: link.userId } },
          createdBy: link.userId,
        },
      });

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          id: `booking_${Date.now()}`,
          schedulingLinkId: request.schedulingLinkId,
          meetingId: meeting.id,
          attendeeName: request.attendeeName,
          attendeeEmail: request.attendeeEmail,
          attendeePhone: request.attendeePhone,
          scheduledTime: request.selectedTime,
          timezone: request.timezone,
          duration: link.duration,
          status: 'confirmed',
          customAnswers: request.customAnswers as any,
          notes: request.notes,
          confirmationToken,
        },
      });

      // Update booking count
      await prisma.schedulingLink.update({
        where: { id: request.schedulingLinkId },
        data: { bookingCount: { increment: 1 } },
      });

      // Send confirmation email
      await this.sendConfirmationEmail(booking as any, link as any);

      // Create Google Calendar event
      try {
        await googleCalendarService.createEvent(link.userId, {
          summary: link.title,
          description: link.description,
          start: request.selectedTime,
          end: new Date(request.selectedTime.getTime() + link.duration * 60 * 1000),
          attendees: [request.attendeeEmail],
        });
      } catch (error) {
        logger.warn('Could not create calendar event', { error });
      }

      logger.info('Booking created', { bookingId: booking.id, meetingId: meeting.id });

      return booking as any;
    } catch (error) {
      logger.error('Error creating booking', { error });
      throw error;
    }
  }

  /**
   * Send confirmation email
   */
  private async sendConfirmationEmail(booking: Booking, link: SchedulingLink): Promise<void> {
    try {
      const subject = `Meeting Confirmed: ${link.title}`;
      const message = link.confirmationMessage || `
Your meeting has been confirmed!

Meeting: ${link.title}
When: ${booking.scheduledTime.toLocaleString()}
Duration: ${booking.duration} minutes

${link.description || ''}

To reschedule or cancel, visit:
${process.env.FRONTEND_URL}/booking/${booking.confirmationToken}
`;

      await emailService.sendEmail(
        {
          subject,
          htmlContent: `<p>${message.replace(/\n/g, '<br>')}</p>`,
          textContent: message,
        },
        {
          to: booking.attendeeEmail,
        }
      );

      logger.info('Confirmation email sent', { bookingId: booking.id });
    } catch (error) {
      logger.error('Error sending confirmation email', { error });
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(confirmationToken: string, reason?: string): Promise<void> {
    try {
      const booking = await prisma.booking.findFirst({
        where: { confirmationToken },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Update booking status
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled' },
      });

      // Update meeting status
      if (booking.meetingId) {
        await prisma.meeting.update({
          where: { id: booking.meetingId },
          data: { status: 'cancelled' },
        });
      }

      logger.info('Booking cancelled', { bookingId: booking.id, reason });
    } catch (error) {
      logger.error('Error cancelling booking', { error });
      throw error;
    }
  }

  /**
   * Get upcoming bookings
   */
  async getUpcomingBookings(userId: string, limit: number = 50): Promise<Booking[]> {
    try {
      const bookings = await prisma.booking.findMany({
        where: {
          schedulingLink: { userId },
          scheduledTime: { gte: new Date() },
          status: { in: ['confirmed', 'rescheduled'] },
        },
        orderBy: { scheduledTime: 'asc' },
        take: limit,
      });

      return bookings as any[];
    } catch (error) {
      logger.error('Error getting upcoming bookings', { error });
      return [];
    }
  }

  /**
   * Get scheduling link statistics
   */
  async getLinkStats(schedulingLinkId: string): Promise<{
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    averageBookingsPerWeek: number;
    mostPopularTimeSlots: Array<{ time: string; count: number }>;
  }> {
    try {
      const bookings = await prisma.booking.findMany({
        where: { schedulingLinkId },
      });

      const totalBookings = bookings.length;
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
      const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

      // Calculate average bookings per week
      const oldestBooking = bookings[0]?.createdAt;
      const weeksSinceCreation = oldestBooking
        ? Math.max(1, (Date.now() - oldestBooking.getTime()) / (7 * 24 * 60 * 60 * 1000))
        : 1;
      const averageBookingsPerWeek = Math.round(totalBookings / weeksSinceCreation);

      // Find most popular time slots (by hour)
      const timeSlotCounts: Record<string, number> = {};
      bookings.forEach(booking => {
        const hour = booking.scheduledTime.getHours();
        const timeKey = `${hour.toString().padStart(2, '0')}:00`;
        timeSlotCounts[timeKey] = (timeSlotCounts[timeKey] || 0) + 1;
      });

      const mostPopularTimeSlots = Object.entries(timeSlotCounts)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        averageBookingsPerWeek,
        mostPopularTimeSlots,
      };
    } catch (error) {
      logger.error('Error getting link stats', { error });
      throw error;
    }
  }

  /**
   * Send pre-meeting reminder
   * Automatically sends reminders before scheduled meetings
   */
  async sendPreMeetingReminder(
    bookingId: string,
    hoursBeforeMeeting: number = 24
  ): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { schedulingLink: true },
      });

      if (!booking || !booking.schedulingLink) {
        throw new Error('Booking not found');
      }

      if (booking.status !== 'confirmed' && booking.status !== 'rescheduled') {
        logger.info('Skipping reminder for non-confirmed booking', { bookingId });
        return;
      }

      const link = booking.schedulingLink;
      const meetingTime = new Date(booking.scheduledTime);
      const now = new Date();
      const hoursUntilMeeting = (meetingTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if it's time to send the reminder
      if (hoursUntilMeeting > hoursBeforeMeeting || hoursUntilMeeting < 0) {
        logger.info('Not time for reminder yet', {
          bookingId,
          hoursUntilMeeting,
          hoursBeforeMeeting
        });
        return;
      }

      // Check if reminder already sent
      if (booking.reminderSentAt) {
        logger.info('Reminder already sent', { bookingId });
        return;
      }

      const subject = `Reminder: Meeting in ${Math.round(hoursUntilMeeting)} hours`;
      const message = `
Hi ${booking.attendeeName},

This is a friendly reminder about your upcoming meeting:

Meeting: ${link.title}
When: ${meetingTime.toLocaleString()}
Duration: ${booking.duration} minutes

${link.description || ''}

${booking.notes ? `Notes: ${booking.notes}` : ''}

To reschedule or cancel, visit:
${process.env.FRONTEND_URL}/booking/${booking.confirmationToken}

We look forward to speaking with you!
`;

      await emailService.sendEmail(
        {
          subject,
          htmlContent: `<p>${message.replace(/\n/g, '<br>')}</p>`,
          textContent: message,
        },
        {
          to: booking.attendeeEmail,
        }
      );

      // Update booking to mark reminder as sent
      await prisma.booking.update({
        where: { id: bookingId },
        data: { reminderSentAt: new Date() },
      });

      logger.info('Pre-meeting reminder sent', {
        bookingId,
        hoursBeforeMeeting: Math.round(hoursUntilMeeting)
      });
    } catch (error) {
      logger.error('Error sending pre-meeting reminder', { error, bookingId });
    }
  }

  /**
   * Process all upcoming bookings that need reminders
   * This should be called by a scheduled job (e.g., every hour)
   */
  async processUpcomingReminders(hoursBeforeMeeting: number = 24): Promise<number> {
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + (hoursBeforeMeeting + 1) * 60 * 60 * 1000);

      const bookings = await prisma.booking.findMany({
        where: {
          status: { in: ['confirmed', 'rescheduled'] },
          scheduledTime: {
            gte: startTime,
            lte: endTime,
          },
          reminderSentAt: null,
        },
      });

      logger.info('Processing upcoming reminders', {
        count: bookings.length,
        hoursBeforeMeeting
      });

      let sentCount = 0;

      for (const booking of bookings) {
        try {
          await this.sendPreMeetingReminder(booking.id, hoursBeforeMeeting);
          sentCount++;
        } catch (error) {
          logger.error('Error processing reminder for booking', {
            error,
            bookingId: booking.id
          });
        }
      }

      logger.info('Finished processing reminders', {
        total: bookings.length,
        sent: sentCount
      });

      return sentCount;
    } catch (error) {
      logger.error('Error processing upcoming reminders', { error });
      return 0;
    }
  }

  /**
   * Send custom reminder with custom message
   */
  async sendCustomReminder(
    bookingId: string,
    subject: string,
    message: string
  ): Promise<void> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      await emailService.sendEmail(
        {
          subject,
          htmlContent: `<p>${message.replace(/\n/g, '<br>')}</p>`,
          textContent: message,
        },
        {
          to: booking.attendeeEmail,
        }
      );

      logger.info('Custom reminder sent', { bookingId });
    } catch (error) {
      logger.error('Error sending custom reminder', { error, bookingId });
      throw error;
    }
  }

  /**
   * Configure reminder settings for a scheduling link
   */
  async configureReminders(
    schedulingLinkId: string,
    settings: {
      enableReminders?: boolean;
      reminderHours?: number[]; // e.g., [24, 1] for 24h and 1h before
      customReminderMessage?: string;
    }
  ): Promise<void> {
    try {
      const link = await prisma.schedulingLink.findUnique({
        where: { id: schedulingLinkId },
      });

      if (!link) {
        throw new Error('Scheduling link not found');
      }

      // Store reminder settings in Organization.settings
      const org = await prisma.organization.findUnique({
        where: { id: link.organizationId },
      });

      const orgSettings = (org?.settings as any) || {};
      const schedulingLinkSettings = orgSettings.schedulingLinkSettings || {};
      schedulingLinkSettings[schedulingLinkId] = {
        reminderSettings: {
          enabled: settings.enableReminders ?? true,
          reminderHours: settings.reminderHours ?? [24, 1],
          customMessage: settings.customReminderMessage,
        },
      };
      orgSettings.schedulingLinkSettings = schedulingLinkSettings;

      await prisma.organization.update({
        where: { id: link.organizationId },
        data: { settings: orgSettings as any },
      });

      logger.info('Reminder settings configured', { schedulingLinkId });
    } catch (error) {
      logger.error('Error configuring reminders', { error, schedulingLinkId });
      throw error;
    }
  }

  /**
   * Get reminder settings for a scheduling link
   */
  async getReminderSettings(schedulingLinkId: string): Promise<{
    enabled: boolean;
    reminderHours: number[];
    customMessage?: string;
  }> {
    try {
      const link = await prisma.schedulingLink.findUnique({
        where: { id: schedulingLinkId },
      });

      if (!link) {
        throw new Error('Scheduling link not found');
      }

      // Get reminder settings from Organization.settings
      const org = await prisma.organization.findUnique({
        where: { id: link.organizationId },
      });

      const orgSettings = (org?.settings as any) || {};
      const schedulingLinkSettings = orgSettings.schedulingLinkSettings || {};
      const linkSettings = schedulingLinkSettings[schedulingLinkId] || {};
      const reminderSettings = linkSettings.reminderSettings || {
        enabled: true,
        reminderHours: [24],
      };

      return reminderSettings;
    } catch (error) {
      logger.error('Error getting reminder settings', { error, schedulingLinkId });
      return {
        enabled: true,
        reminderHours: [24],
      };
    }
  }
}

export const meetingSchedulerService = new MeetingSchedulerService();
