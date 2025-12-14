# CalendarSync Integration - Refactoring Required

## Issue Summary

The `calendarSync.ts` integration file has significant type mismatches with the Prisma schema. The code was written assuming a different database schema structure than what currently exists.

## Schema Mismatch

### Current Prisma Schema (`CalendarSync` model)
```prisma
model CalendarSync {
  id               String   @id @default(uuid())
  meetingId        String
  meeting          Meeting  @relation(fields: [meetingId], references: [id])
  userId           String
  calendarProvider String   // google, outlook, etc.
  externalEventId  String
  calendarId       String?
  syncedAt         DateTime @default(now())
  lastSyncedAt     DateTime @updatedAt
  syncStatus       String   @default("synced")
  metadata         Json     @default("{}")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([calendarProvider, externalEventId])
  @@map("calendar_sync")
}
```

**Purpose**: Tracks individual calendar event syncs (one record per synced event)

###Code Expectations
The `calendarSync.ts` code expects these additional fields (which don't exist):
- `organizationId`
- `providers` (array of provider names)
- `syncDirection` (enum: bidirectional, import_only, export_only)
- `autoRecord` (boolean)
- `syncPastDays` (number)
- `syncFutureDays` (number)
- `filterKeywords` (array)
- `excludePrivate` (boolean)
- `isActive` (boolean)

**Intended Purpose**: Configuration for calendar sync settings (one record per user)

## Root Cause

The code was written for a **CalendarSyncConfig** model that doesn't exist. The current `CalendarSync` model is for tracking individual event syncs, not storing user configuration.

## Solutions

### Option 1: Create New Model (Recommended)
Create a `CalendarSyncConfig` model to store user-level configuration:

```prisma
model CalendarSyncConfig {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  organizationId  String?
  organization    Organization? @relation(fields: [organizationId], references: [id])
  providers       String[] // ['google', 'outlook']
  syncDirection   String   @default("bidirectional")
  autoRecord      Boolean  @default(false)
  syncPastDays    Int      @default(7)
  syncFutureDays  Int      @default(30)
  filterKeywords  String[]
  excludePrivate  Boolean  @default(false)
  isActive        Boolean  @default(true)
  lastSyncedAt    DateTime @updatedAt
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
  @@index([organizationId])
  @@index([isActive])
}
```

### Option 2: Store Config in Integration Metadata
Store calendar sync configuration in the `Integration` model's `metadata` field:

```typescript
// When creating/updating integration
await prisma.integration.update({
  where: { id: integrationId },
  data: {
    metadata: {
      calendarSync: {
        providers: ['google', 'outlook'],
        syncDirection: 'bidirectional',
        autoRecord: false,
        syncPastDays: 7,
        syncFutureDays: 30,
        filterKeywords: [],
        excludePrivate: false,
        isActive: true,
      }
    }
  }
});
```

### Option 3: Disable Calendar Sync (Temporary)
Temporarily disable calendar sync integration until proper refactoring:
- Comment out calendar sync routes
- Remove calendar sync from integration options
- Document as "Coming Soon" feature

## Recommended Action

**Short-term** (for immediate fix):
- Use Option 2 (store in Integration metadata)
- Update `calendarSync.ts` to read/write from Integration model
- Keep CalendarSync model for tracking individual event syncs

**Long-term** (for proper architecture):
- Use Option 1 (create CalendarSyncConfig model)
- Run database migration
- Update all calendar sync code
- Add comprehensive tests

## Files Affected

- `src/integrations/calendarSync.ts` (750+ lines)
- `src/routes/integrations.ts` (calendar sync endpoints)
- Potentially other files that import calendarSync

## Errors Count

Approximately **80+ TypeScript errors** stem from this issue.

## Workaround Applied

Currently, the problematic upsert operations have been commented out with notes indicating they need refactoring. The configuration is stored as local variables but not persisted to database.

## Testing Impact

Calendar sync functionality is **NOT OPERATIONAL** until refactoring is complete. Other integrations (Google Meet, Zoom, Teams, Slack, HubSpot, Salesforce) are unaffected.

---

**Status**: Documented for future refactoring
**Priority**: Medium (feature not used in MVP)
**Estimated Effort**: 4-6 hours for proper refactoring with Option 1
