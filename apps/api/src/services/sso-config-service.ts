/**
 * SSO Configuration Service
 *
 * Centralized service for managing SSO/SAML configurations
 * Integrates with Okta, Auth0, and custom SAML providers
 */

import { PrismaClient, SSOProvider } from '@prisma/client';
import crypto from 'crypto';
import { scimService } from './scim-service';
import { oktaIntegrationService } from '../integrations/okta-integration';
import { auth0IntegrationService } from '../integrations/auth0-integration';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface SSOConfigurationInput {
  provider: SSOProvider;
  enabled?: boolean;
  enforceSSO?: boolean;

  // SAML Configuration
  samlEntityId?: string;
  samlSSOUrl?: string;
  samlSLOUrl?: string;
  samlCertificate?: string;
  samlSignRequests?: boolean;

  // Okta Configuration
  oktaDomain?: string;
  oktaClientId?: string;
  oktaClientSecret?: string;
  oktaApiToken?: string;

  // Auth0 Configuration
  auth0Domain?: string;
  auth0ClientId?: string;
  auth0ClientSecret?: string;
  auth0Connection?: string;

  // Domain routing
  domains?: string[];

  // JIT Provisioning
  jitProvisioning?: boolean;
  jitRoleMapping?: Record<string, string>;
  jitAttributeMapping?: Record<string, string>;

  // SCIM
  scimEnabled?: boolean;
}

export class SSOConfigService {
  /**
   * Create or update SSO configuration
   */
  async configureSS(
    organizationId: string,
    config: SSOConfigurationInput
  ): Promise<any> {
    // Validate configuration based on provider
    this.validateConfiguration(config);

    // Check if configuration exists
    const existing = await prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    // Generate SCIM token if SCIM is enabled
    let scimToken = existing?.scimToken;
    let scimEndpoint = existing?.scimEndpoint;

    if (config.scimEnabled && !scimToken) {
      scimToken = scimService.generateToken();
      scimEndpoint = `${process.env.API_URL}/scim/v2`;
    }

    const configData: any = {
      provider: config.provider,
      enabled: config.enabled !== false,
      enforceSSO: config.enforceSSO || false,

      samlEntityId: config.samlEntityId,
      samlSSOUrl: config.samlSSOUrl,
      samlSLOUrl: config.samlSLOUrl,
      samlCertificate: config.samlCertificate,
      samlSignRequests: config.samlSignRequests !== false,
      samlSignedAssertions: true,

      oktaDomain: config.oktaDomain,
      oktaClientId: config.oktaClientId,
      oktaClientSecret: config.oktaClientSecret,
      oktaApiToken: config.oktaApiToken,

      auth0Domain: config.auth0Domain,
      auth0ClientId: config.auth0ClientId,
      auth0ClientSecret: config.auth0ClientSecret,
      auth0Connection: config.auth0Connection,

      domains: config.domains || [],

      jitProvisioning: config.jitProvisioning !== false,
      jitRoleMapping: config.jitRoleMapping || {},
      jitAttributeMapping: config.jitAttributeMapping || this.getDefaultAttributeMapping(config.provider),

      scimEnabled: config.scimEnabled || false,
      scimEndpoint,
      scimToken,
    };

    let ssoConfig;

    if (existing) {
      ssoConfig = await prisma.sSOConfig.update({
        where: { organizationId },
        data: configData,
      });
    } else {
      ssoConfig = await prisma.sSOConfig.create({
        data: {
          ...configData,
          organizationId,
        },
      });
    }

    // Test connection if applicable
    if (config.provider === 'okta' && config.oktaDomain && config.oktaApiToken) {
      try {
        await oktaIntegrationService.testConnection({
          domain: config.oktaDomain,
          clientId: config.oktaClientId || '',
          clientSecret: config.oktaClientSecret || '',
          apiToken: config.oktaApiToken,
        });
      } catch (error) {
        // Log warning but don't fail
        logger.warn('Okta connection test failed', { error: error.message, stack: error.stack });
      }
    }

    if (config.provider === 'auth0' && config.auth0Domain) {
      try {
        await auth0IntegrationService.testConnection({
          domain: config.auth0Domain,
          clientId: config.auth0ClientId || '',
          clientSecret: config.auth0ClientSecret || '',
          connection: config.auth0Connection,
        });
      } catch (error) {
        logger.warn('Auth0 connection test failed', { error: error.message, stack: error.stack });
      }
    }

    return ssoConfig;
  }

  /**
   * Get SSO configuration for organization
   */
  async getConfiguration(organizationId: string): Promise<any> {
    const config = await prisma.sSOConfig.findUnique({
      where: { organizationId },
      include: {
        sessions: {
          where: {
            expiresAt: {
              gte: new Date(),
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        scimUsers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        scimGroups: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!config) {
      return null;
    }

    // Don't expose sensitive data
    const { oktaApiToken, oktaClientSecret, auth0ClientSecret, samlPrivateKey, ...safeConfig } = config;

    return {
      ...safeConfig,
      hasOktaApiToken: !!oktaApiToken,
      hasOktaClientSecret: !!oktaClientSecret,
      hasAuth0ClientSecret: !!auth0ClientSecret,
      hasSamlPrivateKey: !!samlPrivateKey,
    };
  }

  /**
   * Test SSO connection
   */
  async testConnection(organizationId: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const config = await prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return {
        success: false,
        message: 'SSO not configured',
      };
    }

    try {
      if (config.provider === 'okta' && config.oktaDomain && config.oktaApiToken) {
        const result = await oktaIntegrationService.testConnection({
          domain: config.oktaDomain,
          clientId: config.oktaClientId || '',
          clientSecret: config.oktaClientSecret || '',
          apiToken: config.oktaApiToken,
        });

        return {
          success: result.success,
          message: result.message,
          details: { userCount: result.userCount },
        };
      }

      if (config.provider === 'auth0' && config.auth0Domain) {
        const result = await auth0IntegrationService.testConnection({
          domain: config.auth0Domain,
          clientId: config.auth0ClientId || '',
          clientSecret: config.auth0ClientSecret || '',
        });

        return {
          success: result.success,
          message: result.message,
          details: { userCount: result.userCount },
        };
      }

      if (['custom_saml', 'azure_ad', 'google_workspace'].includes(config.provider)) {
        // For SAML providers, check if required fields are present
        if (!config.samlEntityId || !config.samlSSOUrl || !config.samlCertificate) {
          return {
            success: false,
            message: 'Incomplete SAML configuration',
          };
        }

        return {
          success: true,
          message: 'SAML configuration is complete',
          details: {
            entityId: config.samlEntityId,
            ssoUrl: config.samlSSOUrl,
            hasCertificate: !!config.samlCertificate,
          },
        };
      }

      return {
        success: false,
        message: `Provider ${config.provider} not yet supported for testing`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Sync users from IdP
   */
  async syncUsers(organizationId: string): Promise<{
    created: number;
    updated: number;
    deactivated: number;
  }> {
    const config = await prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      throw new Error('SSO not configured');
    }

    if (config.provider === 'okta') {
      return await oktaIntegrationService.syncUsers(organizationId);
    }

    if (config.provider === 'auth0') {
      return await auth0IntegrationService.syncUsers(organizationId);
    }

    throw new Error(`Sync not supported for provider: ${config.provider}`);
  }

  /**
   * Sync groups from IdP
   */
  async syncGroups(organizationId: string): Promise<{
    created: number;
    updated: number;
  }> {
    const config = await prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      throw new Error('SSO not configured');
    }

    if (config.provider === 'okta') {
      return await oktaIntegrationService.syncGroups(organizationId);
    }

    throw new Error(`Group sync not supported for provider: ${config.provider}`);
  }

  /**
   * Get SSO statistics
   */
  async getStatistics(organizationId: string): Promise<{
    activeSessions: number;
    totalUsers: number;
    jitProvisionedUsers: number;
    scimUsers: number;
    scimGroups: number;
    lastSync?: Date;
    recentLogins: any[];
  }> {
    const config = await prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return {
        activeSessions: 0,
        totalUsers: 0,
        jitProvisionedUsers: 0,
        scimUsers: 0,
        scimGroups: 0,
        recentLogins: [],
      };
    }

    const [activeSessions, scimUsers, scimGroups, recentSessions] = await Promise.all([
      prisma.sSOSession.count({
        where: {
          ssoConfigId: config.id,
          expiresAt: { gte: new Date() },
          loggedOutAt: null,
        },
      }),
      prisma.sCIMUser.count({
        where: { ssoConfigId: config.id },
      }),
      prisma.sCIMGroup.count({
        where: { ssoConfigId: config.id },
      }),
      prisma.sSOSession.findMany({
        where: { ssoConfigId: config.id },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const jitUsers = await prisma.user.count({
      where: {
        organizationId,
        metadata: {
          path: ['jitProvisioned'],
          equals: true,
        },
      },
    });

    const totalUsers = await prisma.user.count({
      where: { organizationId },
    });

    const lastScimSync = await prisma.sCIMUser.findFirst({
      where: { ssoConfigId: config.id },
      orderBy: { lastSyncedAt: 'desc' },
      select: { lastSyncedAt: true },
    });

    return {
      activeSessions,
      totalUsers,
      jitProvisionedUsers: jitUsers,
      scimUsers,
      scimGroups,
      lastSync: lastScimSync?.lastSyncedAt,
      recentLogins: recentSessions.map(s => ({
        userId: s.userId,
        userEmail: s.user.email,
        userName: `${s.user.firstName} ${s.user.lastName}`,
        loginTime: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    };
  }

  /**
   * Disable SSO
   */
  async disableSSO(organizationId: string): Promise<void> {
    await prisma.sSOConfig.update({
      where: { organizationId },
      data: { enabled: false },
    });

    // End all active sessions
    const config = await prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (config) {
      await prisma.sSOSession.updateMany({
        where: {
          ssoConfigId: config.id,
          loggedOutAt: null,
        },
        data: {
          loggedOutAt: new Date(),
          logoutType: 'admin',
        },
      });
    }
  }

  /**
   * Generate SAML metadata XML
   */
  async generateSAMLMetadata(organizationId: string): Promise<string> {
    const config = await prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      throw new Error('SSO not configured');
    }

    const entityId = `${process.env.API_URL}/saml/metadata/${organizationId}`;
    const acsUrl = `${process.env.API_URL}/api/sso/saml/acs/${organizationId}`;
    const sloUrl = `${process.env.API_URL}/api/sso/saml/sls/${organizationId}`;

    return `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                     entityID="${entityId}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${acsUrl}"
                                 index="0"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                           Location="${sloUrl}"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
  }

  /**
   * Validate SSO configuration
   */
  private validateConfiguration(config: SSOConfigurationInput): void {
    if (config.provider === 'okta') {
      if (!config.oktaDomain) {
        throw new Error('Okta domain is required');
      }
      if (!config.oktaApiToken) {
        throw new Error('Okta API token is required');
      }
    }

    if (config.provider === 'auth0') {
      if (!config.auth0Domain) {
        throw new Error('Auth0 domain is required');
      }
      if (!config.auth0ClientId || !config.auth0ClientSecret) {
        throw new Error('Auth0 client ID and secret are required');
      }
    }

    if (['custom_saml', 'azure_ad', 'google_workspace'].includes(config.provider)) {
      if (!config.samlEntityId || !config.samlSSOUrl || !config.samlCertificate) {
        throw new Error('SAML entity ID, SSO URL, and certificate are required');
      }
    }
  }

  /**
   * Get default attribute mapping for provider
   */
  private getDefaultAttributeMapping(provider: SSOProvider): Record<string, string> {
    const mappings: Record<SSOProvider, Record<string, string>> = {
      okta: {
        email: 'email',
        firstName: 'firstName',
        lastName: 'lastName',
        displayName: 'displayName',
      },
      auth0: {
        email: 'email',
        firstName: 'given_name',
        lastName: 'family_name',
        displayName: 'name',
      },
      azure_ad: {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        displayName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
      },
      google_workspace: {
        email: 'email',
        firstName: 'first_name',
        lastName: 'last_name',
        displayName: 'name',
      },
      onelogin: {
        email: 'User.email',
        firstName: 'User.FirstName',
        lastName: 'User.LastName',
        displayName: 'User.email',
      },
      ping_identity: {
        email: 'email',
        firstName: 'given_name',
        lastName: 'family_name',
        displayName: 'name',
      },
      custom_saml: {
        email: 'email',
        firstName: 'firstName',
        lastName: 'lastName',
        displayName: 'displayName',
      },
    };

    return mappings[provider] || {};
  }

  /**
   * Rotate SCIM token
   */
  async rotateSCIMToken(organizationId: string): Promise<string> {
    const newToken = scimService.generateToken();

    await prisma.sSOConfig.update({
      where: { organizationId },
      data: { scimToken: newToken },
    });

    return newToken;
  }
}

export const ssoConfigService = new SSOConfigService();
