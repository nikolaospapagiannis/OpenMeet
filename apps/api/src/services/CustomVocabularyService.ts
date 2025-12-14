/**
 * Custom Vocabulary Service
 *
 * Industry-specific terminology for improved transcription accuracy
 * Competitive Feature: Custom vocabulary for specialized domains
 *
 * Features:
 * - Organization-level custom vocabularies
 * - Industry templates (healthcare, legal, tech, finance)
 * - Term pronunciation guides
 * - Acronym expansion
 * - Real-time vocabulary application
 * - Import/export vocabulary lists
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface VocabularyTerm {
  id: string;
  term: string;
  pronunciation?: string; // IPA or phonetic spelling
  expansion?: string; // For acronyms (e.g., "CRM" -> "Customer Relationship Management")
  category?: string; // e.g., "medical", "legal", "technical"
  frequency: number; // Usage count
  addedBy: string;
  createdAt: Date;
}

export interface CustomVocabulary {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  industry?: string;
  terms: VocabularyTerm[];
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VocabularyTemplate {
  id: string;
  name: string;
  industry: string;
  description: string;
  terms: Array<{
    term: string;
    pronunciation?: string;
    expansion?: string;
    category?: string;
  }>;
}

class CustomVocabularyService {
  // Pre-built industry templates
  private industryTemplates: VocabularyTemplate[] = [
    {
      id: 'healthcare',
      name: 'Healthcare & Medical',
      industry: 'healthcare',
      description: 'Medical terminology, procedures, and medications',
      terms: [
        { term: 'HIPAA', expansion: 'Health Insurance Portability and Accountability Act' },
        { term: 'EMR', expansion: 'Electronic Medical Record' },
        { term: 'EHR', expansion: 'Electronic Health Record' },
        { term: 'CBC', expansion: 'Complete Blood Count' },
        { term: 'MRI', expansion: 'Magnetic Resonance Imaging' },
        { term: 'CT scan', expansion: 'Computed Tomography scan' },
        { term: 'hemoglobin', pronunciation: 'hee-muh-gloh-bin' },
        { term: 'myocardial infarction', category: 'diagnosis' },
        { term: 'hypertension', category: 'diagnosis' },
      ],
    },
    {
      id: 'legal',
      name: 'Legal & Law',
      industry: 'legal',
      description: 'Legal terminology, case law, and procedures',
      terms: [
        { term: 'voir dire', pronunciation: 'vwahr deer' },
        { term: 'habeas corpus', pronunciation: 'hay-bee-us kor-pus' },
        { term: 'pro bono', pronunciation: 'proh boh-noh' },
        { term: 'amicus curiae', pronunciation: 'uh-mee-kus kyoor-ee-eye' },
        { term: 'NDA', expansion: 'Non-Disclosure Agreement' },
        { term: 'LLC', expansion: 'Limited Liability Company' },
        { term: 'plaintiff', category: 'legal-role' },
        { term: 'defendant', category: 'legal-role' },
      ],
    },
    {
      id: 'technology',
      name: 'Technology & Software',
      industry: 'technology',
      description: 'Tech jargon, programming terms, and acronyms',
      terms: [
        { term: 'API', expansion: 'Application Programming Interface' },
        { term: 'CI/CD', expansion: 'Continuous Integration/Continuous Deployment' },
        { term: 'SaaS', expansion: 'Software as a Service' },
        { term: 'Kubernetes', pronunciation: 'koo-ber-net-eez' },
        { term: 'PostgreSQL', pronunciation: 'post-gres-kyoo-el' },
        { term: 'OAuth', pronunciation: 'oh-auth' },
        { term: 'JWT', expansion: 'JSON Web Token' },
        { term: 'GraphQL', category: 'technology' },
        { term: 'WebSocket', category: 'technology' },
      ],
    },
    {
      id: 'finance',
      name: 'Finance & Banking',
      industry: 'finance',
      description: 'Financial terminology and accounting terms',
      terms: [
        { term: 'EBITDA', expansion: 'Earnings Before Interest, Taxes, Depreciation, and Amortization' },
        { term: 'ROI', expansion: 'Return on Investment' },
        { term: 'P&L', expansion: 'Profit and Loss' },
        { term: 'ARR', expansion: 'Annual Recurring Revenue' },
        { term: 'MRR', expansion: 'Monthly Recurring Revenue' },
        { term: 'CAGR', expansion: 'Compound Annual Growth Rate' },
        { term: 'IPO', expansion: 'Initial Public Offering' },
        { term: 'fiduciary', pronunciation: 'fih-doo-shee-air-ee' },
      ],
    },
  ];

  /**
   * Create custom vocabulary
   */
  async createVocabulary(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      industry?: string;
      terms?: Array<{
        term: string;
        pronunciation?: string;
        expansion?: string;
        category?: string;
      }>;
      isDefault?: boolean;
    }
  ): Promise<CustomVocabulary> {
    try {
      // Store vocabulary metadata in organization
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const vocabularyId = `vocab_${Date.now()}`;
      const vocabularyMeta = {
        id: vocabularyId,
        name: data.name,
        description: data.description,
        industry: data.industry,
        isActive: true,
        isDefault: data.isDefault || false,
        createdBy: userId,
        createdAt: new Date(),
      };

      const existingVocabs = ((org?.metadata as any)?.vocabularies || []) as any[];
      existingVocabs.push(vocabularyMeta);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          metadata: {
            ...(org?.metadata as any),
            vocabularies: existingVocabs,
          } as any,
        },
      });

      // Add terms if provided
      const terms: VocabularyTerm[] = [];
      if (data.terms && data.terms.length > 0) {
        for (const termData of data.terms) {
          const term = await prisma.customVocabulary.create({
            data: {
              organization: { connect: { id: organizationId } },
              userId,
              term: termData.term,
              expansion: termData.expansion,
              category: termData.category,
              industry: data.industry,
              isActive: true,
              usageCount: 0,
              metadata: {
                vocabularyId,
                pronunciation: termData.pronunciation,
              } as any,
            },
          });
          terms.push(term as any);
        }
      }

      logger.info('Custom vocabulary created', {
        vocabularyId,
        organizationId,
      });

      return {
        ...vocabularyMeta,
        organizationId,
        terms,
        updatedAt: new Date(),
      } as any;
    } catch (error) {
      logger.error('Error creating custom vocabulary', { error });
      throw error;
    }
  }

  /**
   * Add terms to vocabulary
   */
  async addTerms(
    vocabularyId: string,
    userId: string,
    terms: Array<{
      term: string;
      pronunciation?: string;
      expansion?: string;
      category?: string;
    }>
  ): Promise<VocabularyTerm[]> {
    try {
      // Get vocabulary metadata to find organization
      const orgs = await prisma.organization.findMany();
      let organizationId: string | null = null;
      let industry: string | undefined;

      for (const org of orgs) {
        const vocabs = ((org.metadata as any)?.vocabularies || []) as any[];
        const vocab = vocabs.find((v: any) => v.id === vocabularyId);
        if (vocab) {
          organizationId = org.id;
          industry = vocab.industry;
          break;
        }
      }

      if (!organizationId) {
        throw new Error('Vocabulary not found');
      }

      const createdTerms: VocabularyTerm[] = [];
      for (const termData of terms) {
        const term = await prisma.customVocabulary.create({
          data: {
            organization: { connect: { id: organizationId } },
            userId,
            term: termData.term,
            expansion: termData.expansion,
            category: termData.category,
            industry,
            isActive: true,
            usageCount: 0,
            metadata: {
              vocabularyId,
              pronunciation: termData.pronunciation,
            } as any,
          },
        });

        createdTerms.push({
          id: term.id,
          term: term.term,
          pronunciation: (term.metadata as any)?.pronunciation,
          expansion: term.expansion || undefined,
          category: term.category || undefined,
          frequency: term.usageCount,
          addedBy: userId,
          createdAt: term.createdAt,
        });
      }

      logger.info('Vocabulary terms added', {
        vocabularyId,
        count: createdTerms.length,
      });

      return createdTerms;
    } catch (error) {
      logger.error('Error adding vocabulary terms', { error });
      throw error;
    }
  }

  /**
   * Get vocabulary with terms
   */
  async getVocabulary(vocabularyId: string): Promise<CustomVocabulary> {
    try {
      // Find vocabulary metadata
      const orgs = await prisma.organization.findMany();
      let vocabularyMeta: any = null;
      let organizationId: string | null = null;

      for (const org of orgs) {
        const vocabs = ((org.metadata as any)?.vocabularies || []) as any[];
        const vocab = vocabs.find((v: any) => v.id === vocabularyId);
        if (vocab) {
          vocabularyMeta = vocab;
          organizationId = org.id;
          break;
        }
      }

      if (!vocabularyMeta || !organizationId) {
        throw new Error('Vocabulary not found');
      }

      // Get terms
      const terms = await prisma.customVocabulary.findMany({
        where: {
          organizationId,
          metadata: {
            path: ['vocabularyId'],
            equals: vocabularyId,
          },
        },
        orderBy: { usageCount: 'desc' },
      });

      const mappedTerms: VocabularyTerm[] = terms.map(t => ({
        id: t.id,
        term: t.term,
        pronunciation: (t.metadata as any)?.pronunciation,
        expansion: t.expansion || undefined,
        category: t.category || undefined,
        frequency: t.usageCount,
        addedBy: t.userId || '',
        createdAt: t.createdAt,
      }));

      return {
        ...vocabularyMeta,
        organizationId,
        terms: mappedTerms,
      };
    } catch (error) {
      logger.error('Error getting vocabulary', { error });
      throw error;
    }
  }

  /**
   * Get all vocabularies for organization
   */
  async getOrganizationVocabularies(organizationId: string): Promise<CustomVocabulary[]> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const vocabularies = ((org?.metadata as any)?.vocabularies || []) as any[];

      // Get terms for each vocabulary
      const result: CustomVocabulary[] = [];
      for (const vocab of vocabularies) {
        const terms = await prisma.customVocabulary.findMany({
          where: {
            organizationId,
            metadata: {
              path: ['vocabularyId'],
              equals: vocab.id,
            },
          },
        });

        const mappedTerms: VocabularyTerm[] = terms.map(t => ({
          id: t.id,
          term: t.term,
          pronunciation: (t.metadata as any)?.pronunciation,
          expansion: t.expansion || undefined,
          category: t.category || undefined,
          frequency: t.usageCount,
          addedBy: t.userId || '',
          createdAt: t.createdAt,
        }));

        result.push({
          ...vocab,
          organizationId,
          terms: mappedTerms,
        });
      }

      return result;
    } catch (error) {
      logger.error('Error getting organization vocabularies', { error });
      return [];
    }
  }

  /**
   * Get active vocabulary for organization
   */
  async getActiveVocabulary(organizationId: string): Promise<CustomVocabulary | null> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const vocabularies = ((org?.metadata as any)?.vocabularies || []) as any[];
      const activeVocab = vocabularies.find((v: any) => v.isActive && v.isDefault);

      if (!activeVocab) {
        return null;
      }

      // Get terms
      const terms = await prisma.customVocabulary.findMany({
        where: {
          organizationId,
          metadata: {
            path: ['vocabularyId'],
            equals: activeVocab.id,
          },
        },
      });

      const mappedTerms: VocabularyTerm[] = terms.map(t => ({
        id: t.id,
        term: t.term,
        pronunciation: (t.metadata as any)?.pronunciation,
        expansion: t.expansion || undefined,
        category: t.category || undefined,
        frequency: t.usageCount,
        addedBy: t.userId || '',
        createdAt: t.createdAt,
      }));

      return {
        ...activeVocab,
        organizationId,
        terms: mappedTerms,
      };
    } catch (error) {
      logger.error('Error getting active vocabulary', { error });
      return null;
    }
  }

  /**
   * Update vocabulary term frequency (called during transcription)
   */
  async incrementTermFrequency(termId: string): Promise<void> {
    try {
      await prisma.customVocabulary.update({
        where: { id: termId },
        data: {
          usageCount: { increment: 1 },
        },
      });
    } catch (error) {
      logger.error('Error incrementing term frequency', { error });
    }
  }

  /**
   * Search vocabulary terms
   */
  async searchTerms(
    vocabularyId: string,
    query: string
  ): Promise<VocabularyTerm[]> {
    try {
      // Find organization for this vocabulary
      const orgs = await prisma.organization.findMany();
      let organizationId: string | null = null;

      for (const org of orgs) {
        const vocabs = ((org.metadata as any)?.vocabularies || []) as any[];
        if (vocabs.find((v: any) => v.id === vocabularyId)) {
          organizationId = org.id;
          break;
        }
      }

      if (!organizationId) {
        return [];
      }

      const terms = await prisma.customVocabulary.findMany({
        where: {
          organizationId,
          metadata: {
            path: ['vocabularyId'],
            equals: vocabularyId,
          },
          OR: [
            { term: { contains: query, mode: 'insensitive' } },
            { expansion: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { usageCount: 'desc' },
        take: 20,
      });

      return terms.map(t => ({
        id: t.id,
        term: t.term,
        pronunciation: (t.metadata as any)?.pronunciation,
        expansion: t.expansion || undefined,
        category: t.category || undefined,
        frequency: t.usageCount,
        addedBy: t.userId || '',
        createdAt: t.createdAt,
      }));
    } catch (error) {
      logger.error('Error searching vocabulary terms', { error });
      return [];
    }
  }

  /**
   * Delete vocabulary term
   */
  async deleteTerm(termId: string): Promise<void> {
    try {
      await prisma.customVocabulary.delete({
        where: { id: termId },
      });

      logger.info('Vocabulary term deleted', { termId });
    } catch (error) {
      logger.error('Error deleting vocabulary term', { error });
      throw error;
    }
  }

  /**
   * Delete vocabulary
   */
  async deleteVocabulary(vocabularyId: string): Promise<void> {
    try {
      // Find organization for this vocabulary
      const orgs = await prisma.organization.findMany();
      let organizationId: string | null = null;

      for (const org of orgs) {
        const vocabs = ((org.metadata as any)?.vocabularies || []) as any[];
        if (vocabs.find((v: any) => v.id === vocabularyId)) {
          organizationId = org.id;

          // Remove vocabulary from metadata
          const filteredVocabs = vocabs.filter((v: any) => v.id !== vocabularyId);
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              metadata: {
                ...(org.metadata as any),
                vocabularies: filteredVocabs,
              } as any,
            },
          });
          break;
        }
      }

      if (organizationId) {
        // Delete all terms
        await prisma.customVocabulary.deleteMany({
          where: {
            organizationId,
            metadata: {
              path: ['vocabularyId'],
              equals: vocabularyId,
            },
          },
        });
      }

      logger.info('Custom vocabulary deleted', { vocabularyId });
    } catch (error) {
      logger.error('Error deleting vocabulary', { error });
      throw error;
    }
  }

  /**
   * Get industry templates
   */
  getIndustryTemplates(): VocabularyTemplate[] {
    return this.industryTemplates;
  }

  /**
   * Get specific industry template
   */
  getIndustryTemplate(industryId: string): VocabularyTemplate | null {
    return this.industryTemplates.find(t => t.id === industryId) || null;
  }

  /**
   * Create vocabulary from industry template
   */
  async createFromTemplate(
    organizationId: string,
    userId: string,
    templateId: string
  ): Promise<CustomVocabulary> {
    try {
      const template = this.getIndustryTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      return await this.createVocabulary(organizationId, userId, {
        name: template.name,
        description: template.description,
        industry: template.industry,
        terms: template.terms,
        isDefault: true,
      });
    } catch (error) {
      logger.error('Error creating vocabulary from template', { error });
      throw error;
    }
  }

  /**
   * Export vocabulary as JSON
   */
  async exportVocabulary(vocabularyId: string): Promise<string> {
    try {
      const vocabulary = await this.getVocabulary(vocabularyId);

      const exportData = {
        name: vocabulary.name,
        description: vocabulary.description,
        industry: vocabulary.industry,
        terms: vocabulary.terms.map(t => ({
          term: t.term,
          pronunciation: t.pronunciation,
          expansion: t.expansion,
          category: t.category,
        })),
        exportedAt: new Date().toISOString(),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      logger.error('Error exporting vocabulary', { error });
      throw error;
    }
  }

  /**
   * Import vocabulary from JSON
   */
  async importVocabulary(
    organizationId: string,
    userId: string,
    jsonData: string
  ): Promise<CustomVocabulary> {
    try {
      const data = JSON.parse(jsonData);

      return await this.createVocabulary(organizationId, userId, {
        name: data.name,
        description: data.description,
        industry: data.industry,
        terms: data.terms,
      });
    } catch (error) {
      logger.error('Error importing vocabulary', { error });
      throw error;
    }
  }

  /**
   * Get vocabulary statistics
   */
  async getVocabularyStats(vocabularyId: string): Promise<{
    totalTerms: number;
    categoryBreakdown: Record<string, number>;
    mostUsedTerms: Array<{ term: string; frequency: number }>;
    termsWithPronunciation: number;
    termsWithExpansion: number;
  }> {
    try {
      const vocabulary = await this.getVocabulary(vocabularyId);

      const categoryBreakdown: Record<string, number> = {};
      vocabulary.terms.forEach(t => {
        if (t.category) {
          categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + 1;
        }
      });

      const mostUsedTerms = vocabulary.terms
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10)
        .map(t => ({
          term: t.term,
          frequency: t.frequency,
        }));

      return {
        totalTerms: vocabulary.terms.length,
        categoryBreakdown,
        mostUsedTerms,
        termsWithPronunciation: vocabulary.terms.filter(t => t.pronunciation).length,
        termsWithExpansion: vocabulary.terms.filter(t => t.expansion).length,
      };
    } catch (error) {
      logger.error('Error getting vocabulary stats', { error });
      throw error;
    }
  }

  /**
   * Apply vocabulary to transcription (called during real-time transcription)
   */
  applyVocabulary(text: string, vocabulary: CustomVocabulary): string {
    let enhancedText = text;

    // Replace acronyms with expansions (if configured)
    vocabulary.terms.forEach(term => {
      if (term.expansion) {
        // Case-insensitive replacement
        const regex = new RegExp(`\\b${term.term}\\b`, 'gi');
        enhancedText = enhancedText.replace(regex, `${term.term} (${term.expansion})`);

        // Track usage
        this.incrementTermFrequency(term.id);
      }
    });

    return enhancedText;
  }
}

export const customVocabularyService = new CustomVocabularyService();
