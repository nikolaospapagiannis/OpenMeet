/**
 * E2E Tests - Meeting Creation Flow
 * Tests for creating meetings and uploading recordings
 */

import { testUsers, testMeetings, validationMessages, fileFixtures } from '../../support/test-data';
import { selectors } from '../../support/selectors';
import ApiHelper from '../../support/api-helpers';

describe('Meeting Creation', () => {
  beforeEach(() => {
    ApiHelper.setupAllInterceptors();
    cy.login(testUsers.validUser.email, testUsers.validUser.password);
    cy.visit('/meetings');
  });

  describe('Create Meeting Modal', () => {
    it('should open create meeting modal', () => {
      cy.log('Testing create meeting modal');
      cy.get(selectors.meetings.createButton).click();
      cy.get(selectors.meetingForm.form).should('be.visible');
    });

    it('should display all form fields', () => {
      cy.log('Verifying form fields');
      cy.get(selectors.meetings.createButton).click();

      cy.get(selectors.meetingForm.titleInput).should('be.visible');
      cy.get(selectors.meetingForm.descriptionInput).should('be.visible');
      cy.get(selectors.meetingForm.dateInput).should('be.visible');
      cy.get(selectors.meetingForm.submitButton).should('be.visible');
    });

    it('should close modal on cancel', () => {
      cy.log('Testing modal close');
      cy.get(selectors.meetings.createButton).click();
      cy.get(selectors.meetingForm.cancelButton).click();
      cy.get(selectors.meetingForm.form).should('not.exist');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      cy.get(selectors.meetings.createButton).click();
    });

    it('should require meeting title', () => {
      cy.log('Testing title required validation');
      cy.get(selectors.meetingForm.descriptionInput).type('Test description');
      cy.get(selectors.meetingForm.submitButton).click();
      cy.contains(validationMessages.meeting.titleRequired).should('be.visible');
    });

    it('should validate title length', () => {
      cy.log('Testing title length validation');
      const longTitle = 'a'.repeat(256);
      cy.get(selectors.meetingForm.titleInput).type(longTitle);
      cy.get(selectors.meetingForm.submitButton).click();
      cy.contains('Title is too long').should('be.visible');
    });

    it('should accept valid meeting data', () => {
      cy.log('Testing valid meeting data');
      cy.get(selectors.meetingForm.titleInput).type(testMeetings.standardMeeting.title);
      cy.get(selectors.meetingForm.descriptionInput).type(testMeetings.standardMeeting.description);
      cy.get(selectors.meetingForm.submitButton).click();

      cy.wait('@createMeeting');
      cy.contains('Meeting created').should('be.visible');
    });
  });

  describe('File Upload', () => {
    beforeEach(() => {
      cy.get(selectors.meetings.uploadButton).click();
    });

    it('should display file upload area', () => {
      cy.log('Verifying file upload area');
      cy.get(selectors.meetingForm.fileInput).should('exist');
      cy.contains('Drop files here').should('be.visible');
    });

    it('should accept audio files', () => {
      cy.log('Testing audio file upload');
      cy.uploadFile(fileFixtures.audioFile, 'audio/mp3');
      cy.wait('@uploadRecording');
      cy.contains('Processing').should('be.visible');
    });

    it('should accept video files', () => {
      cy.log('Testing video file upload');
      cy.uploadFile(fileFixtures.videoFile, 'video/mp4');
      cy.wait('@uploadRecording');
      cy.contains('Processing').should('be.visible');
    });

    it('should reject invalid file types', () => {
      cy.log('Testing invalid file type rejection');
      cy.uploadFile(fileFixtures.invalidFile, 'text/plain');
      cy.contains(validationMessages.meeting.invalidFileType).should('be.visible');
    });

    it('should validate file size', () => {
      cy.log('Testing file size validation');
      cy.intercept('POST', `${Cypress.env('API_URL')}/meetings/upload`, {
        statusCode: 413,
        body: {
          error: 'File too large',
          maxSize: '100MB',
        },
      }).as('uploadTooLarge');

      cy.uploadFile(fileFixtures.largeFile);
      cy.wait('@uploadTooLarge');
      cy.contains('File too large').should('be.visible');
    });
  });

  describe('Upload Progress', () => {
    it('should show upload progress indicator', () => {
      cy.log('Testing upload progress');
      cy.get(selectors.meetings.uploadButton).click();

      cy.intercept('POST', `${Cypress.env('API_URL')}/meetings/upload`, (req) => {
        req.reply((res) => {
          res.delay = 2000;
          res.send({
            statusCode: 200,
            body: { status: 'processing' },
          });
        });
      }).as('uploadSlow');

      cy.uploadFile(fileFixtures.audioFile);
      cy.get('[data-testid="upload-progress"]').should('be.visible');
      cy.get('[data-testid="progress-bar"]').should('exist');
    });

    it('should display processing status after upload', () => {
      cy.log('Testing processing status');
      cy.get(selectors.meetings.uploadButton).click();
      cy.uploadFile(fileFixtures.audioFile);
      cy.wait('@uploadRecording');

      cy.contains('Processing').should('be.visible');
      cy.get('[data-testid="processing-spinner"]').should('be.visible');
    });

    it('should allow cancelling upload', () => {
      cy.log('Testing upload cancellation');
      cy.get(selectors.meetings.uploadButton).click();

      cy.intercept('POST', `${Cypress.env('API_URL')}/meetings/upload`, (req) => {
        req.reply((res) => {
          res.delay = 5000;
          res.send();
        });
      }).as('uploadCancellable');

      cy.uploadFile(fileFixtures.audioFile);
      cy.get('[data-testid="cancel-upload"]').click();
      cy.contains('Upload cancelled').should('be.visible');
    });
  });

  describe('Create Meeting with Custom Command', () => {
    it('should create meeting using custom command', () => {
      cy.log('Testing custom createMeeting command');
      cy.createMeeting('Command Test Meeting', 'Created via custom command');
      cy.wait('@createMeeting');
      cy.getBySel('meetings-list').should('contain', 'Command Test Meeting');
    });
  });

  describe('Bulk Upload', () => {
    it('should support multiple file uploads', () => {
      cy.log('Testing bulk upload');
      cy.get(selectors.meetings.uploadButton).click();

      cy.intercept('POST', `${Cypress.env('API_URL')}/meetings/upload`, {
        statusCode: 200,
        body: {
          files: [
            { id: 'file-1', status: 'processing' },
            { id: 'file-2', status: 'processing' },
          ],
        },
      }).as('bulkUpload');

      cy.get(selectors.meetingForm.fileInput).selectFile(
        [
          `cypress/fixtures/${fileFixtures.audioFile}`,
          `cypress/fixtures/${fileFixtures.videoFile}`,
        ],
        { force: true }
      );

      cy.wait('@bulkUpload');
      cy.contains('2 files uploaded').should('be.visible');
    });
  });

  describe('Drag and Drop Upload', () => {
    it('should support drag and drop file upload', () => {
      cy.log('Testing drag and drop upload');
      cy.get(selectors.meetings.uploadButton).click();

      const dropZone = '[data-testid="drop-zone"]';
      cy.get(dropZone).selectFile(`cypress/fixtures/${fileFixtures.audioFile}`, {
        action: 'drag-drop',
        force: true,
      });

      cy.wait('@uploadRecording');
      cy.contains('Processing').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle upload errors gracefully', () => {
      cy.log('Testing upload error handling');
      cy.get(selectors.meetings.uploadButton).click();

      ApiHelper.mockApiError('POST', `${Cypress.env('API_URL')}/meetings/upload`, 500);

      cy.uploadFile(fileFixtures.audioFile);
      cy.contains('Upload failed').should('be.visible');
    });

    it('should handle network errors', () => {
      cy.log('Testing network error handling');
      cy.get(selectors.meetings.createButton).click();

      ApiHelper.mockApiError('POST', `${Cypress.env('API_URL')}/meetings`, 503);

      cy.get(selectors.meetingForm.titleInput).type('Test Meeting');
      cy.get(selectors.meetingForm.submitButton).click();

      cy.contains('Service unavailable').should('be.visible');
    });
  });
});
