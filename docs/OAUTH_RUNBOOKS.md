# OAuth Integration Runbooks

Complete step-by-step guides for setting up OAuth credentials for all supported integrations in OpenMeet.ai.

---

## Table of Contents

1. [Google (Google Meet & Calendar)](#1-google-google-meet--calendar)
2. [Microsoft (Teams & Calendar)](#2-microsoft-teams--calendar)
3. [Zoom](#3-zoom)
4. [Slack](#4-slack)
5. [Salesforce](#5-salesforce)
6. [HubSpot](#6-hubspot)
7. [Stripe (Payments)](#7-stripe-payments)
8. [SendGrid (Email)](#8-sendgrid-email)
9. [OpenAI (AI Services)](#9-openai-ai-services)
10. [Environment Configuration](#10-environment-configuration)

---

## 1. Google (Google Meet & Calendar)

### Prerequisites
- Google Cloud Console account
- Verified domain (for production)

### Step-by-Step Setup

1. **Go to Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **Create a New Project**
   - Click "Select a project" dropdown
   - Click "New Project"
   - Name: `openmeet-prod` (or `openmeet-dev` for development)
   - Click "Create"

3. **Enable Required APIs**
   Navigate to APIs & Services > Library and enable:
   - Google Calendar API
   - Google Drive API
   - Google Meet API (if available)
   - Google People API

4. **Configure OAuth Consent Screen**
   - Go to APIs & Services > OAuth consent screen
   - Select "External" (or "Internal" for G Suite)
   - Fill in required fields:
     - App name: `OpenMeet.ai`
     - User support email: `support@yourdomain.com`
     - Developer contact: `dev@yourdomain.com`
   - Add scopes:
     ```
     https://www.googleapis.com/auth/calendar
     https://www.googleapis.com/auth/calendar.events
     https://www.googleapis.com/auth/drive.file
     ```

5. **Create OAuth 2.0 Credentials**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: `OpenMeet Web Client`
   - Authorized JavaScript origins:
     ```
     http://localhost:3000 (development)
     https://yourdomain.com (production)
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:4000/api/integrations/oauth/meet/callback (development)
     https://api.yourdomain.com/api/integrations/oauth/meet/callback (production)
     ```
   - Click "Create"

6. **Save Credentials**
   - Copy the Client ID and Client Secret
   - Add to `.env`:
     ```env
     GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
     GOOGLE_CLIENT_SECRET=your-client-secret
     ```

### Verification (Production)
For production, submit your app for verification:
1. Go to OAuth consent screen
2. Click "Publish App"
3. Submit verification request with:
   - Privacy policy URL
   - Terms of service URL
   - Authorized domains

---

## 2. Microsoft (Teams & Calendar)

### Prerequisites
- Azure Active Directory account
- Microsoft 365 subscription (for Teams)

### Step-by-Step Setup

1. **Go to Azure Portal**
   ```
   https://portal.azure.com/
   ```

2. **Navigate to Azure Active Directory**
   - Search for "Azure Active Directory"
   - Click "App registrations"

3. **Register New Application**
   - Click "New registration"
   - Name: `OpenMeet.ai`
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI:
     ```
     Web: http://localhost:4000/api/integrations/oauth/teams/callback
     ```
   - Click "Register"

4. **Configure API Permissions**
   - Go to "API permissions"
   - Click "Add a permission"
   - Select "Microsoft Graph"
   - Add Delegated permissions:
     ```
     OnlineMeetings.ReadWrite
     Calendars.ReadWrite
     User.Read
     offline_access
     ```
   - Click "Grant admin consent" (if admin)

5. **Create Client Secret**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: `OpenMeet Production`
   - Expires: Select appropriate duration
   - Click "Add"
   - **IMPORTANT**: Copy the secret value immediately (shown only once)

6. **Get Application IDs**
   - Go to "Overview"
   - Copy:
     - Application (client) ID
     - Directory (tenant) ID

7. **Save Credentials**
   ```env
   MICROSOFT_CLIENT_ID=your-application-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   MICROSOFT_TENANT_ID=common  # or specific tenant ID
   TEAMS_CLIENT_ID=your-application-id
   TEAMS_CLIENT_SECRET=your-client-secret
   ```

### Teams-Specific Setup
For Teams Bot integration:
1. Go to https://dev.teams.microsoft.com/
2. Register your bot
3. Get additional Bot ID and password

---

## 3. Zoom

### Prerequisites
- Zoom Developer account
- Zoom Pro or higher (for some features)

### Step-by-Step Setup

1. **Go to Zoom Marketplace**
   ```
   https://marketplace.zoom.us/
   ```

2. **Create an App**
   - Click "Develop" > "Build App"
   - Select "OAuth" app type
   - Click "Create"

3. **Fill App Information**
   - App Name: `OpenMeet.ai`
   - Company Name: Your company name
   - Developer Contact:
     - Name: Your name
     - Email: dev@yourdomain.com

4. **Configure OAuth Settings**
   - Redirect URL for OAuth:
     ```
     http://localhost:4000/api/integrations/oauth/zoom/callback (development)
     https://api.yourdomain.com/api/integrations/oauth/zoom/callback (production)
     ```
   - Add Allow List:
     ```
     http://localhost:4000
     https://api.yourdomain.com
     ```

5. **Set Scopes**
   Add the following scopes:
   ```
   meeting:read
   meeting:write
   user:read
   recording:read
   ```

6. **Get Credentials**
   - Go to "App Credentials"
   - Copy Client ID and Client Secret

7. **Save Credentials**
   ```env
   ZOOM_CLIENT_ID=your-zoom-client-id
   ZOOM_CLIENT_SECRET=your-zoom-client-secret
   ```

### Webhook Setup (Optional)
For real-time meeting events:
1. Go to "Feature" > "Event Subscriptions"
2. Add Event Subscription:
   - Subscription URL: `https://api.yourdomain.com/webhooks/zoom`
   - Events: `meeting.started`, `meeting.ended`, `recording.completed`
3. Copy Verification Token and Secret Token

---

## 4. Slack

### Prerequisites
- Slack workspace admin access

### Step-by-Step Setup

1. **Go to Slack API**
   ```
   https://api.slack.com/apps
   ```

2. **Create New App**
   - Click "Create New App"
   - Select "From scratch"
   - App Name: `OpenMeet.ai`
   - Pick a workspace: Select your development workspace
   - Click "Create App"

3. **Configure OAuth & Permissions**
   - Go to "OAuth & Permissions"
   - Add Redirect URLs:
     ```
     http://localhost:4000/api/integrations/oauth/slack/callback (development)
     https://api.yourdomain.com/api/integrations/oauth/slack/callback (production)
     ```

4. **Add Bot Token Scopes**
   Scroll to "Scopes" and add:
   ```
   channels:read
   channels:join
   chat:write
   users:read
   team:read
   ```

5. **Add User Token Scopes** (if needed)
   ```
   identity.basic
   identity.email
   ```

6. **Install App to Workspace**
   - Go to "Install App"
   - Click "Install to Workspace"
   - Authorize the app

7. **Get Credentials**
   - Go to "Basic Information"
   - Copy:
     - Client ID
     - Client Secret
     - Signing Secret (for webhooks)

8. **Save Credentials**
   ```env
   SLACK_CLIENT_ID=your-slack-client-id
   SLACK_CLIENT_SECRET=your-slack-client-secret
   SLACK_SIGNING_SECRET=your-signing-secret
   ```

### Slack Bot Setup
For bot messaging:
1. Enable "Bots" feature
2. Configure bot display information
3. Copy Bot User OAuth Token from "Install App" page

---

## 5. Salesforce

### Prerequisites
- Salesforce Developer account
- Connected App access

### Step-by-Step Setup

1. **Login to Salesforce**
   ```
   https://login.salesforce.com/
   ```

2. **Create Connected App**
   - Go to Setup > Apps > App Manager
   - Click "New Connected App"

3. **Fill Basic Information**
   - Connected App Name: `OpenMeet.ai`
   - API Name: `OpenMeet_ai`
   - Contact Email: dev@yourdomain.com

4. **Enable OAuth Settings**
   - Check "Enable OAuth Settings"
   - Callback URL:
     ```
     http://localhost:4000/api/integrations/oauth/salesforce/callback (development)
     https://api.yourdomain.com/api/integrations/oauth/salesforce/callback (production)
     ```
   - Selected OAuth Scopes:
     ```
     Access and manage your data (api)
     Perform requests on your behalf at any time (refresh_token, offline_access)
     Access your basic information (id, profile, email, address, phone)
     ```

5. **Configure IP Relaxation**
   - IP Relaxation: "Relax IP restrictions"
   - Refresh Token Policy: "Refresh token is valid until revoked"

6. **Save and Wait**
   - Click "Save"
   - Wait 2-10 minutes for activation

7. **Get Consumer Credentials**
   - Go to "Manage Consumer Details"
   - Verify with code sent to email
   - Copy Consumer Key and Consumer Secret

8. **Save Credentials**
   ```env
   SALESFORCE_CLIENT_ID=your-consumer-key
   SALESFORCE_CLIENT_SECRET=your-consumer-secret
   ```

### Sandbox vs Production
For sandbox testing:
- Use `https://test.salesforce.com` instead of `https://login.salesforce.com`
- Set `SALESFORCE_SANDBOX=true` in environment

---

## 6. HubSpot

### Prerequisites
- HubSpot Developer account

### Step-by-Step Setup

1. **Go to HubSpot Developers**
   ```
   https://developers.hubspot.com/
   ```

2. **Create Developer Account**
   - If you don't have one, create at:
     ```
     https://app.hubspot.com/signup/developers
     ```

3. **Create App**
   - Go to "Manage apps"
   - Click "Create app"
   - App name: `OpenMeet.ai`

4. **Configure OAuth**
   - Go to "Auth" tab
   - Set Redirect URL:
     ```
     http://localhost:4000/api/integrations/oauth/hubspot/callback (development)
     https://api.yourdomain.com/api/integrations/oauth/hubspot/callback (production)
     ```

5. **Set Scopes**
   Add required scopes:
   ```
   crm.objects.contacts.read
   crm.objects.contacts.write
   crm.objects.companies.read
   crm.objects.companies.write
   crm.objects.deals.read
   crm.objects.deals.write
   ```

6. **Get Credentials**
   - Go to "Auth" tab
   - Copy:
     - Client ID
     - Client Secret

7. **Save Credentials**
   ```env
   HUBSPOT_CLIENT_ID=your-hubspot-client-id
   HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
   ```

### API Key (Alternative)
For server-to-server integration:
1. Go to Settings > Integrations > API key
2. Generate API key
3. Save as `HUBSPOT_API_KEY`

---

## 7. Stripe (Payments)

### Prerequisites
- Stripe account

### Step-by-Step Setup

1. **Go to Stripe Dashboard**
   ```
   https://dashboard.stripe.com/
   ```

2. **Get API Keys**
   - Go to Developers > API keys
   - For development: Use "Test mode" keys
   - For production: Use "Live mode" keys

3. **Copy Keys**
   - Publishable key (pk_test_... or pk_live_...)
   - Secret key (sk_test_... or sk_live_...)

4. **Set Up Webhooks**
   - Go to Developers > Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://api.yourdomain.com/webhooks/stripe`
   - Events to listen:
     ```
     checkout.session.completed
     customer.subscription.created
     customer.subscription.updated
     customer.subscription.deleted
     invoice.payment_succeeded
     invoice.payment_failed
     ```
   - Copy Signing Secret (whsec_...)

5. **Save Credentials**
   ```env
   STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
   STRIPE_SECRET_KEY=sk_test_or_live_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

### Test Mode vs Live Mode
- Always develop with test mode keys
- Switch to live mode only for production
- Use Stripe CLI for local webhook testing:
  ```bash
  stripe listen --forward-to localhost:4000/webhooks/stripe
  ```

---

## 8. SendGrid (Email)

### Prerequisites
- SendGrid account

### Step-by-Step Setup

1. **Go to SendGrid**
   ```
   https://app.sendgrid.com/
   ```

2. **Create API Key**
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Name: `OpenMeet Production`
   - Permissions: "Restricted Access"
   - Enable:
     ```
     Mail Send: Full Access
     Template Engine: Read Access
     ```
   - Click "Create & View"
   - **IMPORTANT**: Copy the key immediately (shown only once)

3. **Verify Sender Identity**
   - Go to Settings > Sender Authentication
   - Either verify a single sender email OR
   - Authenticate your domain (recommended for production)

4. **Save Credentials**
   ```env
   SENDGRID_API_KEY=SG.your-api-key
   FROM_EMAIL=noreply@yourdomain.com
   ```

### Domain Authentication
For better deliverability:
1. Go to Settings > Sender Authentication > Authenticate Your Domain
2. Add CNAME records to your DNS
3. Verify domain

---

## 9. OpenAI (AI Services)

### Prerequisites
- OpenAI account with API access

### Step-by-Step Setup

1. **Go to OpenAI Platform**
   ```
   https://platform.openai.com/
   ```

2. **Create API Key**
   - Go to API keys
   - Click "Create new secret key"
   - Name: `OpenMeet Production`
   - Click "Create secret key"
   - **IMPORTANT**: Copy immediately (shown only once)

3. **Set Usage Limits**
   - Go to Settings > Limits
   - Set monthly spending limit
   - Configure usage alerts

4. **Check Available Models**
   - Ensure access to:
     - `gpt-4-turbo-preview`
     - `gpt-3.5-turbo`
     - `whisper-1` (for transcription)

5. **Save Credentials**
   ```env
   OPENAI_API_KEY=sk-your-api-key
   OPENAI_ORGANIZATION=org-your-org-id  # Optional
   GPT_MODEL=gpt-4-turbo-preview
   WHISPER_MODEL=whisper-1
   ```

### Rate Limits
- Check your tier's rate limits
- Implement exponential backoff in code
- Consider upgrading tier for production

---

## 10. Environment Configuration

### Complete .env Template

```env
# ============================================
# OPENMEET AI - PRODUCTION ENVIRONMENT
# ============================================

# Application
NODE_ENV=production
API_URL=https://api.yourdomain.com
WEB_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/openmeet_db

# Redis
REDIS_URL=redis://:password@host:6379

# Security (CHANGE THESE!)
JWT_SECRET=generate-with-openssl-rand-base64-64
JWT_REFRESH_SECRET=generate-different-secret-with-openssl
ENCRYPTION_KEY=32-character-hex-key-for-aes256

# ============================================
# OAUTH CREDENTIALS
# ============================================

# Google (Meet & Calendar)
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret

# Microsoft (Teams)
MICROSOFT_CLIENT_ID=your-azure-app-id
MICROSOFT_CLIENT_SECRET=your-azure-secret
TEAMS_CLIENT_ID=your-azure-app-id
TEAMS_CLIENT_SECRET=your-azure-secret

# Zoom
ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret

# Slack
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-signing-secret

# Salesforce
SALESFORCE_CLIENT_ID=your-consumer-key
SALESFORCE_CLIENT_SECRET=your-consumer-secret

# HubSpot
HUBSPOT_CLIENT_ID=your-hubspot-client-id
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret

# ============================================
# PAYMENT & SERVICES
# ============================================

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid
SENDGRID_API_KEY=SG....
FROM_EMAIL=noreply@yourdomain.com

# OpenAI
OPENAI_API_KEY=sk-...
GPT_MODEL=gpt-4-turbo-preview
```

### Security Checklist

- [ ] All secrets are unique and randomly generated
- [ ] No development/test keys in production
- [ ] OAuth redirect URIs match production domain
- [ ] Webhook secrets are configured
- [ ] API rate limits are set
- [ ] Spending limits are configured
- [ ] All OAuth apps are verified (if required)
- [ ] CORS origins are properly restricted
- [ ] Encryption keys are backed up securely

### Testing OAuth Flows

1. **Local Development**
   ```bash
   # Start services
   docker-compose -f docker-compose.e2e.yml up -d

   # Start API
   cd apps/api && pnpm dev

   # Test OAuth initiation
   curl http://localhost:4000/api/integrations/oauth/zoom/authorize \
     -H "Authorization: Bearer your-jwt-token"
   ```

2. **Verify Callbacks**
   - OAuth provider redirects to your callback URL
   - State parameter is validated
   - Tokens are exchanged and encrypted
   - Integration is saved to database

3. **Test Integration**
   ```bash
   curl http://localhost:4000/api/integrations/your-integration-id/test \
     -H "Authorization: Bearer your-jwt-token"
   ```

---

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch"**
   - Ensure callback URL matches exactly (including trailing slash)
   - Check http vs https

2. **"invalid_client"**
   - Verify client ID and secret are correct
   - Check if app is published/activated

3. **"access_denied"**
   - User declined permissions
   - Required scopes not added to OAuth app

4. **Token Expiration**
   - Implement refresh token flow
   - Store refresh tokens securely

### Support Contacts

- Google: https://cloud.google.com/support
- Microsoft: https://support.microsoft.com/
- Zoom: https://support.zoom.us/
- Slack: https://slack.com/help/contact
- Salesforce: https://help.salesforce.com/
- HubSpot: https://help.hubspot.com/

---

*Last Updated: November 2025*
*OpenMeet.ai OAuth Integration Runbooks v1.0*
