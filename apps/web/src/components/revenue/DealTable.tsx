'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface Deal {
  id: string;
  name: string;
  amount: number;
  stage: string;
  riskScore?: number;
  lastActivity?: string;
  probability?: number;
  expectedCloseDate?: string;
  ownerId?: string;
  ownerName?: string;
  contactName?: string;
  createdAt: string;
  updatedAt: string;
}

interface DealTableProps {
  deals: Deal[];
  onDealSelect: (dealId: string) => void;
  selectedDealId: string | null;
}

type SortField = 'name' | 'amount' | 'stage' | 'riskScore' | 'lastActivity';
type SortOrder = 'asc' | 'desc';

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: 'Discovery',
  QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Won',
  CLOSED_LOST: 'Lost',
};

const STAGE_COLORS: Record<string, string> = {
  DISCOVERY: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  QUALIFICATION: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  PROPOSAL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  NEGOTIATION: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  CLOSED_WON: 'bg-green-500/20 text-green-400 border-green-500/30',
  CLOSED_LOST: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function DealTable({ deals, onDealSelect, selectedDealId }: DealTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('amount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // Filter and sort deals
  const processedDeals = useMemo(() => {
    let filtered = [...deals];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(deal =>
        deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply stage filter
    if (stageFilter !== 'all') {
      filtered = filtered.filter(deal => deal.stage === stageFilter);
    }

    // Apply risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(deal => {
        const risk = deal.riskScore || 0;
        if (riskFilter === 'low') return risk <= 30;
        if (riskFilter === 'medium') return risk > 30 && risk <= 60;
        if (riskFilter === 'high') return risk > 60;
        return true;
      });
    }

    // Sort deals
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'lastActivity') {
        aVal = new Date(a.updatedAt).getTime();
        bVal = new Date(b.updatedAt).getTime();
      }

      if (aVal === null || aVal === undefined) aVal = 0;
      if (bVal === null || bVal === undefined) bVal = 0;

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [deals, searchTerm, stageFilter, riskFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getRiskColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score <= 30) return 'text-green-500';
    if (score <= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRiskBgColor = (score?: number) => {
    if (!score) return 'bg-gray-500/10';
    if (score <= 30) return 'bg-green-500/10';
    if (score <= 60) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search deals..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <select
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-white"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="all">All Stages</option>
          {Object.entries(STAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 text-white"
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          <option value="all">All Risk Levels</option>
          <option value="low">Low Risk (0-30)</option>
          <option value="medium">Medium Risk (31-60)</option>
          <option value="high">High Risk (61+)</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4">
                <button
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  onClick={() => handleSort('name')}
                >
                  Deal Name
                  {sortField === 'name' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  Value
                  {sortField === 'amount' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  onClick={() => handleSort('stage')}
                >
                  Stage
                  {sortField === 'stage' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  onClick={() => handleSort('riskScore')}
                >
                  Risk
                  {sortField === 'riskScore' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                  onClick={() => handleSort('lastActivity')}
                >
                  Last Activity
                  {sortField === 'lastActivity' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {processedDeals.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No deals found matching your criteria
                </td>
              </tr>
            ) : (
              processedDeals.map((deal) => (
                <tr
                  key={deal.id}
                  className={`border-b border-gray-700 hover:bg-gray-800/50 cursor-pointer transition-colors ${
                    selectedDealId === deal.id ? 'bg-purple-500/10' : ''
                  }`}
                  onClick={() => onDealSelect(deal.id)}
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-white font-medium">{deal.name}</p>
                      <p className="text-sm text-gray-400">{deal.contactName || 'No contact'}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{formatCurrency(deal.amount || 0)}</span>
                      {deal.probability && (
                        <span className="text-xs text-gray-400">({deal.probability}%)</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${STAGE_COLORS[deal.stage] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                      {STAGE_LABELS[deal.stage] || deal.stage}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {deal.riskScore !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${getRiskBgColor(deal.riskScore)}`}>
                          <AlertTriangle className={`w-4 h-4 ${getRiskColor(deal.riskScore)}`} />
                        </div>
                        <span className={`text-sm font-medium ${getRiskColor(deal.riskScore)}`}>
                          {deal.riskScore}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">
                    {formatDate(deal.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <p>Showing {processedDeals.length} of {deals.length} deals</p>
        <p>Total value: {formatCurrency(processedDeals.reduce((sum, d) => sum + (d.amount || 0), 0))}</p>
      </div>
    </div>
  );
}