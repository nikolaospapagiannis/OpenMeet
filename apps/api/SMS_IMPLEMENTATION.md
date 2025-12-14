# SMS Service - Real Implementation Documentation

## Overview
This document outlines the REAL database logging and Twilio pricing API integration implemented for the SMS service.

## Implemented Features

### 1. Real Database Logging
- **SMSLog Model**: Comprehensive logging of all SMS messages
  - Tracks sent/received messages with full metadata
  - Stores message status, cost, delivery timestamps
  - Records error codes and messages for failed deliveries
  - Links to organization and user for usage tracking

### 2. Real Twilio Pricing API
- **Live Pricing Lookup**: Real-time cost calculation using Twilio Pricing API v2
  - Fetches country-specific SMS rates
  - Caches pricing data in Redis (24-hour TTL)
  - Stores pricing in database for offline access
  - Automatic fallback to default pricing on API failure

### 3. User Phone Number Lookup
- **Database Integration**: Queries user phone numbers from database
  - Looks up phone numbers stored in user metadata JSON field
  - Supports bulk lookups for batch operations
  - Maps phone numbers to user IDs for tracking

### 4. Redis Caching Layer
- **Performance Optimization**: Multi-level caching strategy
  - Redis cache for frequently accessed pricing data
  - Database cache for longer-term storage
  - Automatic cache invalidation after 24 hours

## Database Schema

### SMSLog Table
```sql
- id: UUID primary key
- organizationId: Links to organization
- userId: Links to user
- to/from: Phone numbers
- message: Truncated content (privacy)
- messageId: Twilio SID
- status: pending/sent/delivered/failed
- segments: Number of SMS parts
- cost: Actual cost in USD
- countryCode: Destination country
- errorCode/errorMessage: Failure details
- deliveredAt/failedAt: Timestamps
```

### SMSTemplate Table
```sql
- id: UUID primary key
- organizationId: Organization scope
- name: Template identifier
- type: Template category
- content: Message template with variables
- variables: Required variable list
- isActive: Enable/disable flag
- usageCount: Usage statistics
```

### SMSPricing Table
```sql
- id: UUID primary key
- countryCode: ISO country code
- countryName: Full country name
- pricePerSms: Cost per message
- currency: Pricing currency
- fetchedAt: When price was fetched
- expiresAt: Cache expiration
```

## API Methods

### Core SMS Functions

#### sendSMS(message, options)
- Sends SMS with full tracking
- Calculates real-time pricing
- Logs to database before and after sending
- Updates organization usage metrics
- Handles batch recipients

#### sendBulkSMS(message, recipients, options)
- Batch processing with rate limiting
- Tracks individual success/failure
- Calculates total cost
- Returns detailed statistics

#### getRealTimePricing(phoneNumber)
- Multi-level caching (Redis → Database → API)
- Uses Twilio Lookups API for country detection
- Uses Twilio Pricing API v2 for rates
- Automatic fallback on failure

### User Management

#### getUserPhoneNumber(userId)
- Queries user table for phone number
- Checks metadata JSON field
- Returns formatted phone number

#### getUsersByPhoneNumbers(phoneNumbers[])
- Bulk user lookup by phone numbers
- Returns Map of phone → userId
- Optimized for batch operations

### Webhook Handlers

#### handleStatusWebhook(data)
- Updates SMS status from Twilio callbacks
- Records delivery timestamps
- Captures actual costs
- Logs error details for failures

#### handleIncomingSMS(data)
- Logs inbound messages to database
- Processes STOP/unsubscribe requests
- Handles HELP requests
- Supports custom keyword processing

### Reporting & Analytics

#### getDeliveryReport(startDate, endDate, organizationId)
- Queries SMS logs for date range
- Returns detailed delivery statistics
- Includes cost and error information

#### getUsageStatistics(organizationId, startDate, endDate)
- Comprehensive usage analytics
- Total sent/delivered/failed counts
- Cost breakdown by country
- Aggregated statistics

## Webhook Routes

### POST /api/webhooks/sms/status
- Receives Twilio status callbacks
- Validates webhook signature
- Updates message status in database

### POST /api/webhooks/sms/incoming
- Handles incoming SMS messages
- Validates Twilio signature
- Processes keywords (STOP, HELP)
- Returns TwiML response

### POST /api/webhooks/sms/optout
- Handles opt-out notifications
- Updates user preferences
- Sends confirmation message

## Configuration

### Environment Variables
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional_password
DATABASE_URL=postgresql://...
WEB_URL=https://your-domain.com
```

### Twilio Console Setup
1. Configure webhook URLs in Twilio console:
   - Status Callback: `https://your-domain.com/api/webhooks/sms/status`
   - Incoming Message: `https://your-domain.com/api/webhooks/sms/incoming`
2. Enable webhook signature validation
3. Set up phone number capabilities

## Usage Tracking

### Organization Metrics
- Monthly SMS count tracking
- Cost aggregation by period
- Stored in UsageMetric table
- Used for billing and quotas

### Cost Calculation
1. Pre-send: Estimate cost using pricing API
2. Post-send: Update with actual Twilio cost
3. Store both estimate and actual for reconciliation

## Security Features

### Webhook Validation
- Validates Twilio signature on all webhooks
- Rejects unsigned requests in production
- Logs suspicious activity

### Privacy Protection
- Messages truncated to 160 chars in logs
- Phone numbers formatted to E.164
- User preferences for opt-out respected

## Migration Steps

1. Run Prisma migration:
```bash
npx prisma migrate deploy
```

2. Generate Prisma client:
```bash
npx prisma generate
```

3. Configure environment variables

4. Set up Twilio webhook URLs

5. Test with health check:
```javascript
const smsService = new SmsService();
const healthy = await smsService.healthCheck();
```

## Error Handling

### Graceful Degradation
- Service works without Twilio credentials (logs only)
- Falls back to default pricing on API failure
- Continues operation if Redis unavailable

### Error Logging
- All errors logged with Winston
- Failed messages tracked in database
- Webhook failures recorded

## Performance Optimizations

### Caching Strategy
1. Redis: Hot data (24-hour TTL)
2. Database: Warm data (30-day TTL)
3. API: Cold data (real-time fetch)

### Batch Processing
- Bulk SMS sent in batches of 10
- Rate limiting between batches
- Parallel processing with Promise.allSettled

### Database Indexes
- organizationId: Usage queries
- userId: User lookups
- status: Delivery reports
- createdAt: Time-based queries
- messageId: Status updates

## Monitoring

### Health Check
```javascript
// Validates:
// - Twilio API connection
// - Database connection
// - Redis connection
const healthy = await smsService.healthCheck();
```

### Metrics Available
- Total messages sent
- Delivery success rate
- Average cost per message
- Messages by country
- Failed message reasons

## Removed Placeholder Code

All placeholder implementations have been replaced:

❌ **REMOVED**: `// This would be implemented based on your user model`
✅ **REPLACED**: Real database queries using Prisma

❌ **REMOVED**: `// In production, log to database`
✅ **REPLACED**: Full database logging with SMSLog model

❌ **REMOVED**: `// Default pricing (would be fetched from Twilio pricing API)`
✅ **REPLACED**: Live Twilio Pricing API v2 integration

## Testing

### Unit Tests Required
- SMS sending with mocked Twilio
- Database logging verification
- Pricing calculation accuracy
- User lookup functionality

### Integration Tests Required
- Webhook signature validation
- End-to-end SMS delivery
- Database transaction integrity
- Redis caching behavior

## Future Enhancements

### Planned Features
- SMS template management UI
- Advanced analytics dashboard
- Multi-language support
- Custom sender ID management
- MMS (multimedia) support
- International number formatting
- Delivery time optimization
- A/B testing for templates