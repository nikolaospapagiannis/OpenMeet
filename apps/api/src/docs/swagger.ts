/**
 * Swagger/OpenAPI Documentation Configuration
 */

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'OpenMeet API',
    version: '1.0.0',
    description: 'Enterprise-grade meeting intelligence platform API',
    contact: {
      name: 'API Support',
      email: 'api@openmeet.com',
      url: 'https://docs.openmeet.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'https://api.openmeet.com',
      description: 'Production server'
    },
    {
      url: 'https://staging-api.openmeet.com',
      description: 'Staging server'
    },
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    }
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Meetings', description: 'Meeting management' },
    { name: 'Recordings', description: 'Audio/video recording operations' },
    { name: 'Transcriptions', description: 'Speech-to-text transcriptions' },
    { name: 'AI', description: 'AI-powered features' },
    { name: 'Analytics', description: 'Analytics and insights' },
    { name: 'Integrations', description: 'Third-party integrations' },
    { name: 'Users', description: 'User management' },
    { name: 'Organizations', description: 'Organization management' }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['user', 'admin', 'owner'] },
          organizationId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Meeting: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          scheduledAt: { type: 'string', format: 'date-time' },
          duration: { type: 'integer' },
          status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
          participants: {
            type: 'array',
            items: { $ref: '#/components/schemas/User' }
          },
          organizationId: { type: 'string', format: 'uuid' },
          createdBy: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Transcription: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          meetingId: { type: 'string', format: 'uuid' },
          language: { type: 'string' },
          text: { type: 'string' },
          segments: {
            type: 'array',
            items: { $ref: '#/components/schemas/TranscriptionSegment' }
          },
          confidence: { type: 'number', format: 'float' },
          duration: { type: 'number', format: 'float' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      TranscriptionSegment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          speaker: { type: 'string' },
          text: { type: 'string' },
          startTime: { type: 'number', format: 'float' },
          endTime: { type: 'number', format: 'float' },
          confidence: { type: 'number', format: 'float' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'object' }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication failed or missing',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      ValidationError: {
        description: 'Invalid request data',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check endpoint',
        description: 'Returns the health status of the API',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    version: { type: 'string', example: '1.0.0' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'firstName', 'lastName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '409': {
            description: 'Email already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' }
        }
      }
    },
    '/api/meetings': {
      get: {
        tags: ['Meetings'],
        summary: 'List all meetings',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 }
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 }
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] }
          }
        ],
        responses: {
          '200': {
            description: 'List of meetings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    meetings: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Meeting' }
                    },
                    total: { type: 'integer' },
                    limit: { type: 'integer' },
                    offset: { type: 'integer' }
                  }
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' }
        }
      },
      post: {
        tags: ['Meetings'],
        summary: 'Create a new meeting',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'scheduledAt'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  scheduledAt: { type: 'string', format: 'date-time' },
                  duration: { type: 'integer' },
                  participants: {
                    type: 'array',
                    items: { type: 'string', format: 'email' }
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Meeting created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Meeting' }
              }
            }
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/UnauthorizedError' }
        }
      }
    },
    '/api/meetings/{id}': {
      get: {
        tags: ['Meetings'],
        summary: 'Get meeting by ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          '200': {
            description: 'Meeting details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Meeting' }
              }
            }
          },
          '401': { $ref: '#/components/responses/UnauthorizedError' },
          '404': { $ref: '#/components/responses/NotFoundError' }
        }
      }
    }
  }
};
