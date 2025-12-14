/**
 * Pre-built Templates Seeder
 * Comprehensive templates with placeholder variables for meeting notes
 */

import { PrismaClient, TemplateType } from '@prisma/client';

const prisma = new PrismaClient();

// Define comprehensive pre-built templates
const preBuiltTemplates = [
  // ========================================
  // SALES CATEGORY
  // ========================================
  {
    name: 'Sales Discovery Call',
    description: 'Comprehensive notes template for sales discovery calls with prospects',
    type: TemplateType.client_call,
    category: 'sales',
    templateData: {
      sections: [
        {
          title: 'Meeting Overview',
          content: '**Meeting:** {{meeting_title}}\n**Date:** {{date}}\n**Time:** {{time}}\n**Attendees:** {{attendees}}\n**Prospect:** {{prospect_name}} - {{company}}\n**Industry:** {{industry}}'
        },
        {
          title: 'Current Situation',
          content: '### Company Background\n- Company Size: {{company_size}}\n- Annual Revenue: {{annual_revenue}}\n- Key Stakeholders: {{stakeholders}}\n\n### Current Solutions\n- Existing tools: \n- Pain points with current setup:\n\n### Business Challenges\n1. \n2. \n3. \n\n### Impact of Challenges\n- Financial impact: \n- Operational impact: \n- Team morale impact:'
        },
        {
          title: 'Goals & Requirements',
          content: '### Primary Goals\n1. \n2. \n3. \n\n### Success Metrics\n- KPI 1: \n- KPI 2: \n- KPI 3: \n\n### Timeline & Budget\n- Implementation timeline: {{timeline}}\n- Budget range: {{budget}}\n- Decision date: {{decision_date}}'
        },
        {
          title: 'Solution Mapping',
          content: '### Features Discussed\n- {{feature_1}}: \n- {{feature_2}}: \n- {{feature_3}}: \n\n### Competitive Landscape\n- Competitors considered: \n- Why considering us: \n\n### Objections Raised\n1. \n2. '
        },
        {
          title: 'Next Steps & Action Items',
          content: '### Action Items\n| Action | Owner | Due Date | Priority |\n|--------|-------|----------|----------|\n| {{action_1}} | {{owner_1}} | {{due_date_1}} | {{priority_1}} |\n| {{action_2}} | {{owner_2}} | {{due_date_2}} | {{priority_2}} |\n\n### Follow-up Meeting\n- Date: {{follow_up_date}}\n- Agenda: \n- Attendees needed: '
        }
      ]
    },
    variables: [
      '{{meeting_title}}', '{{date}}', '{{time}}', '{{attendees}}', '{{prospect_name}}',
      '{{company}}', '{{industry}}', '{{company_size}}', '{{annual_revenue}}', '{{stakeholders}}',
      '{{timeline}}', '{{budget}}', '{{decision_date}}', '{{feature_1}}', '{{feature_2}}',
      '{{feature_3}}', '{{action_1}}', '{{owner_1}}', '{{due_date_1}}', '{{priority_1}}',
      '{{action_2}}', '{{owner_2}}', '{{due_date_2}}', '{{priority_2}}', '{{follow_up_date}}'
    ],
    tags: ['sales', 'discovery', 'prospecting', 'lead qualification'],
    usageCount: 1245
  },
  {
    name: 'Product Demo',
    description: 'Template for product demonstration meetings with prospects',
    type: TemplateType.client_call,
    category: 'sales',
    templateData: {
      sections: [
        {
          title: 'Demo Overview',
          content: '**Meeting:** {{meeting_title}}\n**Date:** {{date}}\n**Prospect:** {{prospect_name}} - {{company}}\n**Demo Lead:** {{demo_lead}}\n**Product Version:** {{product_version}}'
        },
        {
          title: 'Use Cases Presented',
          content: '### Use Case 1: {{use_case_1}}\n- Problem addressed: \n- Solution demonstrated: \n- Reaction: \n\n### Use Case 2: {{use_case_2}}\n- Problem addressed: \n- Solution demonstrated: \n- Reaction: \n\n### Use Case 3: {{use_case_3}}\n- Problem addressed: \n- Solution demonstrated: \n- Reaction:'
        },
        {
          title: 'Features Demonstrated',
          content: '| Feature | Shown | Interest Level | Notes |\n|---------|-------|----------------|-------|\n| {{feature_1}} | ✅/❌ | High/Med/Low | |\n| {{feature_2}} | ✅/❌ | High/Med/Low | |\n| {{feature_3}} | ✅/❌ | High/Med/Low | |\n| {{feature_4}} | ✅/❌ | High/Med/Low | |'
        },
        {
          title: 'Questions & Feedback',
          content: '### Technical Questions\n1. Q: \n   A: \n2. Q: \n   A: \n\n### Concerns Raised\n- \n\n### Feature Requests\n- {{requested_feature_1}}: \n- {{requested_feature_2}}: \n\n### Positive Reactions\n- '
        },
        {
          title: 'Next Steps',
          content: '### Demo Score: {{demo_score}}/10\n\n### Follow-up Actions\n| Action | Owner | Due | Priority |\n|--------|-------|-----|----------|\n| Send demo recording | {{sales_rep}} | {{due_1}} | High |\n| Address technical questions | | | |\n| Schedule follow-up | | | |\n\n### Deal Stage: {{deal_stage}}\n### Probability: {{probability}}%'
        }
      ]
    },
    variables: [
      '{{meeting_title}}', '{{date}}', '{{prospect_name}}', '{{company}}', '{{demo_lead}}',
      '{{product_version}}', '{{use_case_1}}', '{{use_case_2}}', '{{use_case_3}}',
      '{{feature_1}}', '{{feature_2}}', '{{feature_3}}', '{{feature_4}}',
      '{{requested_feature_1}}', '{{requested_feature_2}}', '{{demo_score}}',
      '{{sales_rep}}', '{{due_1}}', '{{deal_stage}}', '{{probability}}'
    ],
    tags: ['sales', 'demo', 'product', 'presentation'],
    usageCount: 892
  },
  {
    name: 'Sales Negotiation',
    description: 'Template for contract negotiation and pricing discussions',
    type: TemplateType.client_call,
    category: 'sales',
    templateData: {
      sections: [
        {
          title: 'Negotiation Overview',
          content: '**Deal:** {{deal_name}}\n**Date:** {{date}}\n**Account Executive:** {{account_executive}}\n**Client Contact:** {{client_contact}} - {{client_title}}\n**Deal Size:** {{deal_size}}\n**Contract Length:** {{contract_length}}'
        },
        {
          title: 'Pricing Discussion',
          content: '### Proposed Pricing\n- List Price: {{list_price}}\n- Discount Requested: {{discount_requested}}%\n- Final Price: {{final_price}}\n\n### Value Justification\n- ROI Presented: {{roi_percentage}}%\n- Payback Period: {{payback_period}}\n- Cost Savings: {{cost_savings}}\n\n### Competitor Comparison\n| Our Offer | Competitor A | Competitor B |\n|-----------|--------------|--------------|'
        },
        {
          title: 'Terms Discussed',
          content: '### Contract Terms\n- Payment Terms: {{payment_terms}}\n- Implementation Timeline: {{implementation_timeline}}\n- Support Level: {{support_level}}\n- SLA Requirements: {{sla_requirements}}\n\n### Requested Modifications\n1. \n2. \n3. \n\n### Non-Negotiables\n- Ours: \n- Theirs:'
        },
        {
          title: 'Decision Factors',
          content: '### Key Decision Makers\n| Name | Role | Stance | Notes |\n|------|------|--------|-------|\n| {{dm_1}} | {{role_1}} | Champion/Neutral/Blocker | |\n| {{dm_2}} | {{role_2}} | Champion/Neutral/Blocker | |\n\n### Approval Process\n- Steps remaining: \n- Timeline: \n- Required signatures:'
        },
        {
          title: 'Next Steps',
          content: '### Agreed Actions\n| Action | Owner | Due Date |\n|--------|-------|----------|\n| Revise proposal | {{owner_1}} | {{due_1}} |\n| Legal review | {{owner_2}} | {{due_2}} |\n| Final sign-off | {{owner_3}} | {{due_3}} |\n\n### Expected Close Date: {{close_date}}\n### Probability: {{probability}}%\n### Notes for Manager:'
        }
      ]
    },
    variables: [
      '{{deal_name}}', '{{date}}', '{{account_executive}}', '{{client_contact}}', '{{client_title}}',
      '{{deal_size}}', '{{contract_length}}', '{{list_price}}', '{{discount_requested}}',
      '{{final_price}}', '{{roi_percentage}}', '{{payback_period}}', '{{cost_savings}}',
      '{{payment_terms}}', '{{implementation_timeline}}', '{{support_level}}', '{{sla_requirements}}',
      '{{dm_1}}', '{{role_1}}', '{{dm_2}}', '{{role_2}}', '{{owner_1}}', '{{due_1}}',
      '{{owner_2}}', '{{due_2}}', '{{owner_3}}', '{{due_3}}', '{{close_date}}', '{{probability}}'
    ],
    tags: ['sales', 'negotiation', 'pricing', 'contract'],
    usageCount: 534
  },

  // ========================================
  // CUSTOMER SUCCESS CATEGORY
  // ========================================
  {
    name: 'Customer Onboarding Kickoff',
    description: 'Template for new customer onboarding kickoff meetings',
    type: TemplateType.client_call,
    category: 'customer_success',
    templateData: {
      sections: [
        {
          title: 'Customer Information',
          content: '**Customer:** {{customer_name}}\n**Account Manager:** {{account_manager}}\n**CSM:** {{customer_success_manager}}\n**Start Date:** {{start_date}}\n**Contract Value:** {{contract_value}}\n**License Count:** {{license_count}}'
        },
        {
          title: 'Team Introductions',
          content: '### Our Team\n| Role | Name | Email | Responsibility |\n|------|------|-------|----------------|\n| Customer Success Manager | {{csm_name}} | {{csm_email}} | Primary point of contact |\n| Technical Lead | {{tech_lead}} | {{tech_email}} | Implementation support |\n| Support Lead | {{support_lead}} | {{support_email}} | Ongoing support |\n\n### Customer Team\n| Role | Name | Email |\n|------|------|-------|\n| Executive Sponsor | {{exec_sponsor}} | |\n| Project Lead | {{project_lead}} | |\n| Technical Admin | {{tech_admin}} | |'
        },
        {
          title: 'Success Criteria',
          content: '### Business Objectives\n1. {{objective_1}}\n2. {{objective_2}}\n3. {{objective_3}}\n\n### Success Metrics (90-day targets)\n| Metric | Target | Measurement |\n|--------|--------|-------------|\n| User Adoption | {{adoption_target}}% | |\n| {{metric_1}} | {{target_1}} | |\n| {{metric_2}} | {{target_2}} | |\n\n### Potential Risks\n- '
        },
        {
          title: 'Implementation Timeline',
          content: '### Phase 1: Setup (Week {{week_1}})\n- [ ] Account configuration\n- [ ] SSO/Security setup\n- [ ] Admin training\n\n### Phase 2: Pilot (Week {{week_2}})\n- [ ] Pilot group rollout\n- [ ] Gather initial feedback\n- [ ] Address issues\n\n### Phase 3: Full Rollout (Week {{week_3}})\n- [ ] Company-wide launch\n- [ ] Training sessions\n- [ ] Go-live support\n\n### Key Milestones\n| Milestone | Target Date | Owner |\n|-----------|-------------|-------|\n| Go-live | {{go_live_date}} | |'
        },
        {
          title: 'Next Steps',
          content: '### Immediate Actions\n| Action | Owner | Due Date |\n|--------|-------|----------|\n| Send welcome package | {{csm_name}} | {{due_1}} |\n| Schedule technical setup | {{tech_lead}} | {{due_2}} |\n| Share training materials | | |\n\n### Recurring Meetings\n- Weekly sync: {{weekly_sync_day}} at {{weekly_sync_time}}\n- Monthly business review: First {{monthly_day}} of month\n\n### Questions & Concerns\n- '
        }
      ]
    },
    variables: [
      '{{customer_name}}', '{{account_manager}}', '{{customer_success_manager}}', '{{start_date}}',
      '{{contract_value}}', '{{license_count}}', '{{csm_name}}', '{{csm_email}}', '{{tech_lead}}',
      '{{tech_email}}', '{{support_lead}}', '{{support_email}}', '{{exec_sponsor}}', '{{project_lead}}',
      '{{tech_admin}}', '{{objective_1}}', '{{objective_2}}', '{{objective_3}}', '{{adoption_target}}',
      '{{metric_1}}', '{{target_1}}', '{{metric_2}}', '{{target_2}}', '{{week_1}}', '{{week_2}}',
      '{{week_3}}', '{{go_live_date}}', '{{due_1}}', '{{due_2}}', '{{weekly_sync_day}}',
      '{{weekly_sync_time}}', '{{monthly_day}}'
    ],
    tags: ['customer success', 'onboarding', 'kickoff', 'implementation'],
    usageCount: 756
  },
  {
    name: 'Quarterly Business Review (QBR)',
    description: 'Template for quarterly customer business review meetings',
    type: TemplateType.client_call,
    category: 'customer_success',
    templateData: {
      sections: [
        {
          title: 'QBR Overview',
          content: '**Customer:** {{customer_name}}\n**Quarter:** {{quarter}} {{year}}\n**CSM:** {{csm_name}}\n**Attendees:** {{attendees}}\n**Account Health Score:** {{health_score}}/100'
        },
        {
          title: 'Performance Metrics',
          content: '### Usage Statistics\n| Metric | Last Quarter | This Quarter | Change |\n|--------|--------------|--------------|--------|\n| Active Users | {{active_users_prev}} | {{active_users_curr}} | {{user_change}}% |\n| Meetings Recorded | {{meetings_prev}} | {{meetings_curr}} | |\n| Features Used | {{features_prev}} | {{features_curr}} | |\n\n### ROI Analysis\n- Time Saved: {{time_saved}} hours/month\n- Cost Savings: ${{cost_savings}}\n- Productivity Gain: {{productivity_gain}}%'
        },
        {
          title: 'Goals Review',
          content: '### Q{{prev_quarter}} Goals Status\n| Goal | Target | Actual | Status |\n|------|--------|--------|--------|\n| {{goal_1}} | {{target_1}} | {{actual_1}} | ✅/🔄/❌ |\n| {{goal_2}} | {{target_2}} | {{actual_2}} | ✅/🔄/❌ |\n| {{goal_3}} | {{target_3}} | {{actual_3}} | ✅/🔄/❌ |\n\n### Achievements & Wins\n- \n\n### Challenges & Learnings\n- '
        },
        {
          title: 'Roadmap & Future',
          content: '### Upcoming Features\n| Feature | Release Date | Relevance |\n|---------|--------------|----------|\n| {{feature_1}} | {{release_1}} | High/Med/Low |\n| {{feature_2}} | {{release_2}} | High/Med/Low |\n\n### Customer Requests Status\n| Request | Status | ETA |\n|---------|--------|-----|\n\n### Expansion Opportunities\n- Additional licenses: \n- New use cases: \n- Training needs:'
        },
        {
          title: 'Next Quarter Planning',
          content: '### Q{{next_quarter}} Goals\n1. {{new_goal_1}}\n2. {{new_goal_2}}\n3. {{new_goal_3}}\n\n### Action Items\n| Action | Owner | Due |\n|--------|-------|-----|\n| | {{owner_1}} | |\n| | {{owner_2}} | |\n\n### Contract & Renewal\n- Renewal Date: {{renewal_date}}\n- Expansion Discussion: Yes/No\n- Health Check: {{health_status}}'
        }
      ]
    },
    variables: [
      '{{customer_name}}', '{{quarter}}', '{{year}}', '{{csm_name}}', '{{attendees}}',
      '{{health_score}}', '{{active_users_prev}}', '{{active_users_curr}}', '{{user_change}}',
      '{{meetings_prev}}', '{{meetings_curr}}', '{{features_prev}}', '{{features_curr}}',
      '{{time_saved}}', '{{cost_savings}}', '{{productivity_gain}}', '{{prev_quarter}}',
      '{{goal_1}}', '{{target_1}}', '{{actual_1}}', '{{goal_2}}', '{{target_2}}', '{{actual_2}}',
      '{{goal_3}}', '{{target_3}}', '{{actual_3}}', '{{feature_1}}', '{{release_1}}',
      '{{feature_2}}', '{{release_2}}', '{{next_quarter}}', '{{new_goal_1}}', '{{new_goal_2}}',
      '{{new_goal_3}}', '{{owner_1}}', '{{owner_2}}', '{{renewal_date}}', '{{health_status}}'
    ],
    tags: ['customer success', 'qbr', 'review', 'metrics', 'renewal'],
    usageCount: 623
  },
  {
    name: 'Customer Feedback Session',
    description: 'Template for structured customer feedback collection',
    type: TemplateType.client_call,
    category: 'customer_success',
    templateData: {
      sections: [
        {
          title: 'Session Overview',
          content: '**Customer:** {{customer_name}}\n**Date:** {{date}}\n**Facilitator:** {{facilitator}}\n**Participants:** {{participants}}\n**Focus Area:** {{focus_area}}'
        },
        {
          title: 'Current Experience',
          content: '### Overall Satisfaction: {{satisfaction_score}}/10\n\n### What\'s Working Well\n1. \n2. \n3. \n\n### Pain Points & Frustrations\n| Issue | Severity | Frequency | Impact |\n|-------|----------|-----------|--------|\n| {{issue_1}} | High/Med/Low | Daily/Weekly/Monthly | |\n| {{issue_2}} | High/Med/Low | Daily/Weekly/Monthly | |\n\n### Missing Capabilities\n- '
        },
        {
          title: 'Feature Feedback',
          content: '### Recent Features Used\n| Feature | Rating | Comments |\n|---------|--------|----------|\n| {{feature_1}} | ⭐⭐⭐⭐⭐ | |\n| {{feature_2}} | ⭐⭐⭐⭐⭐ | |\n\n### Feature Requests\n| Request | Use Case | Priority | Workaround |\n|---------|----------|----------|------------|\n| {{request_1}} | {{use_case_1}} | Critical/High/Med/Low | |\n| {{request_2}} | {{use_case_2}} | Critical/High/Med/Low | |'
        },
        {
          title: 'Support & Training',
          content: '### Support Experience\n- Response Time: {{response_rating}}/5\n- Resolution Quality: {{resolution_rating}}/5\n- Documentation: {{docs_rating}}/5\n\n### Training Needs\n- [ ] New user onboarding\n- [ ] Advanced features\n- [ ] Admin training\n- [ ] Custom workflow\n\n### Best Practices Requested\n- '
        },
        {
          title: 'Action Items',
          content: '### Immediate Actions\n| Action | Owner | Due | Priority |\n|--------|-------|-----|----------|\n| Address {{issue_1}} | {{owner_1}} | {{due_1}} | {{priority_1}} |\n| Submit {{request_1}} to product | {{owner_2}} | {{due_2}} | |\n\n### Follow-up\n- Next feedback session: {{next_session}}\n- NPS Survey: {{nps_date}}\n\n### Summary & Themes\n- '
        }
      ]
    },
    variables: [
      '{{customer_name}}', '{{date}}', '{{facilitator}}', '{{participants}}', '{{focus_area}}',
      '{{satisfaction_score}}', '{{issue_1}}', '{{issue_2}}', '{{feature_1}}', '{{feature_2}}',
      '{{request_1}}', '{{use_case_1}}', '{{request_2}}', '{{use_case_2}}', '{{response_rating}}',
      '{{resolution_rating}}', '{{docs_rating}}', '{{owner_1}}', '{{due_1}}', '{{priority_1}}',
      '{{owner_2}}', '{{due_2}}', '{{next_session}}', '{{nps_date}}'
    ],
    tags: ['customer success', 'feedback', 'voice of customer', 'product feedback'],
    usageCount: 445
  },

  // ========================================
  // INTERNAL CATEGORY
  // ========================================
  {
    name: '1-on-1 Meeting',
    description: 'Template for regular one-on-one meetings between manager and team member',
    type: TemplateType.one_on_one,
    category: 'internal',
    templateData: {
      sections: [
        {
          title: 'Meeting Details',
          content: '**Date:** {{date}}\n**Manager:** {{manager_name}}\n**Team Member:** {{team_member}}\n**Meeting Type:** {{meeting_type}} (Regular/Check-in/Career)\n**Duration:** {{duration}} minutes'
        },
        {
          title: 'Personal Check-in',
          content: '### How are you doing? (1-10): {{wellbeing_score}}\n\n### Life Updates\n- \n\n### Energy & Motivation Level\n- Current state: \n- What\'s affecting it: \n\n### Work-Life Balance\n- '
        },
        {
          title: 'Work Updates',
          content: '### Current Projects\n| Project | Status | % Complete | Blockers |\n|---------|--------|------------|----------|\n| {{project_1}} | On Track/At Risk/Blocked | {{progress_1}}% | |\n| {{project_2}} | On Track/At Risk/Blocked | {{progress_2}}% | |\n\n### Recent Wins\n1. \n2. \n\n### Challenges & Blockers\n- {{blocker_1}}: \n- {{blocker_2}}: \n\n### Support Needed\n- '
        },
        {
          title: 'Goals & Development',
          content: '### Current Goals Progress\n| Goal | Target Date | Progress | Notes |\n|------|-------------|----------|-------|\n| {{goal_1}} | {{target_date_1}} | {{progress_pct_1}}% | |\n| {{goal_2}} | {{target_date_2}} | {{progress_pct_2}}% | |\n\n### Career Discussion\n- Short-term aspirations: \n- Long-term goals: \n- Skills to develop: {{skills_to_develop}}\n\n### Learning & Growth\n- Training interested in: \n- Mentorship needs:'
        },
        {
          title: 'Feedback & Actions',
          content: '### Feedback for Team Member\n- Strengths observed: \n- Areas for improvement: \n\n### Feedback for Manager\n- What\'s working: \n- What could be better: \n\n### Action Items\n| Action | Owner | Due Date |\n|--------|-------|----------|\n| {{action_1}} | {{owner_1}} | {{due_1}} |\n| {{action_2}} | {{owner_2}} | {{due_2}} |\n\n### Topics for Next Time\n- '
        }
      ]
    },
    variables: [
      '{{date}}', '{{manager_name}}', '{{team_member}}', '{{meeting_type}}', '{{duration}}',
      '{{wellbeing_score}}', '{{project_1}}', '{{progress_1}}', '{{project_2}}', '{{progress_2}}',
      '{{blocker_1}}', '{{blocker_2}}', '{{goal_1}}', '{{target_date_1}}', '{{progress_pct_1}}',
      '{{goal_2}}', '{{target_date_2}}', '{{progress_pct_2}}', '{{skills_to_develop}}',
      '{{action_1}}', '{{owner_1}}', '{{due_1}}', '{{action_2}}', '{{owner_2}}', '{{due_2}}'
    ],
    tags: ['internal', 'one-on-one', 'management', 'career development', 'feedback'],
    usageCount: 2341
  },
  {
    name: 'Daily Standup',
    description: 'Template for daily team standup/scrum meetings',
    type: TemplateType.standup,
    category: 'internal',
    templateData: {
      sections: [
        {
          title: 'Standup Info',
          content: '**Date:** {{date}}\n**Time:** {{time}}\n**Team:** {{team_name}}\n**Sprint:** {{sprint_name}}\n**Facilitator:** {{facilitator}}\n**Attendees:** {{attendees}}'
        },
        {
          title: 'Team Updates',
          content: '### {{member_1}}\n**Yesterday:** \n**Today:** \n**Blockers:** {{blocker_1}}\n\n### {{member_2}}\n**Yesterday:** \n**Today:** \n**Blockers:** {{blocker_2}}\n\n### {{member_3}}\n**Yesterday:** \n**Today:** \n**Blockers:** {{blocker_3}}\n\n### {{member_4}}\n**Yesterday:** \n**Today:** \n**Blockers:** None'
        },
        {
          title: 'Sprint Health',
          content: '### Sprint Progress\n- Days Remaining: {{days_remaining}}\n- Story Points Completed: {{points_completed}}/{{points_total}}\n- Burndown Status: On Track/Behind/Ahead\n\n### At-Risk Items\n| Item | Risk | Mitigation |\n|------|------|------------|\n| {{risk_item_1}} | | |\n| {{risk_item_2}} | | |'
        },
        {
          title: 'Blockers & Dependencies',
          content: '### Active Blockers\n| Blocker | Owner | Waiting On | Days Blocked |\n|---------|-------|------------|-------------|\n| {{blocker_1}} | {{blocker_owner_1}} | {{waiting_on_1}} | {{days_1}} |\n\n### External Dependencies\n- {{dependency_1}}: \n- {{dependency_2}}: \n\n### Needs Discussion (Parking Lot)\n- '
        },
        {
          title: 'Action Items',
          content: '### Immediate Actions\n| Action | Owner | Due |\n|--------|-------|-----|\n| Unblock {{blocker_1}} | {{resolver_1}} | Today |\n| | | |\n\n### Announcements\n- \n\n### Next Standup: {{next_standup}}'
        }
      ]
    },
    variables: [
      '{{date}}', '{{time}}', '{{team_name}}', '{{sprint_name}}', '{{facilitator}}', '{{attendees}}',
      '{{member_1}}', '{{blocker_1}}', '{{member_2}}', '{{blocker_2}}', '{{member_3}}', '{{blocker_3}}',
      '{{member_4}}', '{{days_remaining}}', '{{points_completed}}', '{{points_total}}',
      '{{risk_item_1}}', '{{risk_item_2}}', '{{blocker_owner_1}}', '{{waiting_on_1}}', '{{days_1}}',
      '{{dependency_1}}', '{{dependency_2}}', '{{resolver_1}}', '{{next_standup}}'
    ],
    tags: ['internal', 'standup', 'agile', 'scrum', 'daily'],
    usageCount: 3456
  },
  {
    name: 'Team All-Hands',
    description: 'Template for team or company all-hands meetings',
    type: TemplateType.team_meeting,
    category: 'internal',
    templateData: {
      sections: [
        {
          title: 'Meeting Overview',
          content: '**Date:** {{date}}\n**Host:** {{host_name}}\n**Duration:** {{duration}} minutes\n**Attendees:** {{attendee_count}} people\n**Recording:** {{recording_link}}'
        },
        {
          title: 'Company/Team Updates',
          content: '### Key Announcements\n1. {{announcement_1}}\n2. {{announcement_2}}\n3. {{announcement_3}}\n\n### Metrics & Performance\n| Metric | Target | Actual | Status |\n|--------|--------|--------|--------|\n| {{metric_1}} | {{target_1}} | {{actual_1}} | 🟢/🟡/🔴 |\n| {{metric_2}} | {{target_2}} | {{actual_2}} | 🟢/🟡/🔴 |\n\n### Wins & Celebrations\n- 🎉 '
        },
        {
          title: 'Department Updates',
          content: '### {{dept_1}} Update\n- Key highlights: \n- Upcoming: \n\n### {{dept_2}} Update\n- Key highlights: \n- Upcoming: \n\n### {{dept_3}} Update\n- Key highlights: \n- Upcoming: \n\n### Cross-functional Initiatives\n- '
        },
        {
          title: 'Looking Ahead',
          content: '### {{period}} Priorities\n1. {{priority_1}}\n2. {{priority_2}}\n3. {{priority_3}}\n\n### Upcoming Events\n| Event | Date | Details |\n|-------|------|----------|\n| {{event_1}} | {{event_date_1}} | |\n| {{event_2}} | {{event_date_2}} | |\n\n### Important Dates\n- '
        },
        {
          title: 'Q&A Summary',
          content: '### Questions Asked\n| Question | Answer | Follow-up Needed |\n|----------|--------|------------------|\n| {{question_1}} | {{answer_1}} | Yes/No |\n| {{question_2}} | {{answer_2}} | Yes/No |\n\n### Unanswered Questions (to follow up)\n- \n\n### Feedback & Suggestions\n- '
        }
      ]
    },
    variables: [
      '{{date}}', '{{host_name}}', '{{duration}}', '{{attendee_count}}', '{{recording_link}}',
      '{{announcement_1}}', '{{announcement_2}}', '{{announcement_3}}', '{{metric_1}}',
      '{{target_1}}', '{{actual_1}}', '{{metric_2}}', '{{target_2}}', '{{actual_2}}',
      '{{dept_1}}', '{{dept_2}}', '{{dept_3}}', '{{period}}', '{{priority_1}}', '{{priority_2}}',
      '{{priority_3}}', '{{event_1}}', '{{event_date_1}}', '{{event_2}}', '{{event_date_2}}',
      '{{question_1}}', '{{answer_1}}', '{{question_2}}', '{{answer_2}}'
    ],
    tags: ['internal', 'all-hands', 'company meeting', 'team update'],
    usageCount: 892
  },
  {
    name: 'Brainstorming Session',
    description: 'Template for creative brainstorming and ideation sessions',
    type: TemplateType.team_meeting,
    category: 'internal',
    templateData: {
      sections: [
        {
          title: 'Session Overview',
          content: '**Date:** {{date}}\n**Topic:** {{brainstorm_topic}}\n**Facilitator:** {{facilitator}}\n**Participants:** {{participants}}\n**Duration:** {{duration}} minutes\n**Goal:** {{session_goal}}'
        },
        {
          title: 'Problem Statement',
          content: '### Challenge We\'re Solving\n{{problem_statement}}\n\n### Context & Background\n- Current situation: \n- Why now: \n- Constraints: {{constraints}}\n\n### Success Criteria\n- '
        },
        {
          title: 'Ideas Generated',
          content: '### Idea Pool\n| # | Idea | Champion | Feasibility | Impact |\n|---|------|----------|-------------|--------|\n| 1 | {{idea_1}} | {{champion_1}} | High/Med/Low | High/Med/Low |\n| 2 | {{idea_2}} | {{champion_2}} | High/Med/Low | High/Med/Low |\n| 3 | {{idea_3}} | {{champion_3}} | High/Med/Low | High/Med/Low |\n| 4 | {{idea_4}} | {{champion_4}} | High/Med/Low | High/Med/Low |\n| 5 | {{idea_5}} | {{champion_5}} | High/Med/Low | High/Med/Low |\n\n### Wild Cards (Moonshots)\n- '
        },
        {
          title: 'Evaluation & Voting',
          content: '### Voting Results\n| Idea | Votes | Rank |\n|------|-------|------|\n| {{top_idea_1}} | {{votes_1}} | 1 |\n| {{top_idea_2}} | {{votes_2}} | 2 |\n| {{top_idea_3}} | {{votes_3}} | 3 |\n\n### Pros & Cons Analysis\n**{{top_idea_1}}**\n- Pros: \n- Cons: \n- Resources needed: {{resources_needed}}'
        },
        {
          title: 'Next Steps',
          content: '### Selected for Further Exploration\n1. {{selected_idea_1}} - Owner: {{owner_1}}\n2. {{selected_idea_2}} - Owner: {{owner_2}}\n\n### Action Items\n| Action | Owner | Due Date |\n|--------|-------|----------|\n| Create proof of concept for {{selected_idea_1}} | {{poc_owner}} | {{poc_due}} |\n| Research feasibility | | |\n| Present findings | | |\n\n### Parked Ideas (for future consideration)\n- '
        }
      ]
    },
    variables: [
      '{{date}}', '{{brainstorm_topic}}', '{{facilitator}}', '{{participants}}', '{{duration}}',
      '{{session_goal}}', '{{problem_statement}}', '{{constraints}}', '{{idea_1}}', '{{champion_1}}',
      '{{idea_2}}', '{{champion_2}}', '{{idea_3}}', '{{champion_3}}', '{{idea_4}}', '{{champion_4}}',
      '{{idea_5}}', '{{champion_5}}', '{{top_idea_1}}', '{{votes_1}}', '{{top_idea_2}}', '{{votes_2}}',
      '{{top_idea_3}}', '{{votes_3}}', '{{resources_needed}}', '{{selected_idea_1}}', '{{owner_1}}',
      '{{selected_idea_2}}', '{{owner_2}}', '{{poc_owner}}', '{{poc_due}}'
    ],
    tags: ['internal', 'brainstorming', 'ideation', 'creative', 'innovation'],
    usageCount: 567
  },

  // ========================================
  // INTERVIEW CATEGORY
  // ========================================
  {
    name: 'Technical Interview',
    description: 'Template for technical/coding interview assessments',
    type: TemplateType.interview,
    category: 'interview',
    templateData: {
      sections: [
        {
          title: 'Interview Details',
          content: '**Candidate:** {{candidate_name}}\n**Position:** {{position}}\n**Level:** {{level}}\n**Date:** {{date}}\n**Interviewer:** {{interviewer}}\n**Interview Type:** {{interview_type}} (Coding/System Design/Technical Deep Dive)'
        },
        {
          title: 'Technical Assessment',
          content: '### Coding Skills\n| Criteria | Score (1-5) | Notes |\n|----------|-------------|-------|\n| Problem Solving | {{problem_solving_score}} | |\n| Code Quality | {{code_quality_score}} | |\n| Language Proficiency | {{language_score}} | |\n| Testing Mindset | {{testing_score}} | |\n\n### Problem Given\n**Problem:** {{problem_name}}\n**Difficulty:** {{difficulty}}\n**Time Given:** {{time_given}} minutes\n**Completed:** Yes/Partial/No\n\n### Solution Approach\n- '
        },
        {
          title: 'Technical Knowledge',
          content: '### Core Concepts\n| Topic | Depth | Notes |\n|-------|-------|-------|\n| {{topic_1}} | Beginner/Intermediate/Expert | |\n| {{topic_2}} | Beginner/Intermediate/Expert | |\n| {{topic_3}} | Beginner/Intermediate/Expert | |\n\n### System Design (if applicable)\n- Scalability understanding: \n- Trade-offs discussed: \n- Real-world experience: \n\n### Technologies Discussed\n- Strong in: {{strong_tech}}\n- Learning: {{learning_tech}}\n- Gaps: {{tech_gaps}}'
        },
        {
          title: 'Behavioral Observations',
          content: '### Communication\n- Clarity of explanation: {{clarity_score}}/5\n- Asks clarifying questions: Yes/No\n- Handles feedback: {{feedback_handling}}\n\n### Problem-Solving Process\n- Structured approach: Yes/Partial/No\n- Handles edge cases: Yes/Partial/No\n- Debugging ability: {{debugging_score}}/5\n\n### Collaboration Signals\n- Open to suggestions: \n- Thinks out loud: \n- Team fit indicators:'
        },
        {
          title: 'Recommendation',
          content: '### Overall Technical Score: {{overall_score}}/5\n\n### Strengths\n1. {{strength_1}}\n2. {{strength_2}}\n3. {{strength_3}}\n\n### Areas of Concern\n1. {{concern_1}}\n2. {{concern_2}}\n\n### Hiring Recommendation\n- [ ] Strong Hire\n- [ ] Hire\n- [ ] No Hire\n- [ ] Strong No Hire\n\n### Level Recommendation: {{recommended_level}}\n\n### Additional Notes for Hiring Manager\n{{additional_notes}}'
        }
      ]
    },
    variables: [
      '{{candidate_name}}', '{{position}}', '{{level}}', '{{date}}', '{{interviewer}}',
      '{{interview_type}}', '{{problem_solving_score}}', '{{code_quality_score}}',
      '{{language_score}}', '{{testing_score}}', '{{problem_name}}', '{{difficulty}}',
      '{{time_given}}', '{{topic_1}}', '{{topic_2}}', '{{topic_3}}', '{{strong_tech}}',
      '{{learning_tech}}', '{{tech_gaps}}', '{{clarity_score}}', '{{feedback_handling}}',
      '{{debugging_score}}', '{{overall_score}}', '{{strength_1}}', '{{strength_2}}',
      '{{strength_3}}', '{{concern_1}}', '{{concern_2}}', '{{recommended_level}}', '{{additional_notes}}'
    ],
    tags: ['interview', 'technical', 'hiring', 'coding', 'assessment'],
    usageCount: 789
  },
  {
    name: 'Behavioral Interview',
    description: 'Template for behavioral/culture fit interview assessments',
    type: TemplateType.interview,
    category: 'interview',
    templateData: {
      sections: [
        {
          title: 'Interview Details',
          content: '**Candidate:** {{candidate_name}}\n**Position:** {{position}}\n**Date:** {{date}}\n**Interviewer:** {{interviewer}}\n**Role:** {{interviewer_role}}\n**Focus Areas:** {{focus_areas}}'
        },
        {
          title: 'STAR Responses',
          content: '### Question 1: {{question_1}}\n**Situation:** \n**Task:** \n**Action:** \n**Result:** \n**Score:** {{q1_score}}/5\n\n### Question 2: {{question_2}}\n**Situation:** \n**Task:** \n**Action:** \n**Result:** \n**Score:** {{q2_score}}/5\n\n### Question 3: {{question_3}}\n**Situation:** \n**Task:** \n**Action:** \n**Result:** \n**Score:** {{q3_score}}/5'
        },
        {
          title: 'Competency Assessment',
          content: '### Core Competencies\n| Competency | Score (1-5) | Evidence |\n|------------|-------------|----------|\n| Leadership | {{leadership_score}} | |\n| Collaboration | {{collaboration_score}} | |\n| Communication | {{communication_score}} | |\n| Problem Solving | {{problem_solving_score}} | |\n| Adaptability | {{adaptability_score}} | |\n| Initiative | {{initiative_score}} | |'
        },
        {
          title: 'Culture Fit',
          content: '### Company Values Alignment\n| Value | Alignment | Examples Shared |\n|-------|-----------|----------------|\n| {{value_1}} | Strong/Moderate/Weak | |\n| {{value_2}} | Strong/Moderate/Weak | |\n| {{value_3}} | Strong/Moderate/Weak | |\n\n### Work Style\n- Preferred environment: {{work_style}}\n- Collaboration preference: \n- Conflict resolution approach: \n\n### Motivation & Career Goals\n- Why this role: \n- Where in 5 years: \n- What excites them:'
        },
        {
          title: 'Recommendation',
          content: '### Overall Culture Fit Score: {{overall_score}}/5\n\n### Key Strengths\n1. {{strength_1}}\n2. {{strength_2}}\n\n### Potential Concerns\n1. {{concern_1}}\n2. {{concern_2}}\n\n### Hiring Recommendation\n- [ ] Strong Hire\n- [ ] Hire\n- [ ] No Hire\n- [ ] Strong No Hire\n\n### Best Fit Team/Role: {{team_recommendation}}\n\n### Questions for Next Round\n- {{next_question_1}}\n- {{next_question_2}}'
        }
      ]
    },
    variables: [
      '{{candidate_name}}', '{{position}}', '{{date}}', '{{interviewer}}', '{{interviewer_role}}',
      '{{focus_areas}}', '{{question_1}}', '{{q1_score}}', '{{question_2}}', '{{q2_score}}',
      '{{question_3}}', '{{q3_score}}', '{{leadership_score}}', '{{collaboration_score}}',
      '{{communication_score}}', '{{problem_solving_score}}', '{{adaptability_score}}',
      '{{initiative_score}}', '{{value_1}}', '{{value_2}}', '{{value_3}}', '{{work_style}}',
      '{{overall_score}}', '{{strength_1}}', '{{strength_2}}', '{{concern_1}}', '{{concern_2}}',
      '{{team_recommendation}}', '{{next_question_1}}', '{{next_question_2}}'
    ],
    tags: ['interview', 'behavioral', 'hiring', 'culture fit', 'STAR'],
    usageCount: 654
  },
  {
    name: 'Hiring Debrief',
    description: 'Template for post-interview hiring committee discussions',
    type: TemplateType.interview,
    category: 'interview',
    templateData: {
      sections: [
        {
          title: 'Candidate Overview',
          content: '**Candidate:** {{candidate_name}}\n**Position:** {{position}}\n**Level:** {{level}}\n**Recruiter:** {{recruiter}}\n**Hiring Manager:** {{hiring_manager}}\n**Debrief Date:** {{date}}\n**Interview Loop Dates:** {{loop_dates}}'
        },
        {
          title: 'Interview Summary',
          content: '### Interview Scores\n| Interviewer | Round | Score | Recommendation |\n|-------------|-------|-------|----------------|\n| {{interviewer_1}} | {{round_1}} | {{score_1}}/5 | Hire/No Hire |\n| {{interviewer_2}} | {{round_2}} | {{score_2}}/5 | Hire/No Hire |\n| {{interviewer_3}} | {{round_3}} | {{score_3}}/5 | Hire/No Hire |\n| {{interviewer_4}} | {{round_4}} | {{score_4}}/5 | Hire/No Hire |\n\n### Overall Score: {{overall_score}}/5'
        },
        {
          title: 'Strengths & Concerns',
          content: '### Consistent Strengths (across interviewers)\n1. {{shared_strength_1}}\n2. {{shared_strength_2}}\n3. {{shared_strength_3}}\n\n### Consistent Concerns\n1. {{shared_concern_1}}\n2. {{shared_concern_2}}\n\n### Conflicting Feedback\n| Topic | Positive View | Negative View |\n|-------|---------------|---------------|'
        },
        {
          title: 'Discussion Points',
          content: '### Key Questions to Resolve\n1. {{question_1}}\n   - Discussion: \n   - Resolution: \n\n2. {{question_2}}\n   - Discussion: \n   - Resolution: \n\n### Level Calibration\n- Proposed Level: {{proposed_level}}\n- Concerns about level: \n- Final Level Decision: {{final_level}}'
        },
        {
          title: 'Decision & Next Steps',
          content: '### Final Decision\n- [ ] Extend Offer\n- [ ] Additional Round Needed\n- [ ] Reject\n- [ ] Hold for Different Role\n\n### If Extending Offer\n- Compensation: {{comp_range}}\n- Start Date: {{target_start}}\n- Signing Bonus: {{signing_bonus}}\n\n### Action Items\n| Action | Owner | Due |\n|--------|-------|-----|\n| {{action_1}} | {{owner_1}} | {{due_1}} |\n\n### Notes for Offer Call\n{{offer_notes}}'
        }
      ]
    },
    variables: [
      '{{candidate_name}}', '{{position}}', '{{level}}', '{{recruiter}}', '{{hiring_manager}}',
      '{{date}}', '{{loop_dates}}', '{{interviewer_1}}', '{{round_1}}', '{{score_1}}',
      '{{interviewer_2}}', '{{round_2}}', '{{score_2}}', '{{interviewer_3}}', '{{round_3}}',
      '{{score_3}}', '{{interviewer_4}}', '{{round_4}}', '{{score_4}}', '{{overall_score}}',
      '{{shared_strength_1}}', '{{shared_strength_2}}', '{{shared_strength_3}}',
      '{{shared_concern_1}}', '{{shared_concern_2}}', '{{question_1}}', '{{question_2}}',
      '{{proposed_level}}', '{{final_level}}', '{{comp_range}}', '{{target_start}}',
      '{{signing_bonus}}', '{{action_1}}', '{{owner_1}}', '{{due_1}}', '{{offer_notes}}'
    ],
    tags: ['interview', 'hiring', 'debrief', 'decision', 'committee'],
    usageCount: 423
  },

  // ========================================
  // PROJECT CATEGORY
  // ========================================
  {
    name: 'Sprint Planning',
    description: 'Template for agile sprint planning sessions',
    type: TemplateType.team_meeting,
    category: 'project',
    templateData: {
      sections: [
        {
          title: 'Sprint Info',
          content: '**Sprint:** {{sprint_name}}\n**Sprint Goal:** {{sprint_goal}}\n**Duration:** {{sprint_duration}} ({{start_date}} - {{end_date}})\n**Team:** {{team_name}}\n**Scrum Master:** {{scrum_master}}\n**Product Owner:** {{product_owner}}'
        },
        {
          title: 'Capacity Planning',
          content: '### Team Capacity\n| Team Member | Available Days | Capacity (pts) | Notes |\n|-------------|----------------|----------------|-------|\n| {{member_1}} | {{days_1}} | {{capacity_1}} | {{notes_1}} |\n| {{member_2}} | {{days_2}} | {{capacity_2}} | {{notes_2}} |\n| {{member_3}} | {{days_3}} | {{capacity_3}} | {{notes_3}} |\n| {{member_4}} | {{days_4}} | {{capacity_4}} | {{notes_4}} |\n\n**Total Capacity:** {{total_capacity}} points\n**Velocity (last 3 sprints):** {{velocity}}'
        },
        {
          title: 'Backlog Review',
          content: '### Committed Stories\n| # | Story | Points | Owner | Priority |\n|---|-------|--------|-------|----------|\n| {{story_id_1}} | {{story_1}} | {{points_1}} | {{owner_1}} | P{{priority_1}} |\n| {{story_id_2}} | {{story_2}} | {{points_2}} | {{owner_2}} | P{{priority_2}} |\n| {{story_id_3}} | {{story_3}} | {{points_3}} | {{owner_3}} | P{{priority_3}} |\n| {{story_id_4}} | {{story_4}} | {{points_4}} | {{owner_4}} | P{{priority_4}} |\n\n**Total Committed:** {{total_points}} points\n**Buffer:** {{buffer_points}} points'
        },
        {
          title: 'Dependencies & Risks',
          content: '### External Dependencies\n| Dependency | Waiting On | Expected Date | Risk Level |\n|------------|------------|---------------|------------|\n| {{dep_1}} | {{waiting_1}} | {{date_1}} | High/Med/Low |\n| {{dep_2}} | {{waiting_2}} | {{date_2}} | High/Med/Low |\n\n### Technical Risks\n1. {{risk_1}} - Mitigation: {{mitigation_1}}\n2. {{risk_2}} - Mitigation: {{mitigation_2}}\n\n### Carry-Over Items\n- '
        },
        {
          title: 'Sprint Commitments',
          content: '### Definition of Done\n- [ ] Code complete and reviewed\n- [ ] Tests written and passing\n- [ ] Documentation updated\n- [ ] Deployed to staging\n- [ ] PO acceptance\n\n### Team Agreements\n- Stand-up time: {{standup_time}}\n- Code review SLA: {{review_sla}}\n- On-call: {{oncall_person}}\n\n### Notes & Concerns\n{{planning_notes}}'
        }
      ]
    },
    variables: [
      '{{sprint_name}}', '{{sprint_goal}}', '{{sprint_duration}}', '{{start_date}}', '{{end_date}}',
      '{{team_name}}', '{{scrum_master}}', '{{product_owner}}', '{{member_1}}', '{{days_1}}',
      '{{capacity_1}}', '{{notes_1}}', '{{member_2}}', '{{days_2}}', '{{capacity_2}}', '{{notes_2}}',
      '{{member_3}}', '{{days_3}}', '{{capacity_3}}', '{{notes_3}}', '{{member_4}}', '{{days_4}}',
      '{{capacity_4}}', '{{notes_4}}', '{{total_capacity}}', '{{velocity}}', '{{story_id_1}}',
      '{{story_1}}', '{{points_1}}', '{{owner_1}}', '{{priority_1}}', '{{story_id_2}}', '{{story_2}}',
      '{{points_2}}', '{{owner_2}}', '{{priority_2}}', '{{story_id_3}}', '{{story_3}}', '{{points_3}}',
      '{{owner_3}}', '{{priority_3}}', '{{story_id_4}}', '{{story_4}}', '{{points_4}}', '{{owner_4}}',
      '{{priority_4}}', '{{total_points}}', '{{buffer_points}}', '{{dep_1}}', '{{waiting_1}}',
      '{{date_1}}', '{{dep_2}}', '{{waiting_2}}', '{{date_2}}', '{{risk_1}}', '{{mitigation_1}}',
      '{{risk_2}}', '{{mitigation_2}}', '{{standup_time}}', '{{review_sla}}', '{{oncall_person}}',
      '{{planning_notes}}'
    ],
    tags: ['project', 'sprint', 'agile', 'planning', 'scrum'],
    usageCount: 1234
  },
  {
    name: 'Sprint Retrospective',
    description: 'Template for agile sprint retrospective meetings',
    type: TemplateType.retrospective,
    category: 'project',
    templateData: {
      sections: [
        {
          title: 'Retrospective Info',
          content: '**Sprint:** {{sprint_name}}\n**Date:** {{date}}\n**Facilitator:** {{facilitator}}\n**Team:** {{team_name}}\n**Attendees:** {{attendees}}\n**Format:** {{retro_format}} (Start/Stop/Continue, 4Ls, Sailboat, etc.)'
        },
        {
          title: 'Sprint Metrics',
          content: '### Sprint Results\n| Metric | Planned | Actual | Notes |\n|--------|---------|--------|-------|\n| Story Points | {{planned_points}} | {{actual_points}} | |\n| Stories Completed | {{planned_stories}} | {{completed_stories}} | |\n| Bugs Fixed | - | {{bugs_fixed}} | |\n| Velocity | {{target_velocity}} | {{actual_velocity}} | |\n\n### Goal Achievement\n- Sprint Goal: {{sprint_goal}}\n- Achieved: Yes/Partial/No\n- Notes:'
        },
        {
          title: 'What Went Well',
          content: '### Successes & Wins 🎉\n1. {{success_1}}\n2. {{success_2}}\n3. {{success_3}}\n\n### Team Highlights\n- \n\n### Process Improvements That Worked\n- \n\n### Individual Shoutouts\n- {{shoutout_1}}: {{reason_1}}\n- {{shoutout_2}}: {{reason_2}}'
        },
        {
          title: 'What Could Be Better',
          content: '### Challenges & Pain Points 😓\n1. {{challenge_1}}\n2. {{challenge_2}}\n3. {{challenge_3}}\n\n### What Slowed Us Down\n- \n\n### Frustrations\n- \n\n### Near Misses\n- '
        },
        {
          title: 'Action Items',
          content: '### Improvements for Next Sprint\n| Action | Owner | Measure of Success |\n|--------|-------|--------------------|\n| {{action_1}} | {{owner_1}} | {{measure_1}} |\n| {{action_2}} | {{owner_2}} | {{measure_2}} |\n| {{action_3}} | {{owner_3}} | {{measure_3}} |\n\n### Experiments to Try\n- {{experiment_1}}\n- {{experiment_2}}\n\n### Team Health Score: {{health_score}}/10\n\n### Previous Retro Actions Review\n| Action | Status | Impact |\n|--------|--------|--------|'
        }
      ]
    },
    variables: [
      '{{sprint_name}}', '{{date}}', '{{facilitator}}', '{{team_name}}', '{{attendees}}',
      '{{retro_format}}', '{{planned_points}}', '{{actual_points}}', '{{planned_stories}}',
      '{{completed_stories}}', '{{bugs_fixed}}', '{{target_velocity}}', '{{actual_velocity}}',
      '{{sprint_goal}}', '{{success_1}}', '{{success_2}}', '{{success_3}}', '{{shoutout_1}}',
      '{{reason_1}}', '{{shoutout_2}}', '{{reason_2}}', '{{challenge_1}}', '{{challenge_2}}',
      '{{challenge_3}}', '{{action_1}}', '{{owner_1}}', '{{measure_1}}', '{{action_2}}',
      '{{owner_2}}', '{{measure_2}}', '{{action_3}}', '{{owner_3}}', '{{measure_3}}',
      '{{experiment_1}}', '{{experiment_2}}', '{{health_score}}'
    ],
    tags: ['project', 'retrospective', 'agile', 'improvement', 'team health'],
    usageCount: 987
  },
  {
    name: 'Project Kickoff',
    description: 'Template for new project kickoff meetings',
    type: TemplateType.team_meeting,
    category: 'project',
    templateData: {
      sections: [
        {
          title: 'Project Overview',
          content: '**Project Name:** {{project_name}}\n**Date:** {{date}}\n**Project Sponsor:** {{sponsor}}\n**Project Manager:** {{project_manager}}\n**Team:** {{team_members}}\n**Duration:** {{duration}} ({{start_date}} - {{end_date}})'
        },
        {
          title: 'Vision & Goals',
          content: '### Project Vision\n{{project_vision}}\n\n### Business Objectives\n1. {{objective_1}}\n2. {{objective_2}}\n3. {{objective_3}}\n\n### Success Criteria\n| Metric | Target | How Measured |\n|--------|--------|-------------|\n| {{metric_1}} | {{target_1}} | |\n| {{metric_2}} | {{target_2}} | |\n\n### Out of Scope\n- {{out_of_scope_1}}\n- {{out_of_scope_2}}'
        },
        {
          title: 'Roles & Responsibilities',
          content: '### RACI Matrix\n| Task | Responsible | Accountable | Consulted | Informed |\n|------|-------------|-------------|-----------|----------|\n| {{task_1}} | {{r_1}} | {{a_1}} | {{c_1}} | {{i_1}} |\n| {{task_2}} | {{r_2}} | {{a_2}} | {{c_2}} | {{i_2}} |\n\n### Key Stakeholders\n| Stakeholder | Role | Interest | Communication |\n|-------------|------|----------|---------------|\n| {{stakeholder_1}} | {{role_1}} | {{interest_1}} | Weekly/Bi-weekly |\n| {{stakeholder_2}} | {{role_2}} | {{interest_2}} | Weekly/Bi-weekly |'
        },
        {
          title: 'Timeline & Milestones',
          content: '### Key Milestones\n| Milestone | Date | Owner | Deliverable |\n|-----------|------|-------|-------------|\n| {{milestone_1}} | {{m_date_1}} | {{m_owner_1}} | |\n| {{milestone_2}} | {{m_date_2}} | {{m_owner_2}} | |\n| {{milestone_3}} | {{m_date_3}} | {{m_owner_3}} | |\n| {{milestone_4}} | {{m_date_4}} | {{m_owner_4}} | |\n\n### Budget\n- Total Budget: {{total_budget}}\n- Contingency: {{contingency}}'
        },
        {
          title: 'Risks & Next Steps',
          content: '### Identified Risks\n| Risk | Probability | Impact | Mitigation | Owner |\n|------|-------------|--------|------------|-------|\n| {{risk_1}} | High/Med/Low | High/Med/Low | {{mitigation_1}} | {{risk_owner_1}} |\n| {{risk_2}} | High/Med/Low | High/Med/Low | {{mitigation_2}} | {{risk_owner_2}} |\n\n### Immediate Action Items\n| Action | Owner | Due |\n|--------|-------|-----|\n| {{action_1}} | {{action_owner_1}} | {{action_due_1}} |\n| {{action_2}} | {{action_owner_2}} | {{action_due_2}} |\n\n### Communication Plan\n- Status Updates: {{status_frequency}}\n- Steering Committee: {{steering_frequency}}\n- Tools: {{tools}}'
        }
      ]
    },
    variables: [
      '{{project_name}}', '{{date}}', '{{sponsor}}', '{{project_manager}}', '{{team_members}}',
      '{{duration}}', '{{start_date}}', '{{end_date}}', '{{project_vision}}', '{{objective_1}}',
      '{{objective_2}}', '{{objective_3}}', '{{metric_1}}', '{{target_1}}', '{{metric_2}}',
      '{{target_2}}', '{{out_of_scope_1}}', '{{out_of_scope_2}}', '{{task_1}}', '{{r_1}}',
      '{{a_1}}', '{{c_1}}', '{{i_1}}', '{{task_2}}', '{{r_2}}', '{{a_2}}', '{{c_2}}', '{{i_2}}',
      '{{stakeholder_1}}', '{{role_1}}', '{{interest_1}}', '{{stakeholder_2}}', '{{role_2}}',
      '{{interest_2}}', '{{milestone_1}}', '{{m_date_1}}', '{{m_owner_1}}', '{{milestone_2}}',
      '{{m_date_2}}', '{{m_owner_2}}', '{{milestone_3}}', '{{m_date_3}}', '{{m_owner_3}}',
      '{{milestone_4}}', '{{m_date_4}}', '{{m_owner_4}}', '{{total_budget}}', '{{contingency}}',
      '{{risk_1}}', '{{mitigation_1}}', '{{risk_owner_1}}', '{{risk_2}}', '{{mitigation_2}}',
      '{{risk_owner_2}}', '{{action_1}}', '{{action_owner_1}}', '{{action_due_1}}', '{{action_2}}',
      '{{action_owner_2}}', '{{action_due_2}}', '{{status_frequency}}', '{{steering_frequency}}', '{{tools}}'
    ],
    tags: ['project', 'kickoff', 'planning', 'initiation', 'RACI'],
    usageCount: 678
  },
  {
    name: 'Incident Postmortem',
    description: 'Template for post-incident review and learnings',
    type: TemplateType.team_meeting,
    category: 'project',
    templateData: {
      sections: [
        {
          title: 'Incident Summary',
          content: '**Incident ID:** {{incident_id}}\n**Date:** {{incident_date}}\n**Duration:** {{duration}}\n**Severity:** {{severity}} (SEV1/SEV2/SEV3)\n**Incident Commander:** {{incident_commander}}\n**Author:** {{author}}\n**Postmortem Date:** {{postmortem_date}}'
        },
        {
          title: 'Impact Assessment',
          content: '### Customer Impact\n- Users Affected: {{users_affected}}\n- Revenue Impact: ${{revenue_impact}}\n- SLA Breach: Yes/No\n- Customer Tickets: {{ticket_count}}\n\n### Technical Impact\n- Services Affected: {{services_affected}}\n- Data Loss: Yes/No - Details: \n- Error Rate: {{error_rate}}%\n- Downtime: {{downtime_minutes}} minutes'
        },
        {
          title: 'Timeline',
          content: '### Incident Timeline\n| Time ({{timezone}}) | Event | Actor |\n|---------------------|-------|-------|\n| {{time_1}} | {{event_1}} - Detection | {{actor_1}} |\n| {{time_2}} | {{event_2}} - Escalation | {{actor_2}} |\n| {{time_3}} | {{event_3}} - Mitigation started | {{actor_3}} |\n| {{time_4}} | {{event_4}} - Resolution | {{actor_4}} |\n| {{time_5}} | {{event_5}} - All-clear | {{actor_5}} |\n\n### Key Metrics\n- Time to Detection (TTD): {{ttd}} minutes\n- Time to Mitigation (TTM): {{ttm}} minutes\n- Time to Resolution (TTR): {{ttr}} minutes'
        },
        {
          title: 'Root Cause Analysis',
          content: '### Root Cause\n{{root_cause}}\n\n### 5 Whys Analysis\n1. Why? {{why_1}}\n2. Why? {{why_2}}\n3. Why? {{why_3}}\n4. Why? {{why_4}}\n5. Why? {{why_5}}\n\n### Contributing Factors\n- {{factor_1}}\n- {{factor_2}}\n- {{factor_3}}\n\n### What Went Well\n- \n\n### What Went Poorly\n- '
        },
        {
          title: 'Action Items',
          content: '### Preventive Actions\n| Action | Owner | Priority | Due Date | Status |\n|--------|-------|----------|----------|--------|\n| {{action_1}} | {{owner_1}} | P{{priority_1}} | {{due_1}} | Open |\n| {{action_2}} | {{owner_2}} | P{{priority_2}} | {{due_2}} | Open |\n| {{action_3}} | {{owner_3}} | P{{priority_3}} | {{due_3}} | Open |\n\n### Detection Improvements\n- \n\n### Process Improvements\n- \n\n### Follow-up Meeting: {{followup_date}}'
        }
      ]
    },
    variables: [
      '{{incident_id}}', '{{incident_date}}', '{{duration}}', '{{severity}}', '{{incident_commander}}',
      '{{author}}', '{{postmortem_date}}', '{{users_affected}}', '{{revenue_impact}}', '{{ticket_count}}',
      '{{services_affected}}', '{{error_rate}}', '{{downtime_minutes}}', '{{timezone}}', '{{time_1}}',
      '{{event_1}}', '{{actor_1}}', '{{time_2}}', '{{event_2}}', '{{actor_2}}', '{{time_3}}',
      '{{event_3}}', '{{actor_3}}', '{{time_4}}', '{{event_4}}', '{{actor_4}}', '{{time_5}}',
      '{{event_5}}', '{{actor_5}}', '{{ttd}}', '{{ttm}}', '{{ttr}}', '{{root_cause}}',
      '{{why_1}}', '{{why_2}}', '{{why_3}}', '{{why_4}}', '{{why_5}}', '{{factor_1}}',
      '{{factor_2}}', '{{factor_3}}', '{{action_1}}', '{{owner_1}}', '{{priority_1}}', '{{due_1}}',
      '{{action_2}}', '{{owner_2}}', '{{priority_2}}', '{{due_2}}', '{{action_3}}', '{{owner_3}}',
      '{{priority_3}}', '{{due_3}}', '{{followup_date}}'
    ],
    tags: ['project', 'incident', 'postmortem', 'root cause', 'SRE'],
    usageCount: 345
  },
  {
    name: 'Design Review',
    description: 'Template for technical and product design review meetings',
    type: TemplateType.team_meeting,
    category: 'project',
    templateData: {
      sections: [
        {
          title: 'Review Overview',
          content: '**Design:** {{design_name}}\n**Author:** {{author}}\n**Date:** {{date}}\n**Reviewers:** {{reviewers}}\n**Design Doc Link:** {{doc_link}}\n**Review Type:** {{review_type}} (Initial/Follow-up/Final)'
        },
        {
          title: 'Design Summary',
          content: '### Problem Statement\n{{problem_statement}}\n\n### Proposed Solution\n{{proposed_solution}}\n\n### Alternatives Considered\n| Alternative | Pros | Cons | Why Not Chosen |\n|-------------|------|------|----------------|\n| {{alt_1}} | | | |\n| {{alt_2}} | | | |'
        },
        {
          title: 'Technical Discussion',
          content: '### Architecture Feedback\n| Component | Feedback | Severity | Status |\n|-----------|----------|----------|--------|\n| {{component_1}} | {{feedback_1}} | High/Med/Low | Addressed/Open |\n| {{component_2}} | {{feedback_2}} | High/Med/Low | Addressed/Open |\n\n### Scalability Concerns\n- \n\n### Security Considerations\n- \n\n### Performance Implications\n- '
        },
        {
          title: 'Open Questions',
          content: '### Questions Raised\n| Question | Answer | Follow-up Needed |\n|----------|--------|------------------|\n| {{question_1}} | {{answer_1}} | Yes/No |\n| {{question_2}} | {{answer_2}} | Yes/No |\n| {{question_3}} | {{answer_3}} | Yes/No |\n\n### Unresolved Issues\n1. {{issue_1}} - Owner: {{issue_owner_1}}\n2. {{issue_2}} - Owner: {{issue_owner_2}}'
        },
        {
          title: 'Decision & Next Steps',
          content: '### Review Decision\n- [ ] Approved\n- [ ] Approved with changes\n- [ ] Needs revision\n- [ ] Rejected\n\n### Required Changes Before Approval\n1. {{change_1}}\n2. {{change_2}}\n\n### Action Items\n| Action | Owner | Due |\n|--------|-------|-----|\n| Update design doc | {{author}} | {{due_1}} |\n| | | |\n\n### Follow-up Review: {{followup_date}}'
        }
      ]
    },
    variables: [
      '{{design_name}}', '{{author}}', '{{date}}', '{{reviewers}}', '{{doc_link}}', '{{review_type}}',
      '{{problem_statement}}', '{{proposed_solution}}', '{{alt_1}}', '{{alt_2}}', '{{component_1}}',
      '{{feedback_1}}', '{{component_2}}', '{{feedback_2}}', '{{question_1}}', '{{answer_1}}',
      '{{question_2}}', '{{answer_2}}', '{{question_3}}', '{{answer_3}}', '{{issue_1}}',
      '{{issue_owner_1}}', '{{issue_2}}', '{{issue_owner_2}}', '{{change_1}}', '{{change_2}}',
      '{{due_1}}', '{{followup_date}}'
    ],
    tags: ['project', 'design', 'review', 'architecture', 'RFC'],
    usageCount: 456
  }
];

async function main() {
  console.log('🌱 Seeding pre-built templates...\n');

  // First, clear existing pre-built templates
  console.log('🧹 Clearing existing pre-built templates...');
  await prisma.meetingTemplate.deleteMany({
    where: { isPreBuilt: true }
  });

  // Insert new pre-built templates
  console.log('📋 Inserting pre-built templates...\n');

  let successCount = 0;
  for (const template of preBuiltTemplates) {
    try {
      await prisma.meetingTemplate.create({
        data: {
          name: template.name,
          description: template.description,
          type: template.type,
          category: template.category,
          templateData: template.templateData,
          variables: template.variables,
          isActive: true,
          isPreBuilt: true,
          usageCount: template.usageCount,
          tags: template.tags,
          organizationId: null, // Pre-built templates are not tied to any organization
          userId: null, // Pre-built templates are not created by any user
        }
      });
      console.log(`  ✅ ${template.name}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed to create template "${template.name}":`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Pre-built templates seeded successfully!`);
  console.log(`   Total templates: ${successCount}/${preBuiltTemplates.length}`);
  console.log('\n📊 Templates by Category:');
  console.log(`   - Sales: 3`);
  console.log(`   - Customer Success: 3`);
  console.log(`   - Internal: 4`);
  console.log(`   - Interview: 3`);
  console.log(`   - Project: 5`);
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
