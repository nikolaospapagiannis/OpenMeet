<div align="center">
  <img src="docs/assets/logo.svg" alt="OpenMeet Logo" width="180">
  <h1>OpenMeet</h1>
  <p><strong>Open-Source Meeting Intelligence Platform</strong></p>
  <p>AI-powered transcription, insights, and collaboration for modern teams</p>

  <!-- Status Badges -->
  <p>
    <a href="https://github.com/openmeet/openmeet/actions"><img src="https://img.shields.io/github/actions/workflow/status/openmeet/openmeet/ci-cd.yml?branch=main&style=flat-square&label=CI/CD" alt="Build Status"></a>
    <a href="https://github.com/openmeet/openmeet/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
    <img src="https://img.shields.io/badge/TypeScript-5.3+-blue?style=flat-square&logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/Node.js-20+-green?style=flat-square&logo=node.js" alt="Node.js">
    <img src="https://img.shields.io/badge/Python-3.11+-yellow?style=flat-square&logo=python" alt="Python">
  </p>

  <!-- Tech Stack Badges -->
  <p>
    <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" alt="Next.js">
    <img src="https://img.shields.io/badge/React_Native-0.73-61DAFB?style=flat-square&logo=react" alt="React Native">
    <img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis" alt="Redis">
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker" alt="Docker">
    <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa" alt="PWA">
  </p>

  <!-- Quick Links -->
  <p>
    <a href="#-quick-start">Quick Start</a> &bull;
    <a href="docs/getting-started/installation.md">Documentation</a> &bull;
    <a href="#-features">Features</a> &bull;
    <a href="#-web-app-features">Web App</a> &bull;
    <a href="CONTRIBUTING.md">Contributing</a> &bull;
    <a href="#-roadmap">Roadmap</a>
  </p>
</div>

---

## Table of Contents

- [Features](#-features)
- [Web App Features](#-web-app-features)
- [Why OpenMeet?](#-why-openmeet)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [API Documentation](#-api-documentation)
- [Components Library](#-components-library)
- [Integrations](#-integrations)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)
- [The Team](#-the-team)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)

---

## Features

<table>
<tr>
<td width="50%">

### Meeting Intelligence
- **AI Transcription** - Real-time transcription with 100+ language support
- **Speaker Diarization** - Automatic speaker identification using PyAnnote
- **Smart Summaries** - LLM-powered meeting summaries and action items
- **Live Captions** - Real-time WebSocket-based captioning
- **Video Player** - Synchronized playback with transcript highlighting
- **Video Clips** - Create, preview, and share meeting highlights
- **Meeting Insights** - Sentiment analysis, talk time, topic extraction

</td>
<td width="50%">

### Revenue Intelligence
- **Deal Tracking** - Link meetings to deals for complete pipeline visibility
- **Pipeline Kanban** - Drag-and-drop deal management board
- **Win/Loss Analysis** - AI-generated insights on closed deals
- **Sales Coaching** - Automated scorecards with AI recommendations
- **Competitor Tracking** - Monitor competitor mentions in calls
- **Deal Health Score** - Visual health indicators with improvement suggestions
- **CRM Sync** - Automatic syncing with Salesforce, HubSpot, and Pipedrive

</td>
</tr>
<tr>
<td width="50%">

### Workflow Automation
- **Visual Workflow Builder** - Drag-and-drop canvas with nodes and edges
- **Custom Triggers** - Meeting completed, keyword detected, schedule-based
- **Action Nodes** - Send email, post to Slack, update CRM, call webhooks
- **Condition Branching** - If/then logic for complex workflows
- **Execution Logs** - Real-time monitoring and debugging
- **Pre-built Templates** - Ready-to-use workflow templates
- **Test Mode** - Test workflows before deploying

</td>
<td width="50%">

### Enterprise Features
- **SSO Integration** - SAML 2.0 with Okta, Azure AD, Auth0
- **OIDC Support** - OpenID Connect configuration
- **SCIM Provisioning** - Automated user provisioning with token management
- **Domain Verification** - DNS TXT record verification
- **Advanced RBAC** - Fine-grained role-based access control
- **White-Label** - Custom branding, domains, and theming
- **Compliance** - GDPR, HIPAA, SOC2 ready audit logging

</td>
</tr>
<tr>
<td width="50%">

### Multi-Platform
- **Web App** - Modern Next.js 14 dashboard with PWA support
- **Mobile App** - React Native for iOS and Android
- **Chrome Extension** - One-click meeting recording with bot injection
- **GraphQL API** - Full-featured API with subscriptions
- **Webhooks** - Real-time event notifications with delivery logs
- **Developer Portal** - API keys, playground, and SDK documentation

</td>
<td width="50%">

### AI Flexibility
- **Multi-Provider** - OpenAI, Anthropic, vLLM, Ollama, LM Studio
- **Self-Hosted AI** - Run models locally for complete data privacy
- **AI Apps Platform** - Marketplace with 12+ pre-built AI apps
- **Custom App Builder** - Create custom AI apps with prompt templates
- **Custom Fine-Tuning** - Train models on your organization's data
- **Air-Gapped Mode** - Run entirely offline with local models

</td>
</tr>
</table>

<details>
<summary><strong>Feature Comparison with Competitors</strong></summary>

| Feature | OpenMeet | Fireflies.ai | Otter.ai | Gong |
|---------|----------|--------------|----------|------|
| Multi-AI Providers | 5+ providers | OpenAI only | OpenAI only | Proprietary |
| Mobile App | iOS + Android | Yes | iOS only | Yes |
| White-Label | Full branding | No | No | Enterprise |
| Self-Hosted Option | Docker Compose | No | No | No |
| GraphQL Subscriptions | Real-time | No | No | No |
| Visual Workflow Builder | Yes | Limited | No | No |
| AI Apps Marketplace | 12+ apps | No | No | No |
| Custom Fine-Tuning | OpenAI API | No | No | Proprietary |
| PWA Support | Yes | No | No | No |
| Open Source | **100% Open** | No | No | No |
| Price | **Free** | $10-39/user/mo | $16.99+/mo | $100+/user/mo |

</details>

---

## Web App Features

The OpenMeet web application includes a comprehensive set of features organized into functional areas:

### Authentication & Security

| Feature | Description | Components |
|---------|-------------|------------|
| **Login/Register** | Email/password and OAuth authentication | `LoginPage`, `RegisterPage` |
| **Password Reset** | Forgot password with email verification | `ForgotPasswordPage`, `ResetPasswordPage` |
| **Email Verification** | Email confirmation flow with resend | `VerifyEmailPage`, `PendingVerification` |
| **MFA Setup** | TOTP-based two-factor authentication | `MFASetupWizard`, `MFAVerifyModal` |
| **Session Management** | Active sessions and device management | `SecuritySettings` |

### Onboarding & First-Time UX

| Feature | Description | Components |
|---------|-------------|------------|
| **Onboarding Survey** | Multi-step wizard for user preferences | `OnboardingSurvey`, `OnboardingPage` |
| **Welcome Modal** | Feature introduction for new users | `WelcomeModal` |
| **Feature Tour** | Interactive product tour with tooltips | `FeatureTour`, `TourTooltip` |
| **Empty States** | Helpful empty states with CTAs | `EmptyDashboard`, `EmptyMeetingsList` |
| **Setup Checklist** | Progress tracker for account setup | `SetupChecklist` |

### Meeting Management

| Feature | Description | Components |
|---------|-------------|------------|
| **File Upload** | Drag-and-drop with chunked uploads (up to 2GB) | `MeetingUploadModal`, `FileDropZone` |
| **Processing Progress** | Real-time status via WebSocket | `ProcessingProgress` |
| **Meeting Detail** | Synchronized player with transcript | `MeetingPlayer`, `SyncedTranscript` |
| **Meeting Filters** | Advanced filtering with saved presets | `MeetingFilters`, `FilterPresets` |
| **Video Clips** | Timeline selection and sharing | `ClipTimeline`, `ClipPreview`, `ClipShareModal` |

### AI Features

| Feature | Description | Components |
|---------|-------------|------------|
| **Ask AI** | Cross-meeting AI assistant | `AskAIChat`, `SuggestedQuestions` |
| **AI Summary** | Expandable summary with sections | `MeetingSummaryPanel` |
| **Meeting Insights** | Sentiment, talk time, topics | `MeetingInsights`, `SentimentTimeline` |
| **AI Apps** | Marketplace and custom builder | `AppMarketplace`, `CustomAppBuilder` |

### Search & Navigation

| Feature | Description | Components |
|---------|-------------|------------|
| **Global Search** | Cmd+K search across all content | `GlobalSearchModal`, `SearchResults` |
| **Live Transcription** | Real-time meeting transcription | `LiveTranscriptPanel`, `LiveControls` |
| **Notifications** | Real-time notification system | `NotificationDropdown`, `NotificationToast` |

### Analytics & Reporting

| Feature | Description | Components |
|---------|-------------|------------|
| **Analytics Dashboard** | Meeting volume, engagement, export | `MeetingVolumeChart`, `EngagementMetrics` |
| **Participant Leaderboard** | Top participants with sorting | `ParticipantLeaderboard` |
| **Quality Score** | Meeting quality metrics (0-100) | `QualityScoreCard`, `QualityBreakdown` |
| **Team Trends** | Team performance over time | `TeamQualityTrends` |
| **Export Reports** | CSV and PDF export | `ExportReportModal` |

### Revenue & Sales

| Feature | Description | Components |
|---------|-------------|------------|
| **Pipeline Kanban** | Drag-and-drop deal board | `PipelineKanban` |
| **Deal Timeline** | Activity history with sentiment | `DealTimeline` |
| **Competitor Mentions** | Track competitor discussions | `CompetitorMentions` |
| **AI Next Steps** | AI-generated recommendations | `NextStepsAI` |
| **Deal Health** | Visual health scoring | `DealHealthScore` |

### Coaching & Training

| Feature | Description | Components |
|---------|-------------|------------|
| **AI Coaching Insights** | Personalized recommendations | `AICoachingInsights` |
| **Performance Trends** | Historical performance charts | `PerformanceTrends` |
| **Peer Comparison** | Anonymous benchmarking | `PeerComparison` |
| **Coaching Goals** | Goal setting and tracking | `CoachingGoals` |
| **Scorecard Evaluator** | Automatic transcript scoring | `ScorecardEvaluator` |

### Enterprise Administration

| Feature | Description | Components |
|---------|-------------|------------|
| **SSO Configuration** | SAML and OIDC setup | `SAMLConfigForm`, `OIDCConfigForm` |
| **SCIM Provisioning** | User provisioning | `SCIMProvisioning` |
| **Domain Verification** | DNS verification | `DomainVerification` |
| **Branding** | Logo, colors, themes | `ThemeEditor`, `BrandAssetLibrary` |
| **Custom Domain** | CNAME setup | `CustomDomainSetup` |

### Developer Tools

| Feature | Description | Components |
|---------|-------------|------------|
| **API Key Manager** | Create and rotate keys | `APIKeyManager` |
| **API Playground** | Interactive API testing | `APIPlayground` |
| **SDK Documentation** | JS, Python, cURL examples | `SDKDocs` |
| **Webhooks** | Event subscriptions | `WebhookForm`, `DeliveryLogs` |

---

## Why OpenMeet?

**The Problem:** Meeting intelligence tools are either too expensive, too limited, or lock you into proprietary AI systems.

**Our Solution:** OpenMeet provides enterprise-grade meeting intelligence that's 100% open source:

- **Own Your Data** - Self-host the entire platform with Docker Compose
- **Choose Your AI** - Use OpenAI, run local models with Ollama, or mix providers
- **Complete Privacy** - Air-gapped mode for sensitive environments
- **Customize Everything** - White-label, custom workflows, fine-tuned models
- **No Vendor Lock-in** - MIT licensed, forever free, community-driven

> "From paying $100+/user/month to running your own meeting intelligence platform for free."

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker and Docker Compose
- pnpm (`npm install -g pnpm`)

### 30-Second Setup

```bash
# Clone the repository
git clone https://github.com/openmeet/openmeet.git
cd openmeet

# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env

# Start infrastructure (PostgreSQL, Redis, Elasticsearch)
docker-compose up -d

# Run database migrations
pnpm prisma migrate dev

# Start development servers
pnpm dev
```

**That's it!** Open [http://localhost:3003](http://localhost:3003) to see the web app.

| Service | URL |
|---------|-----|
| Web App | http://localhost:3003 |
| API Server | http://localhost:4000 |
| AI Service | http://localhost:8888 |
| WebSocket | ws://localhost:5003 |

---

## Installation

### Using Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/openmeet/openmeet.git
cd openmeet

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Manual Installation

<details>
<summary><strong>Step-by-step manual setup</strong></summary>

#### 1. Install Dependencies

```bash
# Clone repository
git clone https://github.com/openmeet/openmeet.git
cd openmeet

# Install Node.js dependencies
pnpm install

# Install Python dependencies (for AI service)
cd apps/ai-service
pip install -r requirements.txt
pip install -r requirements-ml.txt
cd ../..
```

#### 2. Set Up Databases

```bash
# Start infrastructure services
docker-compose up -d postgres redis elasticsearch rabbitmq minio

# Wait for services to be healthy
docker-compose ps

# Run Prisma migrations
pnpm prisma migrate dev

# (Optional) Seed database
pnpm prisma db seed
```

#### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Configuration](#-configuration)).

#### 4. Start Services

```bash
# Terminal 1: API Server
pnpm dev:api

# Terminal 2: Web Frontend
pnpm dev:web

# Terminal 3: AI Service
cd apps/ai-service && uvicorn app.main:app --reload --port 8888
```

</details>

### Air-Gapped Mode (Local AI)

For complete privacy, OpenMeet supports running entirely offline with local AI models:

```bash
# Start with local Ollama
ollama serve &
ollama pull llama3.2

# Configure .env for local AI
OPENAI_BASE_URL=http://host.docker.internal:11434/v1
OPENAI_MODEL=llama3.2
USE_LOCAL_TRANSCRIPTION=true

# Start OpenMeet
docker-compose up -d
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root. See [.env.example](.env.example) for all options.

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/openmeet` |
| `REDIS_URL` | Redis connection string | `redis://:password@localhost:6379` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `your-secure-secret-min-32-characters` |
| `JWT_REFRESH_SECRET` | Refresh token secret | `different-secure-secret-min-32-chars` |

#### AI Provider Configuration

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4/Whisper |
| `OPENAI_BASE_URL` | Custom endpoint (for Ollama/vLLM) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `OLLAMA_URL` | Ollama server URL |
| `HF_TOKEN` | HuggingFace token for model downloads |

---

## Architecture

```
+-------------------------------------------------------------------------+
|                         CLIENT LAYER                                     |
|  +--------------+  +---------------+  +--------------+  +------------+  |
|  |   Next.js    |  |    Chrome     |  | React Native |  |   GraphQL  |  |
|  |   Web App    |  |   Extension   |  |  Mobile App  |  |   Client   |  |
|  |    (PWA)     |  |               |  |              |  |            |  |
|  +------+-------+  +-------+-------+  +------+-------+  +------+-----+  |
+---------+------------------+------------------+----------------+---------+
          |                  |                  |                |
          +------------------+---------+--------+----------------+
                                       |
+-----------------------------------------+-----------------------------+
|                         API LAYER                                      |
|  +-------------------------------------------------------------------+ |
|  |                    Express.js API Server                          | |
|  |         REST API - GraphQL - WebSocket - Rate Limiting            | |
|  |                                                                   | |
|  |  +-------------------------------------------------------------+  | |
|  |  |                    SERVICE LAYER (70+)                      |  | |
|  |  |                                                             |  | |
|  |  |  TranscriptionService - RevenueIntelligenceService          |  | |
|  |  |  WorkflowAutomationService - SSOService - RBACService       |  | |
|  |  |  SlackBotService - TeamsIntegrationService - ...            |  | |
|  |  +-------------------------------------------------------------+  | |
|  +-------------------------------------------------------------------+ |
+-------------------------------------------+-----------------------------+
                                            |
+-------------------------------------------v-----------------------------+
|                        DATA LAYER                                       |
|  +-----------+ +-----------+ +-----------+ +-----------+ +-----------+  |
|  |PostgreSQL | |   Redis   | | Elastic-  | | RabbitMQ  | |   MinIO   |  |
|  | (Prisma)  | |  (Cache)  | |  search   | |  (Queue)  | |   (S3)    |  |
|  +-----------+ +-----------+ +-----------+ +-----------+ +-----------+  |
+-------------------------------------------+-----------------------------+
                                            |
+-------------------------------------------v-----------------------------+
|                       AI/ML LAYER                                       |
|  +-------------------------------------------------------------------+  |
|  |                  Python FastAPI AI Service                        |  |
|  |                                                                   |  |
|  |  +----------+ +----------+ +----------+ +----------+ +----------+ |  |
|  |  |  OpenAI  | |Anthropic | |   vLLM   | |  Ollama  | |LM Studio | |  |
|  |  |  GPT-4   | |  Claude  | | (Local)  | | (Local)  | | (Local)  | |  |
|  |  +----------+ +----------+ +----------+ +----------+ +----------+ |  |
|  |                                                                   |  |
|  |  PyAnnote (Diarization) - KeyBERT - spaCy - WhisperX             |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js 20** | Runtime environment |
| **Express.js 4** | Web framework |
| **TypeScript 5.3** | Type-safe development |
| **Prisma 5** | PostgreSQL ORM |
| **GraphQL** | API query language |
| **Socket.io** | Real-time communication |
| **Bull** | Job queue processing |

### Frontend

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework (App Router) |
| **React 18** | UI library |
| **TailwindCSS** | Styling |
| **Radix UI** | Accessible components |
| **Recharts** | Data visualization |
| **Zustand** | State management |

### AI/ML

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Python API framework |
| **OpenAI** | GPT-4, Whisper, embeddings |
| **Anthropic** | Claude models |
| **Ollama** | Local model inference |
| **PyAnnote** | Speaker diarization |
| **WhisperX** | Fast transcription |
| **KeyBERT** | Keyword extraction |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **PostgreSQL 15** | Primary database (with pgvector) |
| **Redis 7** | Caching, sessions |
| **Elasticsearch 8** | Full-text search |
| **RabbitMQ** | Message queue |
| **MinIO** | S3-compatible storage |
| **Docker** | Containerization |

---

## API Documentation

### REST API

```bash
# Health check
curl http://localhost:4000/health

# Authenticate
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Get meetings (authenticated)
curl http://localhost:4000/api/v1/meetings \
  -H "Authorization: Bearer <token>"
```

### AI Service Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/transcribe` | POST | Transcribe audio file |
| `/api/v1/diarize` | POST | Speaker diarization |
| `/api/v1/summarize` | POST | Generate meeting summary |
| `/api/v1/sentiment` | POST | Sentiment analysis |
| `/api/v1/extract-keywords` | POST | Keyword extraction |
| `/api/v1/chat` | POST | Conversational AI |
| `/health` | GET | Health check |

---

## The Team

OpenMeet is built and maintained by a passionate team of engineers and entrepreneurs:

<table>
<tr>
<td align="center" width="33%">
<img src="https://github.com/nikolaospapagiannis.png" width="150" height="150" style="border-radius: 50%;" alt="Nikolaos Papagiannis">
<br>
<strong>Nikolaos Papagiannis</strong>
<br>
<em>Co-Founder & Lead Engineer</em>
<br>
<a href="https://github.com/nikolaospapagiannis">GitHub</a> | <a href="https://linkedin.com/in/nikolaospapagiannis">LinkedIn</a>
</td>
<td align="center" width="33%">
<img src="https://wp2.investments/templates/yootheme/cache/0d/wmpysiewicz-4-0d8ab51b.webp" width="150" height="150" style="border-radius: 50%;" alt="Wojciech M. Pysiewicz">
<br>
<strong>Wojciech M. Pysiewicz</strong>
<br>
<em>Co-Founder & Strategy</em>
<br>
<a href="https://wp2.investments">Website</a> | <a href="https://linkedin.com/in/pysiewicz">LinkedIn</a>
</td>
<td align="center" width="33%">
<img src="https://xyz.pl/wp-content/uploads/2025/11/ADAM_FILIPOWSKI.png" width="150" height="150" style="border-radius: 50%;" alt="Adam Filipowski">
<br>
<strong>Adam Filipowski</strong>
<br>
<em>Co-Founder & Product</em>
<br>
<a href="https://github.com/adamfilipowski">GitHub</a> | <a href="https://linkedin.com/in/adamfilipowski">LinkedIn</a>
</td>
</tr>
</table>

---

## Roadmap

### Completed

- [x] Core meeting transcription and diarization
- [x] Multi-provider AI support (OpenAI, Anthropic, vLLM, Ollama)
- [x] CRM integrations (Salesforce, HubSpot, Pipedrive)
- [x] Revenue intelligence and sales coaching
- [x] Enterprise SSO (SAML, SCIM, OIDC)
- [x] White-label platform with custom branding
- [x] React Native mobile app
- [x] Chrome extension with bot injection
- [x] Complete authentication flows
- [x] Visual workflow automation builder
- [x] AI Apps marketplace and custom builder
- [x] Developer portal with API playground
- [x] PWA support (install, offline, push notifications)

### In Progress

- [ ] Real-time meeting bot for Zoom/Teams/Meet
- [ ] Enhanced video intelligence with visual analysis
- [ ] Custom model fine-tuning UI
- [ ] Multi-language support expansion

### Planned

- [ ] Desktop application (Electron)
- [ ] Meeting scheduling (Calendly-like)
- [ ] Plugin marketplace
- [ ] On-premise deployment guide

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint
```

---

## Security

Security is a top priority. Please see our [Security Policy](SECURITY.md) for:

- Supported versions
- Reporting vulnerabilities
- Security best practices

**Do not** report security vulnerabilities through public GitHub issues.

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License - Use freely for commercial and personal projects.
```

---

<div align="center">
  <p>
    <strong>Built with love by the OpenMeet Team</strong>
  </p>
  <p>
    <a href="https://github.com/openmeet/openmeet">Star on GitHub</a> &bull;
    <a href="CONTRIBUTING.md">Contribute</a> &bull;
    <a href="https://github.com/openmeet/openmeet/issues">Report Issues</a>
  </p>
  <br>
  <p>
    <sub>OpenMeet is proudly open source and free forever.</sub>
  </p>
</div>
