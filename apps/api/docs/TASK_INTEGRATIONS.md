# Task Management Integrations Configuration

This document explains how to configure the real task management integrations for Asana, Jira, and Linear in the WorkflowAutomationService.

## Database Schema Updates

The following updates have been made to support external task integrations:

1. **IntegrationType enum** - Added support for:
   - `asana`
   - `jira`
   - `linear`

2. **Task model** - Added field:
   - `externalId` - Stores the ID of the task in the external system

## Integration Configuration

Each integration requires specific configuration stored in the `Integration` table:

### Asana Integration

```typescript
// Required in Integration.settings:
{
  workspaceId: "1234567890",      // Asana workspace ID
  projectId: "9876543210",        // Asana project ID
  assigneeMapping: {              // Optional: Map emails to Asana user IDs
    "user@example.com": "asana_user_id"
  }
}

// Required in Integration:
{
  type: "asana",
  accessToken: "1/1234567890:abcdef...",  // Personal Access Token or OAuth token
  isActive: true
}
```

### Jira Integration

```typescript
// Required in Integration.settings:
{
  host: "https://your-domain.atlassian.net",  // Jira instance URL
  projectKey: "PROJ",                          // Project key (e.g., "PROJ")
  email: "user@example.com",                   // Email for basic auth
  issueType: "Task",                           // Default issue type
  assigneeMapping: {                           // Optional: Map emails to Jira user IDs
    "user@example.com": "jira_user_id"
  }
}

// Required in Integration:
{
  type: "jira",
  accessToken: "your-api-token",  // Jira API token (not password)
  isActive: true
}
```

### Linear Integration

```typescript
// Required in Integration.settings:
{
  teamId: "TEAM-UUID",             // Linear team ID
  defaultStateId: "STATE-UUID",    // Optional: Default state for new issues
  assigneeMapping: {               // Optional: Map emails to Linear user IDs
    "user@example.com": "linear_user_id"
  }
}

// Required in Integration:
{
  type: "linear",
  accessToken: "lin_api_xxxxx",  // Linear API key
  isActive: true
}
```

## How to Set Up Integrations

### 1. Asana

1. Go to [Asana Developer Console](https://app.asana.com/0/developer-console)
2. Create a new Personal Access Token
3. Get your workspace ID and project ID from the Asana URL
4. Store the configuration in the database

### 2. Jira

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create a new API token
3. Get your Jira instance URL and project key
4. Store the configuration in the database

### 3. Linear

1. Go to [Linear API Settings](https://linear.app/settings/api)
2. Create a new Personal API Key
3. Get your team ID from Linear (Settings > Teams)
4. Store the configuration in the database

## Usage in Code

The `syncToExternalTaskSystem` method will:

1. Fetch the integration configuration from the database
2. Initialize the appropriate SDK client
3. Create tasks in the external system
4. Store the external task IDs in the database
5. Handle errors appropriately

Example workflow action configuration:

```typescript
{
  type: 'create_tasks',
  config: {
    externalSystem: 'asana',  // or 'jira' or 'linear'
    // ... other task configuration
  }
}
```

## Error Handling

The implementation includes comprehensive error handling:

- Missing integration configuration throws an error
- Missing access token throws an error
- Missing required settings (workspace, project, team) throws an error
- Individual task creation failures are logged and re-thrown
- All errors include context (system, meeting ID, task details)

## Security Considerations

1. **Access Tokens** - Store securely in the database, encrypted at rest
2. **Permissions** - Ensure tokens have only necessary permissions:
   - Asana: Task creation in specific workspace/project
   - Jira: Issue creation in specific project
   - Linear: Issue creation in specific team
3. **Validation** - Always validate integration exists and is active before use
4. **Logging** - Never log sensitive tokens or credentials

## Testing

Before deploying to production:

1. Test with real API credentials in a development environment
2. Verify tasks are created correctly in each system
3. Test error scenarios (invalid tokens, missing configuration)
4. Verify external IDs are stored correctly
5. Test with various task configurations (with/without due dates, assignees, etc.)

## Migration

Run the following to apply schema changes:

```bash
cd apps/api
pnpm prisma migrate dev --name add-external-task-integrations
pnpm prisma generate
```

## Monitoring

Monitor the following in production:

- Failed task syncs (check logs for "Failed to create" messages)
- API rate limits for each service
- Integration token expiration
- Task creation latency