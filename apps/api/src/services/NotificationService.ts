/**
 * Notification Service (Stub)
 *
 * This is a stub implementation to satisfy TypeScript.
 * Replace with actual implementation when needed.
 */

interface EmailOptions {
  to: string[];
  subject: string;
  template: string;
  data: any;
}

interface SlackOptions {
  channel: string;
  blocks: any[];
  attachments?: any[];
}

interface TeamsOptions {
  channel: string;
  card: any;
}

class NotificationService {
  async sendEmail(options: EmailOptions): Promise<void> {
    console.log('Sending email:', options);
  }

  async sendToSlack(options: SlackOptions): Promise<void> {
    console.log('Sending to Slack:', options);
  }

  async sendToTeams(options: TeamsOptions): Promise<void> {
    console.log('Sending to Teams:', options);
  }
}

export const notificationService = new NotificationService();
