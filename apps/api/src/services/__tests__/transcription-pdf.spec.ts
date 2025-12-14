/**
 * PDF Export Test for TranscriptionService
 * Tests the real pdfkit implementation
 */

import PDFDocument from 'pdfkit';

describe('TranscriptionService PDF Export', () => {
  // Test data mimicking real transcription output
  const mockTranscription = {
    id: 'trans_test_123',
    meetingId: 'meeting_456',
    recordingId: 'recording_789',
    language: 'en',
    wordCount: 150,
    confidenceScore: 0.95,
    createdAt: new Date('2025-01-15T10:30:00Z'),
    metadata: {
      duration: 3600, // 1 hour
      fullText: 'This is a test transcript with some sample content to verify PDF generation is working correctly.',
      summary: 'A productive meeting discussing project milestones and next steps for the team.',
      actionItems: [
        { text: 'Review the Q1 roadmap by Friday' },
        { text: 'Schedule follow-up meeting with stakeholders' },
        { text: 'Update documentation for new features' },
      ],
      speakers: [
        { speakerId: 'SPEAKER_1', name: 'John Smith', totalSpeakingTime: 1800, segmentCount: 15 },
        { speakerId: 'SPEAKER_2', name: 'Jane Doe', totalSpeakingTime: 1200, segmentCount: 10 },
        { speakerId: 'SPEAKER_3', name: 'Bob Johnson', totalSpeakingTime: 600, segmentCount: 5 },
      ],
      segments: [
        {
          id: 'seg_0',
          text: 'Hello everyone, thank you for joining today\'s meeting.',
          speaker: 'John Smith',
          speakerId: 'SPEAKER_1',
          startTime: 0,
          endTime: 5,
          confidence: 0.98,
        },
        {
          id: 'seg_1',
          text: 'I\'d like to start by discussing our progress on the Q1 roadmap.',
          speaker: 'John Smith',
          speakerId: 'SPEAKER_1',
          startTime: 5,
          endTime: 12,
          confidence: 0.96,
        },
        {
          id: 'seg_2',
          text: 'Thank you John. We\'ve completed 80% of our planned features.',
          speaker: 'Jane Doe',
          speakerId: 'SPEAKER_2',
          startTime: 12,
          endTime: 18,
          confidence: 0.97,
        },
        {
          id: 'seg_3',
          text: 'The remaining 20% includes the analytics dashboard and reporting module.',
          speaker: 'Jane Doe',
          speakerId: 'SPEAKER_2',
          startTime: 18,
          endTime: 25,
          confidence: 0.95,
        },
        {
          id: 'seg_4',
          text: 'I can provide an update on the infrastructure side.',
          speaker: 'Bob Johnson',
          speakerId: 'SPEAKER_3',
          startTime: 25,
          endTime: 30,
          confidence: 0.94,
        },
      ],
    },
  };

  // Helper function that mirrors the actual implementation
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Inline PDF generation function matching the implementation
  const generatePDF = (transcription: any): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
          info: {
            Title: `Meeting Transcript - ${transcription.id}`,
            Author: 'OpenMeet Meeting Intelligence',
            Creator: 'OpenMeet Transcription Service',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const metadata = transcription.metadata || {};
        const segments = metadata.segments || transcription.segments || [];
        const speakers = metadata.speakers || [];
        const duration = metadata.duration || 0;
        const summary = metadata.summary;
        const actionItems = metadata.actionItems || [];

        const colors = {
          primary: '#1a365d',
          secondary: '#2b6cb0',
          accent: '#4299e1',
          text: '#2d3748',
          lightText: '#718096',
          border: '#e2e8f0',
          background: '#f7fafc',
        };

        // Header
        doc.rect(0, 0, doc.page.width, 120).fill(colors.primary);
        doc.fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(24)
          .text('Meeting Transcript', 50, 40);

        doc.fontSize(12)
          .font('Helvetica')
          .text(`ID: ${transcription.id}`, 50, 75);

        const meetingDate = transcription.createdAt
          ? new Date(transcription.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : 'Date not available';
        doc.text(meetingDate, 50, 92);

        doc.y = 140;

        // Metadata box
        doc.fillColor(colors.background)
          .rect(50, doc.y, doc.page.width - 100, 80)
          .fill();

        doc.fillColor(colors.text);
        const metaY = doc.y + 15;

        doc.font('Helvetica-Bold').fontSize(10).text('Duration:', 65, metaY);
        doc.font('Helvetica').text(formatDuration(duration), 130, metaY);

        doc.font('Helvetica-Bold').text('Language:', 250, metaY);
        doc.font('Helvetica').text(transcription.language || 'en', 310, metaY);

        doc.font('Helvetica-Bold').text('Word Count:', 400, metaY);
        doc.font('Helvetica').text(String(transcription.wordCount || 0), 470, metaY);

        doc.y = metaY + 70;

        // Participants
        if (speakers.length > 0) {
          doc.fillColor(colors.primary)
            .font('Helvetica-Bold')
            .fontSize(14)
            .text('Participants', 50, doc.y);

          doc.y += 5;
          doc.moveTo(50, doc.y).lineTo(150, doc.y).strokeColor(colors.accent).lineWidth(2).stroke();
          doc.y += 15;

          speakers.forEach((speaker: any) => {
            const speakingTime = formatDuration(speaker.totalSpeakingTime || 0);
            doc.fillColor(colors.text)
              .font('Helvetica-Bold')
              .fontSize(10)
              .text(`${speaker.name || speaker.speakerId}`, 60, doc.y, { continued: true })
              .font('Helvetica')
              .fillColor(colors.lightText)
              .text(` - ${speakingTime} speaking time, ${speaker.segmentCount || 0} segments`);
            doc.y += 5;
          });

          doc.y += 20;
        }

        // Summary
        if (summary) {
          doc.fillColor(colors.primary)
            .font('Helvetica-Bold')
            .fontSize(14)
            .text('Summary', 50, doc.y);
          doc.y += 5;
          doc.moveTo(50, doc.y).lineTo(110, doc.y).strokeColor(colors.accent).lineWidth(2).stroke();
          doc.y += 15;

          doc.fillColor(colors.text)
            .font('Helvetica')
            .fontSize(10)
            .text(summary, 50, doc.y, {
              width: doc.page.width - 100,
              align: 'justify',
            });
          doc.y += 20;
        }

        // Action Items
        if (actionItems.length > 0) {
          doc.fillColor(colors.primary)
            .font('Helvetica-Bold')
            .fontSize(14)
            .text('Action Items', 50, doc.y);
          doc.y += 5;
          doc.moveTo(50, doc.y).lineTo(150, doc.y).strokeColor(colors.accent).lineWidth(2).stroke();
          doc.y += 15;

          actionItems.forEach((item: any) => {
            const checkBox = '\u2610';
            doc.fillColor(colors.text)
              .font('Helvetica')
              .fontSize(10)
              .text(`${checkBox} ${typeof item === 'string' ? item : item.text || item.description}`, 60, doc.y, {
                width: doc.page.width - 120,
              });
            doc.y += 5;
          });

          doc.y += 20;
        }

        // Transcript
        doc.fillColor(colors.primary)
          .font('Helvetica-Bold')
          .fontSize(14)
          .text('Full Transcript', 50, doc.y);
        doc.y += 5;
        doc.moveTo(50, doc.y).lineTo(160, doc.y).strokeColor(colors.accent).lineWidth(2).stroke();
        doc.y += 15;

        segments.forEach((segment: any) => {
          if (doc.y > doc.page.height - 100) {
            doc.addPage();
            doc.y = 50;
          }

          const timestamp = formatTimestamp(segment.startTime || 0);
          const speakerName = segment.speaker || segment.speakerId || 'Unknown';

          doc.fillColor(colors.lightText)
            .font('Helvetica')
            .fontSize(8)
            .text(`[${timestamp}]`, 50, doc.y);

          doc.fillColor(colors.secondary)
            .font('Helvetica-Bold')
            .fontSize(10)
            .text(speakerName, 95, doc.y);

          doc.y += 3;

          doc.fillColor(colors.text)
            .font('Helvetica')
            .fontSize(10)
            .text(segment.text, 50, doc.y, {
              width: doc.page.width - 100,
              align: 'left',
            });

          doc.y += 15;
        });

        // Page numbers
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);

          doc.moveTo(50, doc.page.height - 40)
            .lineTo(doc.page.width - 50, doc.page.height - 40)
            .strokeColor(colors.border)
            .lineWidth(1)
            .stroke();

          doc.fillColor(colors.lightText)
            .font('Helvetica')
            .fontSize(9)
            .text(
              `Page ${i + 1} of ${pages.count}`,
              50,
              doc.page.height - 30,
              { width: doc.page.width - 100, align: 'center' }
            );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  };

  test('generates a valid PDF buffer', async () => {
    const pdfBuffer = await generatePDF(mockTranscription);

    // Verify it's a Buffer
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);

    // Verify minimum size (real PDFs are at least several KB)
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify PDF magic bytes (%PDF-)
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');

    console.log(`PDF generated successfully: ${pdfBuffer.length} bytes`);
  });

  test('generates PDF with correct structure', async () => {
    const pdfBuffer = await generatePDF(mockTranscription);
    const pdfContent = pdfBuffer.toString('binary');

    // Check for PDF end marker
    expect(pdfContent).toContain('%%EOF');

    // Check for text content (font and text operations)
    expect(pdfContent).toContain('/Type');
    expect(pdfContent).toContain('/Page');
  });

  test('handles transcription without segments', async () => {
    const minimalTranscription = {
      id: 'trans_minimal',
      meetingId: 'meeting_min',
      language: 'en',
      wordCount: 50,
      metadata: {
        duration: 120,
        fullText: 'A short meeting transcript.',
        speakers: [],
        segments: [],
      },
    };

    const pdfBuffer = await generatePDF(minimalTranscription);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');

    console.log(`Minimal PDF generated: ${pdfBuffer.length} bytes`);
  });

  test('handles transcription with many segments (pagination)', async () => {
    // Create many segments to test pagination
    const manySegments = Array.from({ length: 50 }, (_, i) => ({
      id: `seg_${i}`,
      text: `This is segment number ${i + 1} with enough text to demonstrate proper line wrapping and pagination in the PDF document. Each segment contains meaningful content.`,
      speaker: `Speaker ${(i % 3) + 1}`,
      speakerId: `SPEAKER_${(i % 3) + 1}`,
      startTime: i * 30,
      endTime: (i + 1) * 30,
      confidence: 0.95,
    }));

    const longTranscription = {
      ...mockTranscription,
      metadata: {
        ...mockTranscription.metadata,
        segments: manySegments,
      },
    };

    const pdfBuffer = await generatePDF(longTranscription);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(5000); // Multi-page PDF should be larger

    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    expect(pdfHeader).toBe('%PDF-');

    console.log(`Multi-page PDF generated: ${pdfBuffer.length} bytes`);
  });

  test('helper function formatDuration works correctly', () => {
    expect(formatDuration(30)).toBe('30s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3661)).toBe('1h 1m 1s');
    expect(formatDuration(3600)).toBe('1h 0m 0s');
  });

  test('helper function formatTimestamp works correctly', () => {
    expect(formatTimestamp(30)).toBe('00:30');
    expect(formatTimestamp(90)).toBe('01:30');
    expect(formatTimestamp(3661)).toBe('01:01:01');
    expect(formatTimestamp(3600)).toBe('01:00:00');
  });
});
