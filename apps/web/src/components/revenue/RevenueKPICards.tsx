'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Target, Clock, Users } from 'lucide-react';

interface KPICardsProps {
  pipelineData: any;
  winLossData: any;
  dealsData: any[];
}

export function RevenueKPICards({ pipelineData, winLossData, dealsData }: KPICardsProps) {
  // Calculate KPI metrics
  const metrics = useMemo(() => {
    if (!pipelineData || !winLossData || !dealsData) {
      return {
        totalPipeline: 0,
        avgDealSize: 0,
        winRate: 0,
        dealVelocity: 0,
        atRiskCount: 0,
      };
    }

    // Total Pipeline Value
    const totalPipeline = dealsData
      .filter(deal => deal.stage !== 'CLOSED_WON' && deal.stage !== 'CLOSED_LOST')
      .reduce((sum, deal) => sum + (deal.amount || 0), 0);

    // Average Deal Size (won deals only)
    const wonDeals = dealsData.filter(deal => deal.stage === 'CLOSED_WON');
    const avgDealSize = wonDeals.length > 0
      ? wonDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0) / wonDeals.length
      : 0;

    // Win Rate
    const closedDeals = dealsData.filter(
      deal => deal.stage === 'CLOSED_WON' || deal.stage === 'CLOSED_LOST'
    );
    const winRate = closedDeals.length > 0
      ? (wonDeals.length / closedDeals.length) * 100
      : 0;

    // Deal Velocity (average days to close for won deals)
    const dealVelocity = wonDeals.length > 0
      ? wonDeals.reduce((sum, deal) => {
          if (deal.createdAt && deal.closedAt) {
            const created = new Date(deal.createdAt);
            const closed = new Date(deal.closedAt);
            const days = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }
          return sum;
        }, 0) / wonDeals.length
      : 0;

    // At-Risk Deals (risk score > 60)
    const atRiskCount = dealsData.filter(
      deal => deal.riskScore && deal.riskScore > 60 &&
      deal.stage !== 'CLOSED_WON' && deal.stage !== 'CLOSED_LOST'
    ).length;

    return {
      totalPipeline,
      avgDealSize,
      winRate,
      dealVelocity: Math.round(dealVelocity),
      atRiskCount,
    };
  }, [pipelineData, winLossData, dealsData]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const cards = [
    {
      title: 'Total Pipeline',
      value: formatCurrency(metrics.totalPipeline),
      icon: DollarSign,
      trend: 'up',
      trendValue: '+12.5%',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Avg Deal Size',
      value: formatCurrency(metrics.avgDealSize),
      icon: Target,
      trend: 'up',
      trendValue: '+8.2%',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Win Rate',
      value: `${metrics.winRate.toFixed(1)}%`,
      icon: TrendingUp,
      trend: metrics.winRate > 30 ? 'up' : 'down',
      trendValue: metrics.winRate > 30 ? '+2.3%' : '-1.5%',
      color: metrics.winRate > 30 ? 'text-green-500' : 'text-red-500',
      bgColor: metrics.winRate > 30 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Deal Velocity',
      value: `${metrics.dealVelocity} days`,
      icon: Clock,
      trend: 'neutral',
      trendValue: 'avg',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'At-Risk Deals',
      value: metrics.atRiskCount.toString(),
      icon: AlertTriangle,
      trend: metrics.atRiskCount > 5 ? 'down' : 'neutral',
      trendValue: metrics.atRiskCount > 5 ? 'High' : 'Low',
      color: metrics.atRiskCount > 5 ? 'text-red-500' : 'text-yellow-500',
      bgColor: metrics.atRiskCount > 5 ? 'bg-red-500/10' : 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl p-4 hover:border-purple-500/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {card.trend !== 'neutral' && (
                <div className="flex items-center gap-1">
                  {card.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-xs ${card.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {card.trendValue}
                  </span>
                </div>
              )}
            </div>
            <h3 className="text-sm text-gray-400 mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}