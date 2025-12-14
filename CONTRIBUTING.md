# Contributing to OpenMeet

First off, thank you for considering contributing to OpenMeet! It's people like you that make OpenMeet such a great tool for teams everywhere.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Style Guides](#style-guides)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

---

## Code of Conduct

This project adheres to our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 20+** - [Download](https://nodejs.org/)
- **Python 3.11+** - [Download](https://www.python.org/)
- **pnpm 8+** - Install with `npm install -g pnpm`
- **Docker & Docker Compose** - [Download](https://www.docker.com/)
- **Git** - [Download](https://git-scm.com/)

### Fork and Clone

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/openmeet.git
cd openmeet
```

3. **Add upstream remote**:

```bash
git remote add upstream https://github.com/nikolaospapagiannis/openmeet.git
```

---

## Development Setup

### 1. Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install Python dependencies (for AI service)
cd apps/ai-service
pip install -r requirements.txt
pip install -r requirements-ml.txt
cd ../..
```

### 2. Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your local settings
# At minimum, you need:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET
# - JWT_REFRESH_SECRET
```

### 3. Start Infrastructure

```bash
# Start databases and services
docker-compose up -d postgres redis mongodb elasticsearch rabbitmq minio

# Verify services are running
docker-compose ps
```

### 4. Initialize Database

```bash
# Run Prisma migrations
cd apps/api
npx prisma migrate dev
npx prisma generate
cd ../..
```

### 5. Start Development Servers

```bash
# Start all services (recommended)
pnpm dev

# Or start individual services:
pnpm dev:api    # API server on port 4000
pnpm dev:web    # Web app on port 3003

# Start AI service (separate terminal)
cd apps/ai-service
uvicorn app.main:app --reload --port 5001
```

### 6. Verify Setup

- Web App: http://localhost:3003
- API Server: http://localhost:4000/health
- AI Service: http://localhost:5001/health

---

## Project Structure

```
openmeet/
├── apps/
│   ├── api/                    # Express.js API (TypeScript)
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── graphql/        # GraphQL schema/resolvers
│   │   │   ├── integrations/   # Third-party integrations
│   │   │   └── workers/        # Background jobs
│   │   ├── prisma/             # Database schema
│   │   └── tests/              # API tests
│   │
│   ├── web/                    # Next.js Frontend
│   │   └── src/
│   │       ├── app/            # App Router pages
│   │       ├── components/     # React components
│   │       ├── hooks/          # Custom hooks
│   │       └── services/       # API clients
│   │
│   ├── mobile/                 # React Native App
│   ├── ai-service/             # Python FastAPI
│   ├── chrome-extension/       # Browser Extension
│   └── realtime-service/       # WebSocket Server
│
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── utils/                  # Shared utilities
│   └── ui/                     # Shared UI components
│
├── services/
│   ├── analytics/              # Analytics service
│   ├── billing/                # Billing service
│   └── notification/           # Notification service
│
├── infrastructure/             # DevOps configurations
├── docs/                       # Documentation
└── tests/                      # E2E and integration tests
```

---

## Development Workflow

### Branching Strategy

We use the following branch naming convention:

| Branch Type | Pattern | Example |
|-------------|---------|---------|
| Feature | `feature/description` | `feature/add-zoom-integration` |
| Bug Fix | `fix/description` | `fix/auth-token-expiry` |
| Documentation | `docs/description` | `docs/api-reference` |
| Refactor | `refactor/description` | `refactor/service-layer` |
| Hotfix | `hotfix/description` | `hotfix/critical-security-fix` |

### Creating a Feature Branch

```bash
# Ensure you're on main and up-to-date
git checkout main
git pull upstream main

# Create your feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. **Write code** following our [style guides](#style-guides)
2. **Add tests** for new functionality
3. **Update documentation** if needed
4. **Run tests** before committing

### Committing Changes

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `perf` - Performance improvements

**Examples:**

```bash
# Feature
git commit -m "feat(api): add webhook retry mechanism"

# Bug fix
git commit -m "fix(web): resolve login redirect loop"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Breaking change
git commit -m "feat(api)!: change authentication flow

BREAKING CHANGE: JWT tokens now include organization scope"
```

---

## Pull Request Process

### Before Submitting

- [ ] Tests pass locally (`pnpm test`)
- [ ] Code follows style guidelines (`pnpm lint`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with `main`

### Submitting a PR

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub

3. **Fill out the PR template** with:
   - Clear description of changes
   - Link to related issue (if any)
   - Screenshots (for UI changes)
   - Breaking change notes (if any)

### PR Review Process

1. **Automated checks** run (CI, linting, tests)
2. **Code review** by maintainers (usually within 48-72 hours)
3. **Address feedback** through additional commits
4. **Approval and merge** by maintainer

### After Merge

```bash
# Switch back to main
git checkout main

# Pull latest changes
git pull upstream main

# Delete your feature branch
git branch -d feature/your-feature-name
```

---

## Style Guides

### TypeScript/JavaScript

We use ESLint and Prettier for code formatting:

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint --fix

# Format code
pnpm format
```

**Key conventions:**
- Use TypeScript for all new code
- Prefer `const` over `let`
- Use async/await over callbacks
- Use descriptive variable names
- Export types from dedicated files

### Python

We follow PEP 8 with these tools:

```bash
# In apps/ai-service directory
pip install black flake8 mypy

# Format code
black .

# Check style
flake8 .

# Type checking
mypy .
```

### CSS/Tailwind

- Use Tailwind utility classes
- Follow component-based styling
- Use CSS variables for theming
- Keep specificity low

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `MeetingCard.tsx` |
| Hooks | camelCase with `use` | `useMeeting.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types | PascalCase | `Meeting.types.ts` |
| Tests | Same as source + `.test` | `MeetingCard.test.tsx` |
| API Routes | kebab-case | `meeting-summary.ts` |

---

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run specific app tests
pnpm test --filter=@openmeet/api
pnpm test --filter=@openmeet/web

# Run E2E tests
pnpm test:e2e
```

### Writing Tests

**API Tests (Jest):**

```typescript
// apps/api/src/services/__tests__/MeetingService.test.ts
describe('MeetingService', () => {
  describe('createMeeting', () => {
    it('should create a meeting with valid data', async () => {
      const meeting = await MeetingService.create({
        title: 'Test Meeting',
        organizationId: 'org-123',
        userId: 'user-123',
      });

      expect(meeting.id).toBeDefined();
      expect(meeting.title).toBe('Test Meeting');
    });
  });
});
```

**Frontend Tests (React Testing Library):**

```typescript
// apps/web/src/components/__tests__/MeetingCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MeetingCard } from '../MeetingCard';

describe('MeetingCard', () => {
  it('renders meeting title', () => {
    render(<MeetingCard title="Weekly Standup" />);
    expect(screen.getByText('Weekly Standup')).toBeInTheDocument();
  });
});
```

**E2E Tests (Playwright):**

```typescript
// apps/web/e2e/meetings.spec.ts
import { test, expect } from '@playwright/test';

test('user can create a meeting', async ({ page }) => {
  await page.goto('/meetings/new');
  await page.fill('[name="title"]', 'Test Meeting');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/meetings\/[\w-]+/);
});
```

---

## Documentation

### Where to Document

| Type | Location |
|------|----------|
| API endpoints | `docs/api/` |
| User guides | `docs/guides/` |
| Architecture | `docs/architecture/` |
| Code comments | Inline in source |
| README updates | `README.md` |

### Documentation Style

- Use clear, concise language
- Include code examples
- Keep explanations beginner-friendly
- Update docs with code changes

---

## Community

### Getting Help

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and community chat
- **Stack Overflow** - Tag with `openmeet`

### Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Project README

---

## Questions?

If you have questions about contributing, please:

1. Check existing [GitHub Issues](https://github.com/nikolaospapagiannis/openmeet/issues)
2. Start a [GitHub Discussion](https://github.com/nikolaospapagiannis/openmeet/discussions)
3. Reach out to maintainers

---

Thank you for contributing to OpenMeet!
