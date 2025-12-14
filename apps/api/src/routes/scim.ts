/**
 * SCIM 2.0 API Routes
 *
 * Full SCIM 2.0 RFC 7644 compliance
 * Endpoints for user and group provisioning from IdPs
 */

import express, { Request, Response, NextFunction } from 'express';
import { scimService } from '../services/scim-service';

const router = express.Router();

/**
 * SCIM Bearer Token Authentication Middleware
 */
const authenticateSCIM = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        scimService.createError(401, 'Missing or invalid authorization header')
      );
    }

    const token = authHeader.substring(7);
    const organizationId = await scimService.validateToken(token);

    if (!organizationId) {
      return res.status(401).json(
        scimService.createError(401, 'Invalid SCIM token')
      );
    }

    // Attach organization ID to request
    (req as any).organizationId = organizationId;
    (req as any).scimToken = token;

    next();
  } catch (error: any) {
    res.status(401).json(
      scimService.createError(401, error.message)
    );
  }
};

// Apply SCIM auth to all routes
router.use(authenticateSCIM);

// ============================================================================
// SERVICE PROVIDER CONFIGURATION
// ============================================================================

/**
 * GET /scim/v2/ServiceProviderConfig
 * Returns the SCIM service provider configuration
 */
router.get('/v2/ServiceProviderConfig', (req: Request, res: Response) => {
  res.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    documentationUri: 'https://docs.yourapp.com/scim',
    patch: {
      supported: true,
    },
    bulk: {
      supported: false,
      maxOperations: 0,
      maxPayloadSize: 0,
    },
    filter: {
      supported: true,
      maxResults: 200,
    },
    changePassword: {
      supported: false,
    },
    sort: {
      supported: false,
    },
    etag: {
      supported: false,
    },
    authenticationSchemes: [
      {
        type: 'oauthbearertoken',
        name: 'OAuth Bearer Token',
        description: 'Authentication scheme using the OAuth Bearer Token Standard',
        specUri: 'https://tools.ietf.org/html/rfc6750',
        documentationUri: 'https://docs.yourapp.com/scim/authentication',
        primary: true,
      },
    ],
  });
});

/**
 * GET /scim/v2/ResourceTypes
 * Returns supported resource types
 */
router.get('/v2/ResourceTypes', (req: Request, res: Response) => {
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 2,
    Resources: [
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'User',
        name: 'User',
        endpoint: '/scim/v2/Users',
        description: 'User Account',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
      },
      {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
        id: 'Group',
        name: 'Group',
        endpoint: '/scim/v2/Groups',
        description: 'Group',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
      },
    ],
  });
});

/**
 * GET /scim/v2/Schemas
 * Returns supported schemas
 */
router.get('/v2/Schemas', (req: Request, res: Response) => {
  res.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 2,
    Resources: [
      {
        id: 'urn:ietf:params:scim:schemas:core:2.0:User',
        name: 'User',
        description: 'User Account',
      },
      {
        id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
        name: 'Group',
        description: 'Group',
      },
    ],
  });
});

// ============================================================================
// USER ENDPOINTS
// ============================================================================

/**
 * GET /scim/v2/Users
 * List all users with pagination and filtering
 */
router.get('/v2/Users', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const startIndex = parseInt(req.query.startIndex as string) || 1;
    const count = parseInt(req.query.count as string) || 100;
    const filter = req.query.filter as string;

    const result = await scimService.getUsers(organizationId, {
      startIndex,
      count,
      filter,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json(
      scimService.createError(500, error.message)
    );
  }
});

/**
 * GET /scim/v2/Users/:id
 * Get a specific user by ID
 */
router.get('/v2/Users/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    const user = await scimService.getUser(organizationId, id);
    res.json(user);
  } catch (error: any) {
    const status = error.message === 'User not found' ? 404 : 500;
    res.status(status).json(
      scimService.createError(status, error.message)
    );
  }
});

/**
 * POST /scim/v2/Users
 * Create a new user
 */
router.post('/v2/Users', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const userData = req.body;

    const user = await scimService.createUser(organizationId, userData);
    res.status(201).json(user);
  } catch (error: any) {
    const status = error.message === 'User already exists' ? 409 : 400;
    res.status(status).json(
      scimService.createError(status, error.message)
    );
  }
});

/**
 * PUT /scim/v2/Users/:id
 * Update a user (full replacement)
 */
router.put('/v2/Users/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;
    const userData = req.body;

    const user = await scimService.updateUser(organizationId, id, userData);
    res.json(user);
  } catch (error: any) {
    const status = error.message === 'User not found' ? 404 : 400;
    res.status(status).json(
      scimService.createError(status, error.message)
    );
  }
});

/**
 * PATCH /scim/v2/Users/:id
 * Partially update a user
 */
router.patch('/v2/Users/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;
    const { Operations } = req.body;

    if (!Operations || !Array.isArray(Operations)) {
      return res.status(400).json(
        scimService.createError(400, 'Operations array is required')
      );
    }

    const user = await scimService.patchUser(organizationId, id, Operations);
    res.json(user);
  } catch (error: any) {
    const status = error.message === 'User not found' ? 404 : 400;
    res.status(status).json(
      scimService.createError(status, error.message)
    );
  }
});

/**
 * DELETE /scim/v2/Users/:id
 * Delete/deactivate a user
 */
router.delete('/v2/Users/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    await scimService.deleteUser(organizationId, id);
    res.status(204).send();
  } catch (error: any) {
    const status = error.message === 'User not found' ? 404 : 500;
    res.status(status).json(
      scimService.createError(status, error.message)
    );
  }
});

// ============================================================================
// GROUP ENDPOINTS
// ============================================================================

/**
 * GET /scim/v2/Groups
 * List all groups with pagination and filtering
 */
router.get('/v2/Groups', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const startIndex = parseInt(req.query.startIndex as string) || 1;
    const count = parseInt(req.query.count as string) || 100;
    const filter = req.query.filter as string;

    const result = await scimService.getGroups(organizationId, {
      startIndex,
      count,
      filter,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json(
      scimService.createError(500, error.message)
    );
  }
});

/**
 * GET /scim/v2/Groups/:id
 * Get a specific group by ID
 */
router.get('/v2/Groups/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    const group = await scimService.getGroup(organizationId, id);
    res.json(group);
  } catch (error: any) {
    const status = error.message === 'Group not found' ? 404 : 500;
    res.status(status).json(
      scimService.createError(status, error.message)
    );
  }
});

/**
 * POST /scim/v2/Groups
 * Create a new group
 */
router.post('/v2/Groups', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const groupData = req.body;

    const group = await scimService.createGroup(organizationId, groupData);
    res.status(201).json(group);
  } catch (error: any) {
    res.status(400).json(
      scimService.createError(400, error.message)
    );
  }
});

/**
 * PUT /scim/v2/Groups/:id
 * Update a group (full replacement)
 */
router.put('/v2/Groups/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;
    const groupData = req.body;

    const group = await scimService.updateGroup(organizationId, id, groupData);
    res.json(group);
  } catch (error: any) {
    const status = error.message === 'Group not found' ? 404 : 400;
    res.status(status).json(
      scimService.createError(status, error.message)
    );
  }
});

/**
 * DELETE /scim/v2/Groups/:id
 * Delete a group
 */
router.delete('/v2/Groups/:id', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    await scimService.deleteGroup(organizationId, id);
    res.status(204).send();
  } catch (error: any) {
    const status = error.message === 'Group not found' ? 404 : 500;
    res.status(status).json(
      scimService.createError(status, error.message)
    );
  }
});

export default router;
