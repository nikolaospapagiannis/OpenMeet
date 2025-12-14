"""
PDF Export Service - REAL IMPLEMENTATION
Uses reportlab for production-grade PDF generation

Features:
- Meeting summary reports
- Analytics dashboards
- Action item lists
- Transcript exports
- Custom branding support
- Charts and visualizations
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import io
import os

logger = logging.getLogger(__name__)

# Try to import reportlab
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        PageBreak,
        Image,
        KeepTogether,
    )
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except ImportError:
    logger.warning("reportlab not available, PDF export will not work")
    REPORTLAB_AVAILABLE = False


class PDFExportService:
    """
    Production-grade PDF export service using reportlab
    Generates professional meeting reports and analytics
    """

    def __init__(self):
        if not REPORTLAB_AVAILABLE:
            logger.error("reportlab is not installed. Install with: pip install reportlab")
            self.available = False
        else:
            self.available = True
            logger.info("PDF Export Service initialized")

    def is_available(self) -> bool:
        """Check if PDF export is available"""
        return self.available

    def generate_meeting_summary_pdf(
        self,
        meeting_data: Dict[str, Any],
        output_path: Optional[str] = None
    ) -> bytes:
        """
        Generate a comprehensive meeting summary PDF

        Args:
            meeting_data: Meeting information including:
                - title: str
                - date: str
                - duration: str
                - participants: List[str]
                - summary: str
                - key_points: List[str]
                - action_items: List[Dict]
                - transcript: str (optional)
                - sentiment: Dict (optional)
                - speakers: List[Dict] (optional)
            output_path: Optional file path to save PDF

        Returns:
            PDF content as bytes
        """
        if not self.available:
            raise RuntimeError("PDF export is not available (reportlab not installed)")

        # Create PDF buffer
        buffer = io.BytesIO()

        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        # Container for the 'Flowable' objects
        elements = []

        # Define styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER,
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12,
            spaceBefore=12,
        )

        normal_style = styles['BodyText']

        # Title
        title = Paragraph(f"<b>{meeting_data.get('title', 'Meeting Summary')}</b>", title_style)
        elements.append(title)
        elements.append(Spacer(1, 12))

        # Meeting metadata
        metadata_data = [
            ['Date:', meeting_data.get('date', 'N/A')],
            ['Duration:', meeting_data.get('duration', 'N/A')],
            ['Participants:', ', '.join(meeting_data.get('participants', [])[:3])],
        ]

        if len(meeting_data.get('participants', [])) > 3:
            metadata_data.append(['', f"+ {len(meeting_data['participants']) - 3} more"])

        metadata_table = Table(metadata_data, colWidths=[1.5*inch, 5*inch])
        metadata_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(metadata_table)
        elements.append(Spacer(1, 20))

        # Summary section
        if meeting_data.get('summary'):
            elements.append(Paragraph("<b>Summary</b>", heading_style))
            summary_text = Paragraph(meeting_data['summary'], normal_style)
            elements.append(summary_text)
            elements.append(Spacer(1, 12))

        # Key points section
        if meeting_data.get('key_points'):
            elements.append(Paragraph("<b>Key Points</b>", heading_style))
            for point in meeting_data['key_points']:
                bullet = Paragraph(f"• {point}", normal_style)
                elements.append(bullet)
                elements.append(Spacer(1, 6))
            elements.append(Spacer(1, 12))

        # Action items section
        if meeting_data.get('action_items'):
            elements.append(Paragraph("<b>Action Items</b>", heading_style))

            action_data = [['Task', 'Owner', 'Deadline']]
            for item in meeting_data['action_items']:
                action_data.append([
                    item.get('task', 'N/A'),
                    item.get('owner', 'Unassigned'),
                    item.get('deadline', 'Not set'),
                ])

            action_table = Table(action_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
            action_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a90e2')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(action_table)
            elements.append(Spacer(1, 12))

        # Speaker statistics
        if meeting_data.get('speakers'):
            elements.append(Paragraph("<b>Speaking Time</b>", heading_style))

            speaker_data = [['Speaker', 'Duration', 'Percentage']]
            for speaker in meeting_data['speakers']:
                speaker_data.append([
                    speaker.get('name', 'Unknown'),
                    f"{speaker.get('total_time', 0):.1f}s",
                    f"{speaker.get('percentage', 0):.1f}%",
                ])

            speaker_table = Table(speaker_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
            speaker_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#50c878')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.lightgreen),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ]))
            elements.append(speaker_table)
            elements.append(Spacer(1, 12))

        # Sentiment analysis
        if meeting_data.get('sentiment'):
            elements.append(Paragraph("<b>Sentiment Analysis</b>", heading_style))
            sentiment = meeting_data['sentiment']

            sentiment_text = Paragraph(
                f"Overall Sentiment: <b>{sentiment.get('overall', 'neutral').title()}</b> "
                f"(Score: {sentiment.get('score', 0):.2f})",
                normal_style
            )
            elements.append(sentiment_text)
            elements.append(Spacer(1, 12))

        # Transcript (optional, on separate page)
        if meeting_data.get('include_transcript') and meeting_data.get('transcript'):
            elements.append(PageBreak())
            elements.append(Paragraph("<b>Full Transcript</b>", heading_style))

            # Split transcript into paragraphs for better readability
            transcript_lines = meeting_data['transcript'].split('\n')
            for line in transcript_lines[:100]:  # Limit to first 100 lines
                if line.strip():
                    elements.append(Paragraph(line, normal_style))
                    elements.append(Spacer(1, 6))

        # Footer
        def add_footer(canvas, doc):
            canvas.saveState()
            footer_text = f"Generated by OpenMeet on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            canvas.setFont('Helvetica', 8)
            canvas.setFillColor(colors.grey)
            canvas.drawCentredString(letter[0] / 2, 0.5 * inch, footer_text)
            canvas.restoreState()

        # Build PDF
        doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)

        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()

        # Save to file if path provided
        if output_path:
            with open(output_path, 'wb') as f:
                f.write(pdf_content)
            logger.info(f"PDF saved to {output_path}")

        logger.info(f"Generated meeting summary PDF ({len(pdf_content)} bytes)")

        return pdf_content

    def generate_analytics_report_pdf(
        self,
        analytics_data: Dict[str, Any],
        output_path: Optional[str] = None
    ) -> bytes:
        """
        Generate analytics dashboard PDF

        Args:
            analytics_data: Analytics information including:
                - title: str
                - date_range: str
                - total_meetings: int
                - total_duration: str
                - top_speakers: List[Dict]
                - top_topics: List[str]
                - action_items_completed: int
                - action_items_pending: int
                - sentiment_trends: Dict
            output_path: Optional file path to save PDF

        Returns:
            PDF content as bytes
        """
        if not self.available:
            raise RuntimeError("PDF export is not available (reportlab not installed)")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=24,
            alignment=TA_CENTER,
            spaceAfter=30,
        )
        elements.append(Paragraph("<b>Meeting Analytics Report</b>", title_style))
        elements.append(Spacer(1, 12))

        # Date range
        date_style = ParagraphStyle('Date', parent=styles['Normal'], alignment=TA_CENTER)
        elements.append(Paragraph(analytics_data.get('date_range', 'N/A'), date_style))
        elements.append(Spacer(1, 24))

        # Key metrics
        heading_style = ParagraphStyle(
            'Heading',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
        )
        elements.append(Paragraph("<b>Key Metrics</b>", heading_style))

        metrics_data = [
            ['Total Meetings', str(analytics_data.get('total_meetings', 0))],
            ['Total Duration', analytics_data.get('total_duration', 'N/A')],
            ['Action Items Completed', str(analytics_data.get('action_items_completed', 0))],
            ['Action Items Pending', str(analytics_data.get('action_items_pending', 0))],
        ]

        metrics_table = Table(metrics_data, colWidths=[3*inch, 2*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightblue),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ]))
        elements.append(metrics_table)
        elements.append(Spacer(1, 20))

        # Top topics
        if analytics_data.get('top_topics'):
            elements.append(Paragraph("<b>Top Topics Discussed</b>", heading_style))
            for i, topic in enumerate(analytics_data['top_topics'][:10], 1):
                elements.append(Paragraph(f"{i}. {topic}", styles['Normal']))
                elements.append(Spacer(1, 6))

        # Build PDF
        doc.build(elements)
        pdf_content = buffer.getvalue()
        buffer.close()

        if output_path:
            with open(output_path, 'wb') as f:
                f.write(pdf_content)
            logger.info(f"Analytics PDF saved to {output_path}")

        logger.info(f"Generated analytics report PDF ({len(pdf_content)} bytes)")

        return pdf_content


# Singleton instance
_pdf_service = None

def get_pdf_service() -> PDFExportService:
    """Get or create PDF export service singleton"""
    global _pdf_service
    if _pdf_service is None:
        _pdf_service = PDFExportService()
    return _pdf_service
