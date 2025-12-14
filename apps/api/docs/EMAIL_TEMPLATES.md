# Email Templates Database Implementation

## Overview

This implementation replaces the in-memory email template storage with a robust database-backed solution using PostgreSQL and Redis caching. All email sends are now logged to the database with comprehensive tracking of delivery status through SendGrid webhooks.

## Features Implemented

### 1. Database Email Template Storage
- ✅ **EmailTemplate Model**: Stores all email templates in PostgreSQL
- ✅ **Template Versioning**: Automatic versioning when templates are updated
- ✅ **Organization-specific Templates**: Support for custom templates per organization
- ✅ **Default Templates**: System-wide default templates with fallback logic
- ✅ **Template Variables**: JSON storage of Handlebars variables with validation

### 2. Database Email Logging
- ✅ **EmailLog Model**: Comprehensive logging of all email sends
- ✅ **Delivery Tracking**: Track sent, delivered, opened, clicked, bounced, failed statuses
- ✅ **SendGrid Webhook Integration**: Process real-time delivery updates
- ✅ **Metrics Tracking**: Open count, click count, unique clicks
- ✅ **Error Logging**: Capture and store send failures with error codes

### 3. Redis Caching
- ✅ **Template Caching**: 1-hour TTL cache for frequently used templates
- ✅ **Cache Invalidation**: Automatic cache clearing on template updates
- ✅ **Performance Optimization**: Reduced database queries for common templates

### 4. Handlebars Template Engine
- ✅ **Dynamic Templates**: Support for variables in templates
- ✅ **Custom Helpers**: formatDate, formatCurrency, if_eq helpers
- ✅ **HTML/Text Support**: Both HTML and plain text versions

### 5. API Endpoints

#### Email Template Management
- `GET /api/email-templates` - List all templates
- `GET /api/email-templates/:id` - Get specific template
- `POST /api/email-templates` - Create new template
- `PUT /api/email-templates/:id` - Update template (creates new version)
- `DELETE /api/email-templates/:id` - Soft delete template
- `POST /api/email-templates/:id/preview` - Preview template with sample data
- `POST /api/email-templates/:id/test` - Send test email
- `GET /api/email-templates/:id/stats` - Get template statistics
- `POST /api/email-templates/cache/clear` - Clear template cache

#### SendGrid Webhooks
- `POST /api/webhooks/sendgrid` - Process SendGrid webhook events
- `GET /api/webhooks/sendgrid/stats` - Get email statistics
- `GET /api/webhooks/sendgrid/health` - Health check

## Database Schema

### EmailTemplate
```sql
- id: UUID
- organizationId: Reference to Organization
- name: Template name
- type: EmailTemplateType enum
- subject: Email subject with variables
- htmlBody: HTML content with Handlebars
- textBody: Plain text content (optional)
- variables: JSON array of template variables
- isDefault: System default flag
- isActive: Active status
- version: Version number
- usageCount: Number of times used
- lastUsedAt: Last usage timestamp
```

### EmailLog
```sql
- id: UUID
- organizationId: Reference to Organization
- templateId: Reference to EmailTemplate
- to, from, cc, bcc, replyTo: Email addresses
- subject: Email subject
- status: EmailDeliveryStatus enum
- messageId: SendGrid message ID
- sentAt, deliveredAt, openedAt, clickedAt: Timestamps
- openCount, clickCount: Interaction metrics
- error, errorCode: Error information
- webhookEvents: Array of all webhook events
```

## Template Types

The following email template types are supported:

1. **welcome** - New user welcome email
2. **email_verification** - Email verification link
3. **password_reset** - Password reset link
4. **meeting_invitation** - Meeting invite
5. **meeting_summary** - Post-meeting summary
6. **meeting_recording_ready** - Recording availability notification
7. **subscription_confirmation** - Subscription confirmation
8. **team_invitation** - Team invite
9. **weekly_digest** - Weekly activity digest
10. **quota_warning** - Storage quota warning
11. **security_alert** - Security alerts
12. **custom** - Custom templates

## Usage Examples

### Sending an Email

```typescript
// Using convenience method
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  'org-123'
);

// Using template from database
const template = await emailService.getTemplateFromDatabase(
  EmailTemplateType.meeting_summary,
  {
    meetingTitle: 'Q4 Review',
    date: new Date(),
    duration: 60,
    keyPoints: ['Budget approved', 'Timeline set'],
    actionItems: ['Send report', 'Schedule follow-up'],
    transcriptUrl: 'https://app.example.com/transcript/123'
  },
  'org-123'
);

await emailService.sendEmail(template, {
  to: 'team@example.com',
  organizationId: 'org-123'
});
```

### Creating Custom Template

```typescript
await emailService.saveTemplate(
  EmailTemplateType.custom,
  {
    subject: 'Monthly Report for {{month}}',
    htmlBody: `
      <h1>Monthly Report</h1>
      <p>Here's your report for {{month}}:</p>
      <ul>
        {{#each metrics}}
        <li>{{name}}: {{value}}</li>
        {{/each}}
      </ul>
    `,
    variables: [
      { name: 'month', type: 'string', required: true },
      { name: 'metrics', type: 'array', required: true }
    ]
  },
  'org-123'
);
```

### Processing Webhook Events

SendGrid webhooks are automatically processed and update the email log:

```typescript
// Webhook event from SendGrid
{
  "event": "delivered",
  "sg_message_id": "msg_123",
  "timestamp": 1699999999,
  "email": "user@example.com"
}

// Automatically updates EmailLog status to 'delivered'
// and sets deliveredAt timestamp
```

## Environment Variables

```env
# SendGrid Configuration
SENDGRID_API_KEY=your-api-key
SENDGRID_WEBHOOK_VERIFICATION_KEY=your-webhook-key
FROM_EMAIL=noreply@example.com
SUPPORT_EMAIL=support@example.com

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=2

# Application
WEB_URL=https://app.example.com
APP_NAME=OpenMeet
```

## Migration Steps

1. Run the database migration:
```bash
npx prisma migrate dev --name add_email_models
```

2. Update environment variables with SendGrid and Redis configuration

3. Configure SendGrid webhook endpoint:
   - In SendGrid dashboard, set webhook URL to: `https://your-api.com/api/webhooks/sendgrid`
   - Enable events: processed, delivered, open, click, bounce, dropped, unsubscribe, spam report

4. Initialize default templates:
```bash
npm run seed:email-templates
```

## Testing

Run the test suite:
```bash
npm test -- email.test.ts
```

## Performance Considerations

1. **Template Caching**: Templates are cached for 1 hour in Redis
2. **Bulk Sending**: Processes emails in batches of 100 with 1-second delays
3. **Webhook Processing**: Async processing prevents blocking
4. **Database Indexes**: Optimized queries with proper indexing

## Security

1. **Webhook Verification**: Validates SendGrid signature
2. **Replay Attack Prevention**: Checks webhook timestamp
3. **Template Sanitization**: HTML is sanitized and CSS inlined
4. **Access Control**: Admin-only template management

## Monitoring

Track email performance through:
- Database queries on EmailLog table
- Redis cache hit/miss rates
- SendGrid webhook events
- Application logs with Winston

## Removed Code

The following in-memory implementations have been removed:
- Line 431: `// In production, these would be stored in a database or template engine`
- Line 616: `// In production, log to database`
- In-memory template storage in `getTemplate()` method
- Console.log based email event logging