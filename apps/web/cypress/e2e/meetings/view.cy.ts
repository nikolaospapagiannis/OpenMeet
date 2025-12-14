/**
 * E2E Tests - Meeting View
 * Tests for viewing meeting details, transcripts, and summaries
 */

import { testUsers } from '../../support/test-data';
import { selectors } from '../../support/selectors';
import ApiHelper from '../../support/api-helpers';

describe('Meeting View', () => {
  beforeEach(() => {
    ApiHelper.setupAllInterceptors();
    cy.login(testUsers.validUser.email, testUsers.validUser.password);
    cy.visit('/meetings');
  });

  describe('Meetings List View', () => {
    it('should display meetings list', () => {
      cy.log('Verifying meetings list display');
      cy.wait('@getMeetings');
      cy.get(selectors.meetings.list).should('be.visible');
      cy.get(selectors.meetings.card).should('have.length.greaterThan', 0);
    });

    it('should display meeting cards with correct information', () => {
      cy.log('Verifying meeting card information');
      cy.wait('@getMeetings');
      cy.get(selectors.meetings.card).first().within(() => {
        cy.get(selectors.meetings.title).should('be.visible');
        cy.get(selectors.meetings.statusBadge).should('be.visible');
        cy.contains(/\d+ participants?/).should('be.visible');
      });
    });

    it('should handle empty meetings list', () => {
      cy.log('Testing empty state');
      cy.intercept('GET', `${Cypress.env('API_URL')}/meetings*`, {
        statusCode: 200,
        body: { meetings: [], total: 0 },
      }).as('emptyMeetings');

      cy.reload();
      cy.wait('@emptyMeetings');
      cy.get(selectors.meetings.emptyState).should('be.visible');
      cy.contains('No meetings found').should('be.visible');
    });

    it('should show loading state while fetching meetings', () => {
      cy.log('Testing loading state');
      ApiHelper.mockNetworkDelay('GET', `${Cypress.env('API_URL')}/meetings*`, 2000);

      cy.reload();
      cy.get(selectors.meetings.loadingSpinner).should('be.visible');
    });
  });

  describe('Meeting Details Navigation', () => {
    it('should navigate to meeting details on card click', () => {
      cy.log('Testing navigation to details');
      cy.wait('@getMeetings');
      cy.get(selectors.meetings.card).first().click();

      cy.wait('@getMeeting');
      cy.url().should('match', /\/meetings\/[a-zA-Z0-9-]+$/);
      cy.get(selectors.meetingDetails.container).should('be.visible');
    });

    it('should display meeting title and description', () => {
      cy.log('Verifying meeting details');
      cy.wait('@getMeetings');
      cy.get(selectors.meetings.card).first().click();
      cy.wait('@getMeeting');

      cy.get(selectors.meetingDetails.title).should('be.visible');
      cy.get(selectors.meetingDetails.description).should('be.visible');
    });

    it('should display participants list', () => {
      cy.log('Verifying participants display');
      cy.wait('@getMeetings');
      cy.get(selectors.meetings.card).first().click();
      cy.wait('@getMeeting');

      cy.get(selectors.meetingDetails.participantsList).should('be.visible');
      cy.get(selectors.meetingDetails.participant).should('have.length.greaterThan', 0);
    });
  });

  describe('Transcript Tab', () => {
    beforeEach(() => {
      cy.wait('@getMeetings');
      cy.get(selectors.meetings.card).first().click();
      cy.wait('@getMeeting');
    });

    it('should display transcript tab', () => {
      cy.log('Verifying transcript tab');
      cy.get(selectors.meetingDetails.transcriptTab).should('be.visible').click();
      cy.get(selectors.meetingDetails.transcriptContent).should('be.visible');
    });

    it('should display transcript segments with speakers', () => {
      cy.log('Verifying transcript segments');
      cy.get(selectors.meetingDetails.transcriptTab).click();
      cy.wait('@getTranscript');

      cy.get(selectors.meetingDetails.transcriptSegment).should('have.length.greaterThan', 0);
      cy.get(selectors.meetingDetails.speaker).first().should('be.visible');
    });

    it('should display timestamps for each segment', () => {
      cy.log('Verifying timestamps');
      cy.get(selectors.meetingDetails.transcriptTab).click();
      cy.wait('@getTranscript');

      cy.get(selectors.meetingDetails.timestamp).should('have.length.greaterThan', 0);
    });

    it('should allow searching within transcript', () => {
      cy.log('Testing transcript search');
      cy.get(selectors.meetingDetails.transcriptTab).click();
      cy.wait('@getTranscript');

      cy.get('[data-testid="transcript-search"]').type('authentication');
      cy.get(selectors.meetingDetails.transcriptSegment).should('contain', 'authentication');
    });

    it('should highlight search results in transcript', () => {
      cy.log('Testing search highlighting');
      cy.get(selectors.meetingDetails.transcriptTab).click();
      cy.wait('@getTranscript');

      cy.get('[data-testid="transcript-search"]').type('feature');
      cy.get('[data-testid="highlight"]').should('exist');
    });
  });

  describe('Summary Tab', () => {
    beforeEach(() => {
      cy.wait('@getMeetings');
      cy.get(selectors.meetings.card).first().click();
      cy.wait('@getMeeting');
    });

    it('should display summary tab', () => {
      cy.log('Verifying summary tab');
      cy.get(selectors.meetingDetails.summaryTab).should('be.visible').click();
      cy.get(selectors.meetingDetails.summaryOverview).should('be.visible');
    });

    it('should display action items', () => {
      cy.log('Verifying action items');
      cy.get(selectors.meetingDetails.summaryTab).click();

      cy.get(selectors.meetingDetails.actionItems).should('be.visible');
      cy.get(selectors.meetingDetails.actionItem).should('have.length.greaterThan', 0);
    });

    it('should display key points', () => {
      cy.log('Verifying key points');
      cy.get(selectors.meetingDetails.summaryTab).click();

      cy.get(selectors.meetingDetails.keyPoints).should('be.visible');
    });

    it('should display decisions', () => {
      cy.log('Verifying decisions');
      cy.get(selectors.meetingDetails.summaryTab).click();

      cy.get(selectors.meetingDetails.decisions).should('be.visible');
    });

    it('should allow marking action items as complete', () => {
      cy.log('Testing action item completion');
      cy.get(selectors.meetingDetails.summaryTab).click();

      cy.get(selectors.meetingDetails.actionItem).first().within(() => {
        cy.get('input[type="checkbox"]').check();
      });

      cy.contains('Action item completed').should('be.visible');
    });
  });

  describe('Comments Tab', () => {
    beforeEach(() => {
      cy.wait('@getMeetings');
      cy.get(selectors.meetings.card).first().click();
      cy.wait('@getMeeting');
    });

    it('should display comments tab', () => {
      cy.log('Verifying comments tab');
      cy.get(selectors.meetingDetails.commentsTab).should('be.visible').click();
      cy.get(selectors.meetingDetails.commentsList).should('be.visible');
    });

    it('should allow adding a comment', () => {
      cy.log('Testing add comment');
      cy.get(selectors.meetingDetails.commentsTab).click();

      const commentText = 'This is a test comment';
      cy.get(selectors.meetingDetails.commentInput).type(commentText);
      cy.get(selectors.meetingDetails.addCommentButton).click();

      cy.contains(commentText).should('be.visible');
    });

    it('should display existing comments', () => {
      cy.log('Verifying existing comments');
      cy.intercept('GET', `${Cypress.env('API_URL')}/meetings/*/comments`, {
        statusCode: 200,
        body: {
          comments: [
            { id: '1', text: 'First comment', author: 'John Doe' },
            { id: '2', text: 'Second comment', author: 'Jane Smith' },
          ],
        },
      }).as('getComments');

      cy.get(selectors.meetingDetails.commentsTab).click();
      cy.wait('@getComments');

      cy.get(selectors.meetingDetails.comment).should('have.length', 2);
    });

    it('should allow deleting own comments', () => {
      cy.log('Testing delete comment');
      cy.get(selectors.meetingDetails.commentsTab).click();

      cy.get(selectors.meetingDetails.comment).first().within(() => {
        cy.get(selectors.meetingDetails.deleteCommentButton).click();
      });

      cy.get(selectors.common.confirmButton).click();
      cy.contains('Comment deleted').should('be.visible');
    });
  });

  describe('Audio Playback', () => {
    beforeEach(() => {
      cy.wait('@getMeetings');
      cy.get(selectors.meetings.card).first().click();
      cy.wait('@getMeeting');
    });

    it('should display audio player', () => {
      cy.log('Verifying audio player');
      cy.get(selectors.meetingDetails.audioPlayer).should('be.visible');
    });

    it('should play and pause audio', () => {
      cy.log('Testing play/pause controls');
      cy.get(selectors.meetingDetails.playButton).click();
      cy.get(selectors.meetingDetails.pauseButton).should('be.visible');

      cy.get(selectors.meetingDetails.pauseButton).click();
      cy.get(selectors.meetingDetails.playButton).should('be.visible');
    });

    it('should allow seeking in audio', () => {
      cy.log('Testing seek functionality');
      cy.get(selectors.meetingDetails.seekBar).should('be.visible');
      cy.get(selectors.meetingDetails.seekBar).click('center');
    });

    it('should sync transcript with audio playback', () => {
      cy.log('Testing transcript sync');
      cy.get(selectors.meetingDetails.transcriptTab).click();
      cy.wait('@getTranscript');

      cy.get(selectors.meetingDetails.playButton).click();
      cy.get('[data-testid="active-segment"]').should('exist');
    });
  });

  describe('Meeting Actions', () => {
    beforeEach(() => {
      cy.wait('@getMeetings');
      cy.get(selectors.meetings.card).first().click();
      cy.wait('@getMeeting');
    });

    it('should allow editing meeting details', () => {
      cy.log('Testing edit meeting');
      cy.get(selectors.meetings.editButton).click();
      cy.get(selectors.meetingForm.titleInput).clear().type('Updated Title');
      cy.get(selectors.meetingForm.submitButton).click();

      cy.wait('@updateMeeting');
      cy.contains('Meeting updated').should('be.visible');
    });

    it('should allow deleting meeting', () => {
      cy.log('Testing delete meeting');
      cy.get(selectors.meetings.deleteButton).click();
      cy.get(selectors.common.confirmButton).click();

      cy.wait('@deleteMeeting');
      cy.url().should('include', '/meetings');
      cy.contains('Meeting deleted').should('be.visible');
    });

    it('should allow sharing meeting', () => {
      cy.log('Testing share meeting');
      cy.get('[data-testid="share-button"]').click();
      cy.get('[data-testid="share-modal"]').should('be.visible');
      cy.get('[data-testid="copy-link"]').click();
      cy.contains('Link copied').should('be.visible');
    });
  });
});
