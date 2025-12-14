'use client';

/**
 * Compliance Reports Page
 *
 * Generate and download compliance reports for:
 * - GDPR (Data Subject Access Request)
 * - SOC2 (Access Control Audit)
 * - HIPAA (PHI Access Audit)
 * - Data Retention Policy
 * - Security Incidents
 */

import { useState } from 'react';

export default function CompliancePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [gdprUserId, setGdprUserId] = useState('');
  const [soc2Period, setSoc2Period] = useState({ start: '', end: '' });
  const [hipaaReport, setHipaaReport] = useState({ start: '', end: '' });

  const generateGDPRReport = async () => {
    if (!gdprUserId.trim()) {
      alert('Please enter a user ID');
      return;
    }

    setLoading('gdpr');
    try {
      const response = await fetch(`/api/compliance/gdpr?userId=${gdprUserId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr-report-${gdprUserId}-${new Date().toISOString()}.json`;
      a.click();
    } catch (error) {
      console.error('Failed to generate GDPR report:', error);
      alert('Failed to generate GDPR report');
    } finally {
      setLoading(null);
    }
  };

  const generateSOC2Report = async () => {
    if (!soc2Period.start || !soc2Period.end) {
      alert('Please select date range');
      return;
    }

    setLoading('soc2');
    try {
      const response = await fetch(
        `/api/compliance/soc2?startDate=${soc2Period.start}&endDate=${soc2Period.end}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `soc2-report-${new Date().toISOString()}.json`;
      a.click();
    } catch (error) {
      console.error('Failed to generate SOC2 report:', error);
      alert('Failed to generate SOC2 report');
    } finally {
      setLoading(null);
    }
  };

  const generateHIPAAReport = async () => {
    if (!hipaaReport.start || !hipaaReport.end) {
      alert('Please select date range');
      return;
    }

    setLoading('hipaa');
    try {
      const response = await fetch(
        `/api/compliance/hipaa?startDate=${hipaaReport.start}&endDate=${hipaaReport.end}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hipaa-report-${new Date().toISOString()}.json`;
      a.click();
    } catch (error) {
      console.error('Failed to generate HIPAA report:', error);
      alert('Failed to generate HIPAA report');
    } finally {
      setLoading(null);
    }
  };

  const generateRetentionReport = async () => {
    setLoading('retention');
    try {
      const response = await fetch('/api/compliance/retention');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retention-report-${new Date().toISOString()}.json`;
      a.click();
    } catch (error) {
      console.error('Failed to generate retention report:', error);
      alert('Failed to generate retention report');
    } finally {
      setLoading(null);
    }
  };

  const generateSecurityReport = async () => {
    setLoading('security');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const response = await fetch(
        `/api/compliance/security-incidents?startDate=${thirtyDaysAgo.toISOString()}&endDate=${new Date().toISOString()}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${new Date().toISOString()}.json`;
      a.click();
    } catch (error) {
      console.error('Failed to generate security report:', error);
      alert('Failed to generate security report');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Compliance Reports</h1>
          <p className="mt-2 text-gray-600">
            Generate compliance reports for GDPR, SOC2, HIPAA, and security audits
          </p>
        </div>

        {/* GDPR Report */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">GDPR Data Subject Access Request (DSAR)</h2>
              <p className="text-sm text-gray-600">
                Generate complete user data report per GDPR Article 15
              </p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID or Email
            </label>
            <input
              type="text"
              value={gdprUserId}
              onChange={(e) => setGdprUserId(e.target.value)}
              placeholder="Enter user ID or email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            />
            <button
              onClick={generateGDPRReport}
              disabled={loading === 'gdpr'}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'gdpr' ? 'Generating...' : 'Generate GDPR Report'}
            </button>
          </div>
        </div>

        {/* SOC2 Report */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">SOC2 Access Control Audit</h2>
              <p className="text-sm text-gray-600">
                Generate access control and monitoring audit trail
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={soc2Period.start}
                  onChange={(e) =>
                    setSoc2Period({ ...soc2Period, start: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={soc2Period.end}
                  onChange={(e) =>
                    setSoc2Period({ ...soc2Period, end: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <button
              onClick={generateSOC2Report}
              disabled={loading === 'soc2'}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'soc2' ? 'Generating...' : 'Generate SOC2 Report'}
            </button>
          </div>
        </div>

        {/* HIPAA Report */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">HIPAA PHI Access Audit</h2>
              <p className="text-sm text-gray-600">
                Track all PHI access and data exports per HIPAA requirements
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={hipaaReport.start}
                  onChange={(e) =>
                    setHipaaReport({ ...hipaaReport, start: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={hipaaReport.end}
                  onChange={(e) =>
                    setHipaaReport({ ...hipaaReport, end: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <button
              onClick={generateHIPAAReport}
              disabled={loading === 'hipaa'}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'hipaa' ? 'Generating...' : 'Generate HIPAA Report'}
            </button>
          </div>
        </div>

        {/* Quick Reports */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Retention Report */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Data Retention Report</h3>
            <p className="text-sm text-gray-600 mb-4">
              View audit log retention statistics and policy compliance
            </p>
            <button
              onClick={generateRetentionReport}
              disabled={loading === 'retention'}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading === 'retention' ? 'Generating...' : 'Generate Report'}
            </button>
          </div>

          {/* Security Incidents */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Security Incident Report</h3>
            <p className="text-sm text-gray-600 mb-4">
              View all security incidents and high-risk events (last 30 days)
            </p>
            <button
              onClick={generateSecurityReport}
              disabled={loading === 'security'}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {loading === 'security' ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Compliance Information
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>GDPR:</strong> 6-year retention for personal data access logs
            </p>
            <p>
              <strong>SOC2:</strong> 1-year retention for access control audit trails
            </p>
            <p>
              <strong>HIPAA:</strong> 6-year retention for PHI access and modifications
            </p>
            <p>
              <strong>High-Risk Events:</strong> 7-year retention for critical security
              incidents
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
