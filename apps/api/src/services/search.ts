/**
 * Search Service
 * Elasticsearch-based full-text search and analytics
 */

import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'search-service' },
  transports: [new winston.transports.Console()],
});

export interface SearchOptions {
  from?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  highlight?: boolean;
  aggregations?: Record<string, any>;
  filters?: Record<string, any>;
}

export interface SearchResult<T> {
  total: number;
  hits: Array<{
    id: string;
    score: number;
    source: T;
    highlights?: Record<string, string[]>;
  }>;
  aggregations?: Record<string, any>;
  took: number;
}

export interface IndexMapping {
  properties: Record<string, any>;
  settings?: Record<string, any>;
}

export enum SearchIndex {
  MEETINGS = 'meetings',
  TRANSCRIPTS = 'transcripts',
  USERS = 'users',
  ORGANIZATIONS = 'organizations',
  ANALYTICS = 'analytics',
  AUDIT_LOGS = 'audit_logs',
}

export class SearchService {
  private client: ElasticsearchClient;

  constructor(client: ElasticsearchClient) {
    this.client = client;
    this.initializeIndices();
  }

  /**
   * Initialize search indices
   */
  private async initializeIndices(): Promise<void> {
    try {
      const indices: Record<SearchIndex, IndexMapping> = {
        [SearchIndex.MEETINGS]: {
          properties: {
            id: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            userId: { type: 'keyword' },
            title: { 
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' },
                suggest: { type: 'completion' }
              }
            },
            description: { type: 'text', analyzer: 'standard' },
            scheduledStartAt: { type: 'date' },
            actualStartAt: { type: 'date' },
            duration: { type: 'integer' },
            status: { type: 'keyword' },
            platform: { type: 'keyword' },
            participantCount: { type: 'integer' },
            tags: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
          settings: {
            number_of_shards: 2,
            number_of_replicas: 1,
            'analysis': {
              'analyzer': {
                'transcript_analyzer': {
                  'type': 'custom',
                  'tokenizer': 'standard',
                  'filter': ['lowercase', 'stop', 'porter_stem']
                }
              }
            }
          }
        },
        [SearchIndex.TRANSCRIPTS]: {
          properties: {
            id: { type: 'keyword' },
            meetingId: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            content: {
              type: 'text',
              analyzer: 'transcript_analyzer',
              term_vector: 'with_positions_offsets',
              store: true
            },
            speaker: { type: 'keyword' },
            timestamp: { type: 'long' },
            confidence: { type: 'float' },
            language: { type: 'keyword' },
            keywords: { type: 'keyword' },
            entities: {
              type: 'nested',
              properties: {
                type: { type: 'keyword' },
                value: { type: 'keyword' },
                confidence: { type: 'float' }
              }
            },
            sentiment: { type: 'float' },
            createdAt: { type: 'date' },
          },
          settings: {
            number_of_shards: 2,
            number_of_replicas: 1,
            'analysis': {
              'analyzer': {
                'transcript_analyzer': {
                  'type': 'custom',
                  'tokenizer': 'standard',
                  'filter': ['lowercase', 'stop', 'porter_stem']
                }
              }
            }
          }
        },
        [SearchIndex.USERS]: {
          properties: {
            id: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            email: { type: 'keyword' },
            firstName: { 
              type: 'text',
              fields: { keyword: { type: 'keyword' } }
            },
            lastName: { 
              type: 'text',
              fields: { keyword: { type: 'keyword' } }
            },
            role: { type: 'keyword' },
            isActive: { type: 'boolean' },
            lastLoginAt: { type: 'date' },
            createdAt: { type: 'date' },
          }
        },
        [SearchIndex.ORGANIZATIONS]: {
          properties: {
            id: { type: 'keyword' },
            name: { 
              type: 'text',
              fields: { 
                keyword: { type: 'keyword' },
                suggest: { type: 'completion' }
              }
            },
            domain: { type: 'keyword' },
            subscriptionTier: { type: 'keyword' },
            subscriptionStatus: { type: 'keyword' },
            userCount: { type: 'integer' },
            meetingCount: { type: 'integer' },
            storageUsed: { type: 'long' },
            createdAt: { type: 'date' },
          }
        },
        [SearchIndex.ANALYTICS]: {
          properties: {
            id: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            meetingId: { type: 'keyword' },
            metricType: { type: 'keyword' },
            metricValue: { type: 'float' },
            dimensions: { type: 'object' },
            timestamp: { type: 'date' },
          }
        },
        [SearchIndex.AUDIT_LOGS]: {
          properties: {
            id: { type: 'keyword' },
            organizationId: { type: 'keyword' },
            userId: { type: 'keyword' },
            action: { type: 'keyword' },
            resourceType: { type: 'keyword' },
            resourceId: { type: 'keyword' },
            ipAddress: { type: 'ip' },
            userAgent: { type: 'text' },
            metadata: { type: 'object' },
            timestamp: { type: 'date' },
          }
        },
      };

      // Create indices if they don't exist
      for (const [indexName, mapping] of Object.entries(indices)) {
        // Fix: Proper type handling for Elasticsearch exists response
        const exists = await this.client.indices.exists({ index: indexName }) as any;

        if (!exists) {
          await this.client.indices.create({
            index: indexName,
            body: {
              mappings: { properties: mapping.properties },
              settings: mapping.settings || {},
            },
          });

          logger.info(`Index created: ${indexName}`);
        }
      }
    } catch (error) {
      logger.error('Failed to initialize indices:', error);
    }
  }

  /**
   * Index a document
   */
  async indexDocument<T>(
    index: SearchIndex,
    id: string,
    document: T
  ): Promise<boolean> {
    try {
      await this.client.index({
        index,
        id,
        body: document,
        refresh: 'wait_for',
      });

      logger.debug(`Document indexed: ${index}/${id}`);
      return true;
    } catch (error) {
      logger.error('Failed to index document:', error);
      return false;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex<T>(
    index: SearchIndex,
    documents: Array<{ id: string; document: T }>
  ): Promise<{ indexed: number; failed: number }> {
    try {
      const operations = documents.flatMap(doc => [
        { index: { _index: index, _id: doc.id } },
        doc.document,
      ]);

      const result = await this.client.bulk({
        body: operations,
        refresh: 'wait_for',
      });

      // Fix: Type assertions for bulk response items
      const indexed = (result.items as any[]).filter(item => item.index?.status === 201).length;
      const failed = (result.items as any[]).filter(item => item.index?.error).length;

      logger.info(`Bulk index completed: ${indexed} indexed, ${failed} failed`);

      return { indexed, failed };
    } catch (error) {
      logger.error('Bulk index failed:', error);
      return { indexed: 0, failed: documents.length };
    }
  }

  /**
   * Search documents
   */
  async search<T>(
    index: SearchIndex,
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult<T>> {
    try {
      const body: any = {
        query: {
          bool: {
            must: [],
            filter: [],
          },
        },
        from: options?.from || 0,
        size: options?.size || 10,
      };

      // Add main query
      if (query) {
        body.query.bool.must.push({
          multi_match: {
            query,
            fields: this.getSearchFields(index),
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      }

      // Add filters
      if (options?.filters) {
        for (const [field, value] of Object.entries(options.filters)) {
          if (Array.isArray(value)) {
            body.query.bool.filter.push({
              terms: { [field]: value },
            });
          } else {
            body.query.bool.filter.push({
              term: { [field]: value },
            });
          }
        }
      }

      // Add sorting
      if (options?.sortBy) {
        body.sort = [{
          [options.sortBy]: { order: options.sortOrder || 'asc' },
        }];
      }

      // Add highlighting
      if (options?.highlight) {
        body.highlight = {
          fields: this.getHighlightFields(index),
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        };
      }

      // Add aggregations
      if (options?.aggregations) {
        body.aggs = options.aggregations;
      }

      const result = await this.client.search({
        index,
        body,
      });

      // Fix: Proper type assertions for Elasticsearch response handling
      return {
        total: typeof result.hits.total === 'number'
          ? result.hits.total
          : (result.hits.total as any)?.value || 0,
        hits: (result.hits.hits as any[]).map(hit => ({
          id: hit._id!,
          score: hit._score || 0,
          source: hit._source as T,
          highlights: hit.highlight,
        })),
        aggregations: result.aggregations as any,
        took: result.took,
      };
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Advanced search with complex queries
   */
  async advancedSearch<T>(
    index: SearchIndex,
    queryBuilder: any
  ): Promise<SearchResult<T>> {
    try {
      const result = await this.client.search({
        index,
        body: queryBuilder,
      });

      // Fix: Proper type assertions for Elasticsearch response handling
      return {
        total: typeof result.hits.total === 'number'
          ? result.hits.total
          : (result.hits.total as any)?.value || 0,
        hits: (result.hits.hits as any[]).map(hit => ({
          id: hit._id!,
          score: hit._score || 0,
          source: hit._source as T,
          highlights: hit.highlight,
        })),
        aggregations: result.aggregations as any,
        took: result.took,
      };
    } catch (error) {
      logger.error('Advanced search failed:', error);
      throw error;
    }
  }

  /**
   * Search transcripts with semantic search
   */
  async searchTranscripts(
    query: string,
    organizationId: string,
    options?: SearchOptions
  ): Promise<SearchResult<any>> {
    const queryBuilder = {
      query: {
        bool: {
          must: [
            {
              match: {
                content: {
                  query,
                  operator: 'and',
                  fuzziness: 'AUTO',
                },
              },
            },
          ],
          filter: [
            { term: { organizationId } },
          ],
        },
      },
      highlight: {
        fields: {
          content: {
            fragment_size: 150,
            number_of_fragments: 3,
            pre_tags: ['<mark>'],
            post_tags: ['</mark>'],
          },
        },
      },
      aggs: {
        speakers: {
          terms: { field: 'speaker', size: 10 },
        },
        sentiment_distribution: {
          histogram: {
            field: 'sentiment',
            interval: 0.2,
          },
        },
        keywords: {
          terms: { field: 'keywords', size: 20 },
        },
      },
      from: options?.from || 0,
      size: options?.size || 10,
    };

    return this.advancedSearch(SearchIndex.TRANSCRIPTS, queryBuilder);
  }

  /**
   * Autocomplete suggestions
   */
  async autocomplete(
    index: SearchIndex,
    field: string,
    prefix: string,
    size: number = 10
  ): Promise<string[]> {
    try {
      const result = await this.client.search({
        index,
        body: {
          suggest: {
            suggestions: {
              prefix,
              completion: {
                field: `${field}.suggest`,
                size,
                fuzzy: {
                  fuzziness: 'AUTO',
                },
              },
            },
          },
        },
      });

      const suggestions = result.suggest?.suggestions?.[0]?.options || [];
      // Fix: Type assertion for SearchPhraseSuggestOption array access
      return (suggestions as any[]).map((option: any) => option.text);
    } catch (error) {
      logger.error('Autocomplete failed:', error);
      return [];
    }
  }

  /**
   * Get document by ID
   */
  async getDocument<T>(
    index: SearchIndex,
    id: string
  ): Promise<T | null> {
    try {
      const result = await this.client.get({
        index,
        id,
      });

      return result._source as T;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      logger.error('Failed to get document:', error);
      throw error;
    }
  }

  /**
   * Update document
   */
  async updateDocument<T>(
    index: SearchIndex,
    id: string,
    updates: Partial<T>
  ): Promise<boolean> {
    try {
      await this.client.update({
        index,
        id,
        body: {
          doc: updates,
        },
        refresh: 'wait_for',
      });

      logger.debug(`Document updated: ${index}/${id}`);
      return true;
    } catch (error) {
      logger.error('Failed to update document:', error);
      return false;
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(
    index: SearchIndex,
    id: string
  ): Promise<boolean> {
    try {
      await this.client.delete({
        index,
        id,
        refresh: 'wait_for',
      });

      logger.debug(`Document deleted: ${index}/${id}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete document:', error);
      return false;
    }
  }

  /**
   * Analyze text
   */
  async analyzeText(
    text: string,
    analyzer: string = 'standard'
  ): Promise<string[]> {
    try {
      const result = await this.client.indices.analyze({
        body: {
          analyzer,
          text,
        },
      });

      // Fix: Type assertion for analyze response
      return (result.tokens as any)?.map((token: any) => token.token) || [];
    } catch (error) {
      logger.error('Text analysis failed:', error);
      return [];
    }
  }

  /**
   * Get analytics aggregations
   */
  async getAnalytics(
    index: SearchIndex,
    aggregations: Record<string, any>,
    filters?: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      const body: any = {
        size: 0,
        aggs: aggregations,
      };

      if (filters) {
        body.query = {
          bool: {
            filter: Object.entries(filters).map(([field, value]) => ({
              term: { [field]: value },
            })),
          },
        };
      }

      const result = await this.client.search({
        index,
        body,
      });

      return (result.aggregations as any) || {};
    } catch (error) {
      logger.error('Analytics query failed:', error);
      throw error;
    }
  }

  /**
   * Get search fields for index
   */
  private getSearchFields(index: SearchIndex): string[] {
    const fieldMap: Record<SearchIndex, string[]> = {
      [SearchIndex.MEETINGS]: ['title^2', 'description'],
      [SearchIndex.TRANSCRIPTS]: ['content'],
      [SearchIndex.USERS]: ['firstName', 'lastName', 'email'],
      [SearchIndex.ORGANIZATIONS]: ['name^2', 'domain'],
      [SearchIndex.ANALYTICS]: ['metricType'],
      [SearchIndex.AUDIT_LOGS]: ['action', 'resourceType'],
    };

    return fieldMap[index] || ['*'];
  }

  /**
   * Get highlight fields for index
   */
  private getHighlightFields(index: SearchIndex): Record<string, any> {
    const fieldMap: Record<SearchIndex, Record<string, any>> = {
      [SearchIndex.MEETINGS]: {
        title: {},
        description: {},
      },
      [SearchIndex.TRANSCRIPTS]: {
        content: {
          fragment_size: 150,
          number_of_fragments: 3,
        },
      },
      [SearchIndex.USERS]: {
        firstName: {},
        lastName: {},
      },
      [SearchIndex.ORGANIZATIONS]: {
        name: {},
      },
      [SearchIndex.ANALYTICS]: {},
      [SearchIndex.AUDIT_LOGS]: {
        action: {},
      },
    };

    return fieldMap[index] || {};
  }

  /**
   * Reindex data
   */
  async reindex(
    sourceIndex: SearchIndex,
    destinationIndex: string
  ): Promise<boolean> {
    try {
      await this.client.reindex({
        body: {
          source: { index: sourceIndex },
          dest: { index: destinationIndex },
        },
        refresh: true,
      });

      logger.info(`Reindex completed: ${sourceIndex} -> ${destinationIndex}`);
      return true;
    } catch (error) {
      logger.error('Reindex failed:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health();
      // Fix: Type assertion for cluster health response
      const status = (health as any).status;
      return status === 'green' || status === 'yellow';
    } catch (error) {
      logger.error('Search service health check failed:', error);
      return false;
    }
  }
}
