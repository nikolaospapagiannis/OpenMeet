/**
 * Industry Model Templates
 * Pre-configured templates for industry-specific AI model fine-tuning
 * Includes: Healthcare, Legal, Finance, Sales
 * ZERO TOLERANCE: Real industry-compliant templates
 */

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'industry-templates' },
  transports: [new winston.transports.Console()],
});

// ====================================
// Types and Interfaces
// ====================================

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  modelType: 'categorization' | 'sentiment' | 'summary' | 'custom';
  systemPrompt: string;
  baseModel: string;
  trainingExamples: Array<{
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
  }>;
  evaluationCriteria: {
    accuracy: string;
    compliance: string;
    specificity: string;
  };
  complianceRequirements?: string[];
  customVocabulary?: Record<string, string>;
  hyperparameters: {
    n_epochs: number;
    batch_size?: number;
    learning_rate_multiplier?: number;
  };
}

// ====================================
// Industry Templates
// ====================================

/**
 * Healthcare Industry Template - HIPAA Compliant
 */
export const HEALTHCARE_TEMPLATE: IndustryTemplate = {
  id: 'healthcare',
  name: 'Healthcare & Medical',
  description: 'HIPAA-compliant template for medical meetings, patient consultations, and healthcare discussions',
  industry: 'healthcare',
  modelType: 'summary',
  baseModel: 'gpt-3.5-turbo-1106',
  systemPrompt: `You are a specialized AI assistant for healthcare meetings. You understand medical terminology, HIPAA compliance, and patient care workflows.

Your responsibilities:
- Summarize medical meetings while maintaining patient confidentiality
- Identify clinical action items and follow-ups
- Extract medical diagnoses, treatments, and care plans
- Recognize medical terminology and abbreviations
- Flag potential compliance issues
- Maintain professional medical communication standards

IMPORTANT: Always protect PHI (Protected Health Information). Replace patient identifiers with generic labels.`,

  trainingExamples: [
    {
      messages: [
        {
          role: 'system',
          content: 'You are a specialized AI assistant for healthcare meetings with HIPAA compliance.',
        },
        {
          role: 'user',
          content: `Summarize this patient care team meeting:

Dr. Smith: We need to discuss the treatment plan for the patient with stage 2 hypertension. Current BP readings are 145/95.
Nurse Johnson: Patient has been compliant with medication - taking Lisinopril 10mg daily.
Dr. Smith: Good. Let's increase to 20mg and add lifestyle counseling. Schedule follow-up in 2 weeks.
Pharmacist Lee: I'll coordinate the prescription update and counsel on side effects.`,
        },
        {
          role: 'assistant',
          content: `**Clinical Summary:**

**Patient Condition:** Stage 2 Hypertension (BP: 145/95)

**Current Treatment:**
- Lisinopril 10mg daily (compliant)

**Action Items:**
1. Increase Lisinopril to 20mg daily
2. Provide lifestyle counseling
3. Schedule follow-up appointment in 2 weeks
4. Pharmacist to update prescription and counsel on side effects

**Care Team:**
- Dr. Smith (Attending Physician)
- Nurse Johnson (Care Coordinator)
- Pharmacist Lee (Medication Management)`,
        },
      ],
    },
    {
      messages: [
        {
          role: 'system',
          content: 'You are a specialized AI assistant for healthcare meetings with HIPAA compliance.',
        },
        {
          role: 'user',
          content: `Extract key medical terms and diagnoses from this consultation:

Patient presents with acute onset dyspnea, orthopnea, and peripheral edema. Physical exam reveals JVD, bilateral rales, and 3+ pitting edema. BNP elevated at 850. EKG shows LVH. Diagnosis: Acute decompensated heart failure (ADHF). Admit for IV diuresis and cardiac monitoring.`,
        },
        {
          role: 'assistant',
          content: `**Chief Complaint:** Acute onset dyspnea

**Symptoms:**
- Dyspnea (shortness of breath)
- Orthopnea (difficulty breathing when lying down)
- Peripheral edema

**Physical Findings:**
- JVD (Jugular Venous Distention)
- Bilateral rales (lung crackles)
- 3+ pitting edema

**Lab/Diagnostic Results:**
- BNP: 850 pg/mL (elevated)
- EKG: LVH (Left Ventricular Hypertrophy)

**Diagnosis:** Acute Decompensated Heart Failure (ADHF)

**Treatment Plan:**
- Hospital admission
- IV diuresis therapy
- Cardiac monitoring`,
        },
      ],
    },
  ],

  evaluationCriteria: {
    accuracy: 'Medical terminology accuracy > 95%, diagnosis identification > 90%',
    compliance: 'HIPAA compliance: Zero PHI leakage, proper patient de-identification',
    specificity: 'Correct identification of medications, dosages, and clinical procedures',
  },

  complianceRequirements: [
    'HIPAA compliance - no PHI exposure',
    'Patient de-identification required',
    'Medical terminology accuracy',
    'Clear separation of diagnosis, treatment, and follow-up',
  ],

  customVocabulary: {
    BP: 'Blood Pressure',
    JVD: 'Jugular Venous Distention',
    BNP: 'B-type Natriuretic Peptide',
    LVH: 'Left Ventricular Hypertrophy',
    ADHF: 'Acute Decompensated Heart Failure',
    PHI: 'Protected Health Information',
  },

  hyperparameters: {
    n_epochs: 3,
    learning_rate_multiplier: 0.8,
  },
};

/**
 * Legal Industry Template
 */
export const LEGAL_TEMPLATE: IndustryTemplate = {
  id: 'legal',
  name: 'Legal & Law Firms',
  description: 'Template for legal consultations, case discussions, and legal strategy meetings',
  industry: 'legal',
  modelType: 'summary',
  baseModel: 'gpt-3.5-turbo-1106',
  systemPrompt: `You are a specialized AI assistant for legal meetings and case discussions. You understand legal terminology, case law references, and litigation processes.

Your responsibilities:
- Summarize legal strategy meetings and client consultations
- Identify legal issues, precedents, and case citations
- Extract billable activities and deadlines
- Recognize legal jargon and Latin terms
- Maintain attorney-client privilege confidentiality
- Track discovery items and filing deadlines

IMPORTANT: Maintain strict confidentiality. Use [CLIENT] and [CASE] placeholders for sensitive information.`,

  trainingExamples: [
    {
      messages: [
        {
          role: 'system',
          content: 'You are a specialized AI assistant for legal meetings with confidentiality compliance.',
        },
        {
          role: 'user',
          content: `Summarize this litigation strategy meeting:

Attorney Martinez: We need to address the motion to dismiss in the breach of contract case. The opposing counsel cited Hadley v. Baxendale for consequential damages.
Paralegal Chen: I've completed the discovery requests. We have 30 days to respond.
Attorney Martinez: Good. Let's file our opposition citing UCC Section 2-715 and the recent precedent from Johnson v. Tech Corp. I'll need a draft by Friday.
Associate Lee: I'll prepare the brief and include the depositions from the CFO and VP of Operations.`,
        },
        {
          role: 'assistant',
          content: `**Legal Matter:** [CASE] - Breach of Contract Litigation

**Issues Discussed:**
- Motion to dismiss filed by opposing counsel
- Consequential damages argument (Hadley v. Baxendale)

**Discovery Status:**
- Discovery requests completed
- Response deadline: 30 days from receipt

**Legal Strategy:**
1. File opposition to motion to dismiss
2. Cite UCC Section 2-715 (consequential damages provision)
3. Reference recent precedent: Johnson v. Tech Corp
4. Include depositions from CFO and VP of Operations

**Action Items:**
- Associate Lee: Draft opposition brief (Due: Friday)
- Include relevant case citations and deposition testimony

**Key Legal References:**
- Hadley v. Baxendale (consequential damages)
- UCC § 2-715 (buyer's remedies)
- Johnson v. Tech Corp (recent precedent)

**Deadlines:**
- Discovery response: 30 days
- Opposition brief draft: Friday`,
        },
      ],
    },
    {
      messages: [
        {
          role: 'system',
          content: 'You are a specialized AI assistant for legal meetings with confidentiality compliance.',
        },
        {
          role: 'user',
          content: `Extract action items from this client consultation:

We discussed the estate planning options. Client wants to establish a revocable living trust, draft a will, and create advance healthcare directives. Need to identify trustees, beneficiaries, and healthcare proxies. Schedule follow-up to review trust documents. Retainer agreement signed. Initial consultation: 2.5 billable hours.`,
        },
        {
          role: 'assistant',
          content: `**Matter Type:** Estate Planning

**Services Requested:**
1. Revocable Living Trust establishment
2. Last Will and Testament drafting
3. Advance Healthcare Directives

**Required Information:**
- Trustee designations
- Beneficiary list
- Healthcare proxy appointments

**Action Items:**
1. Draft revocable living trust documents
2. Prepare will
3. Create advance healthcare directives
4. Client to provide: trustee/beneficiary/proxy names
5. Schedule follow-up meeting to review trust documents

**Administrative:**
- Retainer agreement: Signed
- Time entry: Initial consultation - 2.5 hours (billable)

**Next Steps:**
Follow-up meeting after client provides required information`,
        },
      ],
    },
  ],

  evaluationCriteria: {
    accuracy: 'Legal terminology accuracy > 95%, case citation format > 90%',
    compliance: 'Attorney-client privilege maintained, proper redaction of sensitive information',
    specificity: 'Correct identification of legal issues, statutes, and procedural deadlines',
  },

  complianceRequirements: [
    'Attorney-client privilege protection',
    'Proper case citation format',
    'Deadline tracking accuracy',
    'Billable hour documentation',
  ],

  customVocabulary: {
    UCC: 'Uniform Commercial Code',
    'motion to dismiss': 'Legal motion requesting case dismissal before trial',
    'discovery': 'Pre-trial evidence exchange process',
    'deposition': 'Sworn out-of-court testimony',
    'consequential damages': 'Indirect damages resulting from breach',
  },

  hyperparameters: {
    n_epochs: 4,
    learning_rate_multiplier: 0.9,
  },
};

/**
 * Finance Industry Template
 */
export const FINANCE_TEMPLATE: IndustryTemplate = {
  id: 'finance',
  name: 'Finance & Banking',
  description: 'Template for financial advisory meetings, investment discussions, and compliance reviews',
  industry: 'finance',
  modelType: 'summary',
  baseModel: 'gpt-3.5-turbo-1106',
  systemPrompt: `You are a specialized AI assistant for financial services meetings. You understand financial terminology, investment strategies, regulatory compliance, and risk management.

Your responsibilities:
- Summarize investment advisory meetings and portfolio reviews
- Identify financial metrics, KPIs, and market analysis
- Extract risk assessments and compliance requirements
- Recognize financial instruments and trading terminology
- Track regulatory requirements (SEC, FINRA, SOX)
- Maintain confidentiality of financial information

IMPORTANT: Use [CLIENT] and [AMOUNT] placeholders for sensitive financial data. Flag compliance-related discussions.`,

  trainingExamples: [
    {
      messages: [
        {
          role: 'system',
          content: 'You are a specialized AI assistant for financial services meetings with compliance awareness.',
        },
        {
          role: 'user',
          content: `Summarize this portfolio review meeting:

Advisor Rodriguez: Let's review the client's portfolio performance. YTD returns are at 8.2%, outperforming the S&P 500 benchmark by 1.5%.
Client: I'm concerned about the market volatility. Should we rebalance?
Advisor Rodriguez: Your current allocation is 60% equities, 30% fixed income, 10% alternatives. Given your risk tolerance and 10-year time horizon, I recommend maintaining the allocation but shifting 5% from large-cap to international equities for diversification.
Client: What about the tech sector exposure?
Advisor Rodriguez: Currently at 22% of equity allocation. I suggest reducing to 18% and adding to healthcare and consumer staples. Let's schedule a rebalancing trade for next week. I'll send the proposal by email for your approval.`,
        },
        {
          role: 'assistant',
          content: `**Meeting Type:** Portfolio Review & Strategy Discussion

**Portfolio Performance:**
- YTD Return: 8.2%
- Benchmark: S&P 500
- Outperformance: +1.5%

**Current Asset Allocation:**
- Equities: 60%
- Fixed Income: 30%
- Alternatives: 10%

**Client Concerns:**
- Market volatility
- Portfolio rebalancing needs

**Recommended Strategy:**
1. Maintain overall allocation (aligns with risk tolerance and 10-year horizon)
2. Shift 5% from large-cap to international equities (diversification)
3. Reduce tech sector exposure from 22% to 18%
4. Increase allocation to healthcare and consumer staples sectors

**Action Items:**
1. Prepare rebalancing proposal for client approval
2. Send proposal via email
3. Schedule rebalancing trades for next week (pending approval)

**Risk Management:**
- Strategy aligns with client risk tolerance
- Diversification across sectors and geographies
- Time horizon: 10 years

**Compliance Note:** Investment recommendation documented, client approval required before execution`,
        },
      ],
    },
    {
      messages: [
        {
          role: 'system',
          content: 'You are a specialized AI assistant for financial services meetings with compliance awareness.',
        },
        {
          role: 'user',
          content: `Extract key points from this risk committee meeting:

CFO: Q3 credit risk exposure increased by 12% due to expansion in emerging markets. Current VaR is 2.1 million, within our 2.5 million limit.
Risk Officer: We need to enhance our AML monitoring. Recent FINRA guidance requires additional transaction surveillance for accounts over 250K.
Compliance Director: I recommend implementing enhanced due diligence for PEPs and increasing our KYC refresh frequency to annually.
CFO: Approved. What's the implementation timeline?
Compliance Director: 60 days for system updates, 90 days for full deployment. We'll need board approval for the budget increase.`,
        },
        {
          role: 'assistant',
          content: `**Meeting Type:** Risk Committee Review

**Credit Risk:**
- Q3 exposure increased: +12%
- Driver: Emerging markets expansion
- Value at Risk (VaR): $2.1M
- VaR Limit: $2.5M
- Status: Within acceptable limits

**Regulatory Compliance:**
- FINRA guidance: Enhanced AML monitoring required
- Threshold: Accounts > $250K

**Recommended Controls:**
1. Enhanced Due Diligence (EDD) for Politically Exposed Persons (PEPs)
2. KYC refresh frequency: Annually (increased)
3. Enhanced transaction surveillance system

**Implementation Plan:**
- Phase 1: System updates (60 days)
- Phase 2: Full deployment (90 days)
- Requirement: Board approval for budget increase

**Compliance Requirements:**
- AML (Anti-Money Laundering) monitoring enhancement
- KYC (Know Your Customer) process improvement
- FINRA regulatory compliance

**Decision:** Approved by CFO, pending board budget approval

**Risk Metrics:**
- VaR: $2.1M / $2.5M limit (84% utilization)
- Credit risk exposure trend: Upward
- Mitigation: Enhanced monitoring and controls`,
        },
      ],
    },
  ],

  evaluationCriteria: {
    accuracy: 'Financial terminology accuracy > 95%, regulatory reference accuracy > 90%',
    compliance: 'SEC/FINRA compliance awareness, proper handling of material non-public information',
    specificity: 'Correct identification of financial instruments, metrics, and risk factors',
  },

  complianceRequirements: [
    'SEC Regulation Best Interest (Reg BI) compliance',
    'FINRA suitability standards',
    'SOX financial controls',
    'AML/KYC documentation',
  ],

  customVocabulary: {
    YTD: 'Year-to-Date',
    VaR: 'Value at Risk',
    AML: 'Anti-Money Laundering',
    KYC: 'Know Your Customer',
    PEP: 'Politically Exposed Person',
    EDD: 'Enhanced Due Diligence',
    'S&P 500': 'Standard & Poor\'s 500 Index',
  },

  hyperparameters: {
    n_epochs: 3,
    learning_rate_multiplier: 0.85,
  },
};

/**
 * Sales Industry Template
 */
export const SALES_TEMPLATE: IndustryTemplate = {
  id: 'sales',
  name: 'Sales & Business Development',
  description: 'Template for sales calls, deal reviews, objection handling, and closing techniques',
  industry: 'sales',
  modelType: 'summary',
  baseModel: 'gpt-3.5-turbo-1106',
  systemPrompt: `You are a specialized AI assistant for sales meetings and business development calls. You understand sales methodologies (SPIN, MEDDIC, Challenger), objection handling, and deal qualification.

Your responsibilities:
- Summarize sales calls and prospect meetings
- Identify buyer signals, objections, and pain points
- Extract qualification criteria (budget, authority, need, timeline)
- Track deal progression and next steps
- Recognize closing opportunities and action items
- Analyze competitor mentions and competitive positioning

IMPORTANT: Focus on actionable insights that help close deals. Identify BANT/MEDDIC qualification status.`,

  trainingExamples: [
    {
      messages: [
        {
          role: 'system',
          content: 'You are a specialized AI assistant for sales meetings with focus on deal progression.',
        },
        {
          role: 'user',
          content: `Summarize this sales discovery call:

Sales Rep Johnson: Thanks for taking the time today. Can you tell me about your current process for managing customer data?
Prospect (VP Operations): We're using a mix of spreadsheets and an outdated CRM. It's causing data silos and our sales team is frustrated.
Sales Rep: How is this impacting your business?
Prospect: We're losing deals due to slow response times. Our sales cycle has increased by 30% over the last year.
Sales Rep: That sounds costly. What's your timeline for solving this?
Prospect: We need a solution by Q1 next year. Budget is approved - around 150K annually.
Sales Rep: Who else is involved in this decision?
Prospect: I'm the primary decision maker, but I'll need buy-in from our CTO and CFO.
Sales Rep: Perfect. Let me show you how our platform reduced sales cycle time by 40% for similar companies.`,
        },
        {
          role: 'assistant',
          content: `**Call Type:** Discovery Call - Initial Qualification

**Prospect Company:** [COMPANY]
**Contact:** VP of Operations (Decision Maker)

**MEDDIC Qualification:**
- **Metrics:** Sales cycle increased 30% YoY, losing deals due to slow response
- **Economic Buyer:** VP Operations (primary), CFO/CTO approval needed
- **Decision Criteria:** Reduce sales cycle time, integrate data systems
- **Decision Process:** VP Operations → CTO/CFO buy-in required
- **Identify Pain:** Data silos, outdated CRM, frustrated sales team
- **Champion:** VP Operations (strong pain, approved budget)

**Pain Points Identified:**
1. Data silos (spreadsheets + outdated CRM)
2. Slow response times causing lost deals
3. 30% increase in sales cycle duration
4. Sales team frustration

**Budget & Timeline:**
- Budget: ~$150K annually (APPROVED)
- Timeline: Q1 next year (3-4 months)
- Status: Budget approved = HIGH INTENT

**Competitive Position:**
- No current solution mentioned
- Greenfield opportunity

**Value Proposition Presented:**
- 40% sales cycle reduction (proven results)
- Addresses primary pain point

**Next Steps:**
1. Product demonstration
2. Include CTO/CFO in next meeting
3. Provide case studies of similar companies

**Deal Health:** 🟢 GREEN
- Budget approved
- Clear pain + timeline
- Economic buyer engaged
- Strong qualification score

**Recommended Action:** Fast-track to demo, prepare executive-level materials for CTO/CFO`,
        },
      ],
    },
    {
      messages: [
        {
          role: 'system',
          content: 'You are a specialized AI assistant for sales meetings with focus on deal progression.',
        },
        {
          role: 'user',
          content: `Analyze this objection handling scenario:

Prospect: Your pricing is 30% higher than your competitor's quote.
Sales Rep Martinez: I understand price is a concern. Let me ask - what specific features are included in their quote?
Prospect: Basic CRM functionality, email integration, and reporting.
Sales Rep: Our solution includes those plus AI-powered lead scoring, predictive analytics, and dedicated success management. Based on your goal of reducing sales cycle time, our AI lead scoring alone has helped clients prioritize high-value opportunities, resulting in 25% higher conversion rates. What's more valuable - saving 30% upfront or increasing revenue by 25%?
Prospect: That's a good point. Can you show me the ROI calculation?
Sales Rep: Absolutely. Let's schedule a business case review with your CFO next week. I'll prepare a detailed ROI analysis based on your current metrics.`,
        },
        {
          role: 'assistant',
          content: `**Objection Type:** Price Objection (30% higher than competitor)

**Sales Technique Used:** Value-based Selling

**Objection Handling Framework:**
1. Acknowledge concern
2. Ask clarifying questions (competitor features)
3. Differentiate on value (not price)
4. Quantify ROI impact

**Competitive Differentiation:**

**Competitor Offering:**
- Basic CRM functionality
- Email integration
- Reporting

**Our Offering (Value-Add):**
- Everything competitor has PLUS:
  - AI-powered lead scoring
  - Predictive analytics
  - Dedicated success management

**Value Proposition:**
- AI lead scoring → 25% higher conversion rates
- Revenue increase > 30% cost savings

**Reframe Strategy:**
"What's more valuable - saving 30% upfront or increasing revenue by 25%?"

**Prospect Response:** ✅ POSITIVE
- Acknowledged value argument
- Requested ROI calculation

**Next Steps:**
1. Business case review with CFO (scheduled next week)
2. Prepare detailed ROI analysis using prospect's current metrics
3. Include CFO in decision process (expanding buying committee)

**Deal Status:** Moving Forward
- Objection converted to value discussion
- Buying committee expanding (positive signal)
- Shifted from price to ROI focus

**Recommended Actions:**
1. Prepare comprehensive ROI calculator
2. Include case study with similar company profile
3. Schedule CFO meeting within 7 days (maintain momentum)
4. Prepare competitive battle card

**Win Probability:** Increased from 40% → 65%`,
        },
      ],
    },
  ],

  evaluationCriteria: {
    accuracy: 'Sales terminology accuracy > 90%, qualification criteria identification > 95%',
    compliance: 'Proper identification of buying signals and qualification status',
    specificity: 'Correct extraction of BANT/MEDDIC criteria, next steps, and deal health',
  },

  complianceRequirements: [
    'Accurate deal qualification scoring',
    'Clear identification of decision makers',
    'Budget and timeline tracking',
    'Competitor intelligence gathering',
  ],

  customVocabulary: {
    BANT: 'Budget, Authority, Need, Timeline',
    MEDDIC: 'Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion',
    'SPIN Selling': 'Situation, Problem, Implication, Need-payoff',
    'Champion': 'Internal advocate who supports your solution',
    'Economic Buyer': 'Person with budget authority',
  },

  hyperparameters: {
    n_epochs: 3,
    learning_rate_multiplier: 1.0,
  },
};

// ====================================
// Template Registry
// ====================================

export class IndustryTemplateService {
  private templates: Map<string, IndustryTemplate> = new Map();

  constructor() {
    // Register all templates
    this.registerTemplate(HEALTHCARE_TEMPLATE);
    this.registerTemplate(LEGAL_TEMPLATE);
    this.registerTemplate(FINANCE_TEMPLATE);
    this.registerTemplate(SALES_TEMPLATE);

    logger.info(`Registered ${this.templates.size} industry templates`);
  }

  /**
   * Register a new template
   */
  registerTemplate(template: IndustryTemplate): void {
    this.templates.set(template.id, template);
    logger.info(`Registered template: ${template.name}`);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): IndustryTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * List all available templates
   */
  listTemplates(): IndustryTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by industry
   */
  getTemplatesByIndustry(industry: string): IndustryTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.industry === industry);
  }

  /**
   * Get templates by model type
   */
  getTemplatesByModelType(modelType: string): IndustryTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.modelType === modelType);
  }
}

export default new IndustryTemplateService();
