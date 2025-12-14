#!/bin/bash
#
# E2E Transcription Test Script
#
# Tests the complete flow: MP3 upload -> Transcription -> AI Summary -> Templates
#
# Prerequisites:
# - API server running at localhost:4100
# - Database seeded with: npx ts-node prisma/seed-e2e-transcription.ts
# - An MP3 file to test with (provide as argument)
#
# Usage: ./scripts/test-e2e-transcription.sh [path-to-mp3-file]
#

set -e

API_BASE="${API_BASE:-http://localhost:4100/api}"
EMAIL="e2e-test@transcription.test"
PASSWORD="TestTranscribe123!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Install with: brew install jq"
    exit 1
fi

MP3_FILE="${1:-}"

echo -e "${BLUE}"
echo "========================================================"
echo "       E2E Transcription Test Suite"
echo "========================================================"
echo -e "${NC}"

# Step 1: Login
print_step "1. LOGIN - Getting JWT Token"

LOGIN_RESPONSE=$(curl -sf "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}" 2>&1) || {
    print_error "Login failed. Is the API server running at $API_BASE?"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
}

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .accessToken // .data.token // .data.accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    print_error "Could not extract token from login response"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

print_success "Logged in successfully"
print_info "Token: ${TOKEN:0:50}..."

# Step 2: Upload MP3 (if provided)
print_step "2. UPLOAD - MP3 File for Transcription"

if [ -z "$MP3_FILE" ]; then
    print_info "No MP3 file provided. Skipping upload step."
    print_info "To test upload, run: $0 /path/to/your/file.mp3"

    # Check for existing recordings instead
    print_info "Checking for existing recordings..."

    RECORDINGS_RESPONSE=$(curl -sf "$API_BASE/recordings" \
        -H "Authorization: Bearer $TOKEN" 2>&1) || {
        print_error "Failed to fetch recordings"
        echo "Response: $RECORDINGS_RESPONSE"
    }

    RECORDING_COUNT=$(echo "$RECORDINGS_RESPONSE" | jq -r '.data | length // 0')
    print_info "Found $RECORDING_COUNT existing recordings"

    if [ "$RECORDING_COUNT" -gt 0 ]; then
        MEETING_ID=$(echo "$RECORDINGS_RESPONSE" | jq -r '.data[0].meetingId // empty')
        RECORDING_ID=$(echo "$RECORDINGS_RESPONSE" | jq -r '.data[0].id // empty')
        print_success "Using existing recording: $RECORDING_ID"
        print_info "Meeting ID: $MEETING_ID"
    else
        print_info "No recordings found. Upload an MP3 to test the full flow."
        MEETING_ID=""
    fi
else
    if [ ! -f "$MP3_FILE" ]; then
        print_error "File not found: $MP3_FILE"
        exit 1
    fi

    print_info "Uploading: $MP3_FILE"

    UPLOAD_RESPONSE=$(curl -sf "$API_BASE/recordings/upload" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@$MP3_FILE" \
        -F "title=E2E Test Recording $(date +%Y%m%d_%H%M%S)" \
        -F "language=en" \
        -F "autoTranscribe=true" 2>&1) || {
        print_error "Upload failed"
        echo "Response: $UPLOAD_RESPONSE"
        exit 1
    }

    MEETING_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.meetingId // .data.meetingId // empty')
    RECORDING_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.recordingId // .data.recordingId // .id // .data.id // empty')

    if [ -z "$MEETING_ID" ] || [ "$MEETING_ID" == "null" ]; then
        print_error "Could not extract meeting ID from upload response"
        echo "Response: $UPLOAD_RESPONSE"
        exit 1
    fi

    print_success "File uploaded successfully"
    print_info "Meeting ID: $MEETING_ID"
    print_info "Recording ID: $RECORDING_ID"
fi

# Step 3: Check Transcription Status
print_step "3. TRANSCRIPTION - Check Status"

if [ -n "$MEETING_ID" ] && [ "$MEETING_ID" != "null" ]; then
    print_info "Checking transcription for meeting: $MEETING_ID"

    # Poll for transcription completion (max 60 seconds)
    MAX_WAIT=60
    WAIT_INTERVAL=5
    ELAPSED=0

    while [ $ELAPSED -lt $MAX_WAIT ]; do
        TRANSCRIPT_RESPONSE=$(curl -sf "$API_BASE/transcriptions/meeting/$MEETING_ID" \
            -H "Authorization: Bearer $TOKEN" 2>&1) || true

        TRANSCRIPT_STATUS=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.data[0].status // .status // "pending"')

        if [ "$TRANSCRIPT_STATUS" == "completed" ]; then
            print_success "Transcription completed!"
            TRANSCRIPT_ID=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.data[0].id // .id // empty')
            print_info "Transcript ID: $TRANSCRIPT_ID"

            # Get transcript text preview
            TRANSCRIPT_TEXT=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.data[0].fullText // .fullText // empty' | head -c 200)
            if [ -n "$TRANSCRIPT_TEXT" ]; then
                print_info "Preview: ${TRANSCRIPT_TEXT}..."
            fi
            break
        elif [ "$TRANSCRIPT_STATUS" == "failed" ]; then
            print_error "Transcription failed"
            echo "$TRANSCRIPT_RESPONSE" | jq
            break
        else
            print_info "Status: $TRANSCRIPT_STATUS (waiting... ${ELAPSED}s / ${MAX_WAIT}s)"
            sleep $WAIT_INTERVAL
            ELAPSED=$((ELAPSED + WAIT_INTERVAL))
        fi
    done

    if [ $ELAPSED -ge $MAX_WAIT ]; then
        print_info "Transcription still processing. Check back later."
    fi
else
    print_info "No meeting ID available. Skipping transcription check."
fi

# Step 4: Generate AI Summary
print_step "4. AI SUMMARY - Generate Summary"

if [ -n "$MEETING_ID" ] && [ "$MEETING_ID" != "null" ]; then
    print_info "Generating AI summary for meeting: $MEETING_ID"

    SUMMARY_RESPONSE=$(curl -sf "$API_BASE/ai/super-summary" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"meetingIds\": [\"$MEETING_ID\"], \"summaryType\": \"detailed\"}" 2>&1) || {
        print_info "AI summary generation not available or meeting needs transcription first"
        echo "Response: ${SUMMARY_RESPONSE:0:500}"
    }

    if echo "$SUMMARY_RESPONSE" | jq -e '.success // .data' &>/dev/null; then
        print_success "AI summary generated"
        echo "$SUMMARY_RESPONSE" | jq -r '.data.summary // .summary // "No summary text"' | head -c 500
        echo "..."
    fi
else
    print_info "No meeting ID available. Skipping AI summary."
fi

# Step 5: List Templates
print_step "5. TEMPLATES - List Available Templates"

TEMPLATES_RESPONSE=$(curl -sf "$API_BASE/templates" \
    -H "Authorization: Bearer $TOKEN" 2>&1) || {
    print_error "Failed to fetch templates"
    echo "Response: $TEMPLATES_RESPONSE"
}

TEMPLATE_COUNT=$(echo "$TEMPLATES_RESPONSE" | jq -r '.data | length // 0')
print_success "Found $TEMPLATE_COUNT templates"

if [ "$TEMPLATE_COUNT" -gt 0 ]; then
    echo ""
    echo "$TEMPLATES_RESPONSE" | jq -r '.data[] | "  - \(.name) (ID: \(.id))"'

    # Get first template ID for apply test
    TEMPLATE_ID=$(echo "$TEMPLATES_RESPONSE" | jq -r '.data[0].id // empty')
fi

# Step 6: Apply Template
print_step "6. TEMPLATES - Apply Template to Meeting"

if [ -n "$MEETING_ID" ] && [ "$MEETING_ID" != "null" ] && [ -n "$TEMPLATE_ID" ]; then
    print_info "Applying template $TEMPLATE_ID to meeting $MEETING_ID"

    APPLY_RESPONSE=$(curl -sf "$API_BASE/templates/$TEMPLATE_ID/apply" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"meetingId\": \"$MEETING_ID\",
            \"variableValues\": {
                \"meeting_title\": \"E2E Test Meeting\",
                \"date\": \"$(date +%Y-%m-%d)\",
                \"duration\": \"30 minutes\",
                \"key_points\": \"Test point 1, Test point 2\",
                \"action_items\": \"Action 1, Action 2\",
                \"next_steps\": \"Follow up next week\"
            }
        }" 2>&1) || {
        print_info "Template application may require completed transcription"
        echo "Response: ${APPLY_RESPONSE:0:500}"
    }

    if echo "$APPLY_RESPONSE" | jq -e '.success // .data' &>/dev/null; then
        print_success "Template applied successfully"
        echo "$APPLY_RESPONSE" | jq
    fi
else
    print_info "No meeting ID or template ID available. Skipping template application."
fi

# Summary
echo -e "\n${BLUE}"
echo "========================================================"
echo "       E2E Test Summary"
echo "========================================================"
echo -e "${NC}"

echo -e "Email:       ${GREEN}$EMAIL${NC}"
echo -e "API Base:    ${GREEN}$API_BASE${NC}"
echo -e "Token:       ${GREEN}${TOKEN:0:30}...${NC}"
[ -n "$MEETING_ID" ] && echo -e "Meeting ID:  ${GREEN}$MEETING_ID${NC}"
[ -n "$TEMPLATE_ID" ] && echo -e "Template ID: ${GREEN}$TEMPLATE_ID${NC}"

echo ""
echo "To upload an MP3 file, run:"
echo "  $0 /path/to/your/audio.mp3"
echo ""
