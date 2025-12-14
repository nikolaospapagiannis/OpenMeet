import React, { useState, useEffect } from 'react';
import { Mail, Eye, Palette, Type, Image, Send, Check, AlertCircle, Smartphone, Monitor } from 'lucide-react';
import { BrandingConfig } from '@/hooks/useBranding';

interface EmailBrandingEditorProps {
  config: BrandingConfig;
  onUpdate: (updates: Partial<BrandingConfig>) => void;
  onSave?: () => Promise<void>;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export function EmailBrandingEditor({ config, onUpdate, onSave }: EmailBrandingEditorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const templates: EmailTemplate[] = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: `Welcome to ${config.productName}!`,
      body: `
        <h1>Welcome to {{productName}}!</h1>
        <p>Hi {{userName}},</p>
        <p>We're excited to have you on board. {{productName}} helps you ${config.tagline || 'achieve your goals'}.</p>
        <p>Get started by exploring our features:</p>
        <ul>
          <li>Real-time transcription</li>
          <li>AI-powered insights</li>
          <li>Team collaboration</li>
        </ul>
        <a href="{{ctaUrl}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Get Started</a>
      `,
      variables: ['userName', 'productName', 'ctaUrl', 'primaryColor'],
    },
    {
      id: 'invite',
      name: 'Team Invitation',
      subject: `{{inviterName}} invited you to join ${config.productName}`,
      body: `
        <h1>You're invited to join {{teamName}}</h1>
        <p>Hi {{inviteeName}},</p>
        <p>{{inviterName}} has invited you to join their team on {{productName}}.</p>
        <p>Join the team to start collaborating on meetings and insights.</p>
        <a href="{{inviteUrl}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
      `,
      variables: ['inviteeName', 'inviterName', 'teamName', 'productName', 'inviteUrl', 'primaryColor'],
    },
    {
      id: 'meeting-summary',
      name: 'Meeting Summary',
      subject: 'Meeting Summary: {{meetingTitle}}',
      body: `
        <h1>Meeting Summary</h1>
        <p>Hi {{userName}},</p>
        <p>Here's your summary for "{{meetingTitle}}" held on {{meetingDate}}.</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h2>Key Points</h2>
          {{keyPoints}}
        </div>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h2>Action Items</h2>
          {{actionItems}}
        </div>
        <a href="{{meetingUrl}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Full Meeting</a>
      `,
      variables: ['userName', 'meetingTitle', 'meetingDate', 'keyPoints', 'actionItems', 'meetingUrl', 'primaryColor'],
    },
    {
      id: 'password-reset',
      name: 'Password Reset',
      subject: 'Reset your password',
      body: `
        <h1>Reset Your Password</h1>
        <p>Hi {{userName}},</p>
        <p>We received a request to reset your password for {{productName}}.</p>
        <p>Click the button below to create a new password. This link will expire in 24 hours.</p>
        <a href="{{resetUrl}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
      `,
      variables: ['userName', 'productName', 'resetUrl', 'primaryColor'],
    },
    {
      id: 'subscription',
      name: 'Subscription Confirmation',
      subject: 'Subscription Confirmed - {{planName}}',
      body: `
        <h1>Subscription Confirmed</h1>
        <p>Hi {{userName}},</p>
        <p>Your subscription to {{planName}} has been confirmed.</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Plan:</strong> {{planName}}</p>
          <p><strong>Billing Cycle:</strong> {{billingCycle}}</p>
          <p><strong>Next Billing Date:</strong> {{nextBillingDate}}</p>
          <p><strong>Amount:</strong> {{amount}}</p>
        </div>
        <a href="{{dashboardUrl}}" style="background-color: {{primaryColor}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
      `,
      variables: ['userName', 'planName', 'billingCycle', 'nextBillingDate', 'amount', 'dashboardUrl', 'primaryColor'],
    },
  ];

  const currentTemplate = templates.find(t => t.id === selectedTemplate) || templates[0];

  const getEmailPreview = (template: EmailTemplate): string => {
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: ${config.textColor};
              margin: 0;
              padding: 0;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background: ${config.backgroundColor};
            }
            .email-header {
              background: linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor});
              padding: 32px;
              text-align: center;
            }
            .email-body {
              padding: 32px;
            }
            .email-footer {
              background: #f3f4f6;
              padding: 24px;
              text-align: center;
              font-size: 14px;
              color: #6b7280;
            }
            h1 {
              color: ${config.primaryColor};
              margin-top: 0;
            }
            a.button {
              background-color: ${config.primaryColor};
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
              margin: 16px 0;
            }
            @media only screen and (max-width: 600px) {
              .email-container {
                width: 100% !important;
              }
              .email-body {
                padding: 16px !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              ${config.logoUrl ? `<img src="${config.logoUrl}" alt="${config.productName}" style="max-height: 50px;">` : `<h2 style="color: white; margin: 0;">${config.productName}</h2>`}
            </div>
            <div class="email-body">
              ${template.body}
            </div>
            <div class="email-footer">
              ${config.emailFooter || `© ${new Date().getFullYear()} ${config.companyName || config.productName}. All rights reserved.`}
              ${config.socialLinks ? `
                <div style="margin-top: 16px;">
                  ${config.socialLinks.twitter ? `<a href="${config.socialLinks.twitter}" style="margin: 0 8px;">Twitter</a>` : ''}
                  ${config.socialLinks.linkedin ? `<a href="${config.socialLinks.linkedin}" style="margin: 0 8px;">LinkedIn</a>` : ''}
                  ${config.socialLinks.facebook ? `<a href="${config.socialLinks.facebook}" style="margin: 0 8px;">Facebook</a>` : ''}
                </div>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    // Replace variables with sample data
    const sampleData: Record<string, string> = {
      userName: 'John Doe',
      productName: config.productName,
      teamName: 'Marketing Team',
      inviterName: 'Jane Smith',
      inviteeName: 'John Doe',
      meetingTitle: 'Q4 Planning Session',
      meetingDate: new Date().toLocaleDateString(),
      planName: 'Professional',
      billingCycle: 'Monthly',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      amount: '$99/month',
      primaryColor: config.primaryColor,
      ctaUrl: '#',
      inviteUrl: '#',
      meetingUrl: '#',
      resetUrl: '#',
      dashboardUrl: '#',
      keyPoints: '<ul><li>Discussed Q4 objectives</li><li>Reviewed budget allocation</li><li>Set team KPIs</li></ul>',
      actionItems: '<ul><li>Prepare marketing campaign - Due: Next Friday</li><li>Update project timeline - Due: Monday</li></ul>',
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return html;
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    try {
      setSendingTest(true);
      setTestSent(false);

      const response = await fetch('/api/whitelabel/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          template: selectedTemplate,
          config: config,
        }),
      });

      if (response.ok) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 3000);
      } else {
        throw new Error('Failed to send test email');
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      alert('Failed to send test email. Please try again.');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold">Email Branding</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={`Switch to ${previewMode === 'desktop' ? 'mobile' : 'desktop'} view`}
          >
            {previewMode === 'desktop' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Template Selector */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium mb-4">Email Template</h3>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          {/* Email Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-medium">Email Settings</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={config.emailFromName}
                onChange={(e) => onUpdate({ emailFromName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email
              </label>
              <input
                type="email"
                value={config.emailFromEmail || ''}
                onChange={(e) => onUpdate({ emailFromEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="noreply@yourcompany.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reply-To Email
              </label>
              <input
                type="email"
                value={config.emailReplyTo || ''}
                onChange={(e) => onUpdate({ emailReplyTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="support@yourcompany.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Style
              </label>
              <select
                value={config.emailTemplateStyle || 'modern'}
                onChange={(e) => onUpdate({ emailTemplateStyle: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Footer
              </label>
              <textarea
                value={config.emailFooter || ''}
                onChange={(e) => onUpdate({ emailFooter: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="© 2025 Your Company. All rights reserved."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Signature
              </label>
              <textarea
                value={config.emailSignature || ''}
                onChange={(e) => onUpdate({ emailSignature: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Best regards,
The Team"
              />
            </div>
          </div>

          {/* Test Email */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium mb-4">Send Test Email</h3>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="test@example.com"
              />
              <button
                onClick={handleSendTestEmail}
                disabled={sendingTest || !testEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sendingTest ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Sending...
                  </>
                ) : testSent ? (
                  <>
                    <Check className="w-4 h-4" />
                    Sent!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Test
                  </>
                )}
              </button>
            </div>
            {testSent && (
              <p className="text-sm text-green-600 mt-2">Test email sent successfully!</p>
            )}
          </div>

          {/* Email Header Image */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-4 h-4 text-gray-600" />
              <h3 className="text-lg font-medium">Email Header Image</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload a banner image for your email headers (600x150px recommended)
            </p>
            <input
              type="url"
              value={config.emailHeaderUrl || ''}
              onChange={(e) => onUpdate({ emailHeaderUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/email-header.png"
            />
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Email Preview</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Eye className="w-4 h-4" />
                {previewMode === 'desktop' ? 'Desktop' : 'Mobile'} View
              </div>
            </div>

            {/* Email Preview Frame */}
            <div
              className={`border border-gray-200 rounded-lg overflow-hidden ${
                previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''
              }`}
              style={{ backgroundColor: '#f3f4f6' }}
            >
              <div className="bg-white border-b border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-xs text-gray-500">
                    Subject: {currentTemplate.subject}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <div>From: {config.emailFromName} &lt;{config.emailFromEmail || 'noreply@example.com'}&gt;</div>
                  <div>To: {testEmail || 'user@example.com'}</div>
                </div>
              </div>

              <div className="bg-white" style={{ minHeight: '400px' }}>
                <iframe
                  srcDoc={getEmailPreview(currentTemplate)}
                  className="w-full"
                  style={{ height: '600px', border: 'none' }}
                  title="Email Preview"
                />
              </div>
            </div>

            {/* Variables Info */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Template Variables</h4>
              <div className="flex flex-wrap gap-2">
                {currentTemplate.variables.map((variable) => (
                  <code
                    key={variable}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                  >
                    {`{{${variable}}}`}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}