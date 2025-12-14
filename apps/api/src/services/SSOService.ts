/**
 * SSO/SAML Authentication Service
 *
 * Enterprise single sign-on with SAML 2.0 support
 * Competitive Feature: Enterprise requirement for Fortune 500 buyers
 *
 * Features:
 * - SAML 2.0 authentication
 * - Multiple identity providers (Okta, Azure AD, OneLogin, etc.)
 * - JIT (Just-In-Time) user provisioning
 * - Attribute mapping
 * - Multi-tenant support
 * - Session management
 */

import { PrismaClient } from '@prisma/client';
import * as saml2 from 'saml2-js';
import * as jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface SAMLConfig {
  id: string;
  organizationId: string;
  provider: 'okta' | 'azure_ad' | 'onelogin' | 'google' | 'custom';
  entityId: string;
  ssoUrl: string; // Identity Provider SSO URL
  sloUrl?: string; // Single Logout URL
  certificate: string; // X.509 certificate from IdP
  attributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    groups?: string;
  };
  isActive: boolean;
  enforceSSO: boolean; // Require SSO for all organization users
  jitProvisioning: boolean; // Auto-create users on first login
  createdAt: Date;
  updatedAt: Date;
}

export interface SAMLAssertion {
  nameId: string;
  sessionIndex: string;
  attributes: Record<string, any>;
}

export interface SSOSession {
  id: string;
  userId: string;
  organizationId: string;
  provider: string;
  nameId: string;
  sessionIndex: string;
  createdAt: Date;
  expiresAt: Date;
}

class SSOService {
  private serviceProviders: Map<string, saml2.ServiceProvider> = new Map();
  private identityProviders: Map<string, saml2.IdentityProvider> = new Map();

  /**
   * Configure SAML for organization
   */
  async configureSAML(
    organizationId: string,
    config: {
      provider: SAMLConfig['provider'];
      entityId: string;
      ssoUrl: string;
      sloUrl?: string;
      certificate: string;
      attributeMapping?: SAMLConfig['attributeMapping'];
      enforceSSO?: boolean;
      jitProvisioning?: boolean;
    }
  ): Promise<SAMLConfig> {
    try {
      const samlConfig: SAMLConfig = {
        id: `saml_${Date.now()}`,
        organizationId,
        provider: config.provider,
        entityId: config.entityId,
        ssoUrl: config.ssoUrl,
        sloUrl: config.sloUrl,
        certificate: config.certificate,
        attributeMapping: config.attributeMapping || {
          email: 'email',
          firstName: 'firstName',
          lastName: 'lastName',
        },
        enforceSSO: config.enforceSSO || false,
        jitProvisioning: config.jitProvisioning !== false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in organization settings
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...(org?.settings as any),
            samlConfig,
          } as any,
        },
      });

      // Initialize SAML provider
      await this.initializeSAMLProvider(organizationId, samlConfig);

      logger.info('SAML configured for organization', {
        organizationId,
        provider: config.provider,
      });

      return samlConfig;
    } catch (error) {
      logger.error('Error configuring SAML', { error, organizationId });
      throw error;
    }
  }

  /**
   * Initialize SAML Service Provider and Identity Provider
   */
  private async initializeSAMLProvider(
    organizationId: string,
    config: SAMLConfig
  ): Promise<void> {
    try {
      // Create Service Provider (our app)
      const sp = new saml2.ServiceProvider({
        entity_id: `${process.env.API_URL}/saml/metadata/${organizationId}`,
        private_key: process.env.SAML_PRIVATE_KEY || '',
        certificate: process.env.SAML_CERTIFICATE || '',
        assert_endpoint: `${process.env.API_URL}/saml/acs/${organizationId}`,
        sign_get_request: true,
        allow_unencrypted_assertion: false,
      });

      // Create Identity Provider
      const idp = new saml2.IdentityProvider({
        sso_login_url: config.ssoUrl,
        sso_logout_url: config.sloUrl || config.ssoUrl,
        certificates: [config.certificate],
      });

      // Store in memory
      this.serviceProviders.set(organizationId, sp);
      this.identityProviders.set(organizationId, idp);

      logger.info('SAML provider initialized', { organizationId });
    } catch (error) {
      logger.error('Error initializing SAML provider', { error });
      throw error;
    }
  }

  /**
   * Get SAML login URL
   */
  async getLoginUrl(
    organizationId: string,
    relayState?: string
  ): Promise<string> {
    try {
      const sp = this.serviceProviders.get(organizationId);
      const idp = this.identityProviders.get(organizationId);

      if (!sp || !idp) {
        // Load from database and initialize
        const config = await this.getSAMLConfig(organizationId);
        if (!config) {
          throw new Error('SAML not configured for organization');
        }
        await this.initializeSAMLProvider(organizationId, config);
        return this.getLoginUrl(organizationId, relayState);
      }

      return new Promise((resolve, reject) => {
        sp.create_login_request_url(idp, { relay_state: relayState }, (err, loginUrl) => {
          if (err) {
            reject(err);
          } else {
            resolve(loginUrl);
          }
        });
      });
    } catch (error) {
      logger.error('Error getting SAML login URL', { error, organizationId });
      throw error;
    }
  }

  /**
   * Process SAML assertion from IdP
   */
  async processAssertion(
    organizationId: string,
    samlResponse: string
  ): Promise<{
    user: any;
    session: SSOSession;
    token: string;
  }> {
    try {
      const sp = this.serviceProviders.get(organizationId);
      const idp = this.identityProviders.get(organizationId);

      if (!sp || !idp) {
        throw new Error('SAML not configured');
      }

      // Verify and parse assertion
      const assertion = await this.verifyAssertion(sp, idp, samlResponse);

      // Get SAML config
      const config = await this.getSAMLConfig(organizationId);
      if (!config) {
        throw new Error('SAML config not found');
      }

      // Extract user attributes
      const attributes = assertion.attributes;
      const email = attributes[config.attributeMapping.email];
      const firstName = attributes[config.attributeMapping.firstName];
      const lastName = attributes[config.attributeMapping.lastName];

      if (!email) {
        throw new Error('Email not found in SAML assertion');
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        if (!config.jitProvisioning) {
          throw new Error('User not found and JIT provisioning is disabled');
        }

        // Create user (JIT provisioning)
        user = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            organization: { connect: { id: organizationId } },
            oauthProvider: 'saml',
            emailVerified: true, // Trust IdP verification
          },
        });

        logger.info('User created via JIT provisioning', { userId: user.id, email });
      } else {
        // Update user info
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName,
            lastName,
            lastLoginAt: new Date(),
          },
        });
      }

      // Create SSO session
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
      const session: SSOSession = {
        id: `sso_${Date.now()}`,
        userId: user.id,
        organizationId,
        provider: config.provider,
        nameId: assertion.nameId,
        sessionIndex: assertion.sessionIndex,
        createdAt: new Date(),
        expiresAt,
      };

      // Store session in user metadata
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
      });

      const existingSessions = ((userRecord?.metadata as any)?.ssoSessions || []) as SSOSession[];
      existingSessions.push(session);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          metadata: {
            ...(userRecord?.metadata as any),
            ssoSessions: existingSessions,
          } as any,
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          organizationId,
          ssoSessionId: session.id,
        },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '8h' }
      );

      logger.info('SAML authentication successful', {
        userId: user.id,
        email: user.email,
        provider: config.provider,
      });

      return {
        user,
        session,
        token,
      };
    } catch (error) {
      logger.error('Error processing SAML assertion', { error, organizationId });
      throw error;
    }
  }

  /**
   * Verify SAML assertion
   */
  private async verifyAssertion(
    sp: saml2.ServiceProvider,
    idp: saml2.IdentityProvider,
    samlResponse: string
  ): Promise<SAMLAssertion> {
    return new Promise((resolve, reject) => {
      const options = { request_body: { SAMLResponse: samlResponse } };

      sp.post_assert(idp, options, (err: any, samlAssertionInfo: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            nameId: samlAssertionInfo.user.name_id,
            sessionIndex: samlAssertionInfo.user.session_index,
            attributes: samlAssertionInfo.user.attributes,
          });
        }
      });
    });
  }

  /**
   * Get SAML logout URL
   */
  async getLogoutUrl(
    organizationId: string,
    nameId: string,
    sessionIndex: string
  ): Promise<string> {
    try {
      const sp = this.serviceProviders.get(organizationId);
      const idp = this.identityProviders.get(organizationId);

      if (!sp || !idp) {
        throw new Error('SAML not configured');
      }

      return new Promise((resolve, reject) => {
        sp.create_logout_request_url(
          idp,
          { name_id: nameId, session_index: sessionIndex },
          (err, logoutUrl) => {
            if (err) {
              reject(err);
            } else {
              resolve(logoutUrl);
            }
          }
        );
      });
    } catch (error) {
      logger.error('Error getting SAML logout URL', { error });
      throw error;
    }
  }

  /**
   * Process SAML logout response
   */
  async processLogoutResponse(
    organizationId: string,
    samlResponse: string
  ): Promise<void> {
    try {
      // Invalidate SSO sessions
      // This is a simplified version - full implementation would verify response
      logger.info('SAML logout processed', { organizationId });
    } catch (error) {
      logger.error('Error processing SAML logout', { error });
      throw error;
    }
  }

  /**
   * Get SAML metadata XML
   */
  async getMetadata(organizationId: string): Promise<string> {
    try {
      const sp = this.serviceProviders.get(organizationId);

      if (!sp) {
        const config = await this.getSAMLConfig(organizationId);
        if (!config) {
          throw new Error('SAML not configured');
        }
        await this.initializeSAMLProvider(organizationId, config);
        return this.getMetadata(organizationId);
      }

      return sp.create_metadata();
    } catch (error) {
      logger.error('Error getting SAML metadata', { error });
      throw error;
    }
  }

  /**
   * Get SAML configuration for organization
   */
  async getSAMLConfig(organizationId: string): Promise<SAMLConfig | null> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const config = (org?.settings as any)?.samlConfig as SAMLConfig | undefined;
      return config || null;
    } catch (error) {
      logger.error('Error getting SAML config', { error });
      return null;
    }
  }

  /**
   * Check if SSO is enforced for organization
   */
  async isSSOEnforced(organizationId: string): Promise<boolean> {
    try {
      const config = await this.getSAMLConfig(organizationId);
      return config?.enforceSSO || false;
    } catch (error) {
      logger.error('Error checking SSO enforcement', { error });
      return false;
    }
  }

  /**
   * Validate SSO session
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      // Find user with this session
      const users = await prisma.user.findMany({
        where: {
          metadata: {
            path: ['ssoSessions'],
            array_contains: [{ id: sessionId }],
          },
        },
      });

      if (!users.length) {
        return false;
      }

      const user = users[0];
      const sessions = ((user.metadata as any)?.ssoSessions || []) as SSOSession[];
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        return false;
      }

      // Check if expired
      if (new Date(session.expiresAt) < new Date()) {
        // Remove expired session
        const filteredSessions = sessions.filter(s => s.id !== sessionId);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            metadata: {
              ...(user.metadata as any),
              ssoSessions: filteredSessions,
            } as any,
          },
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error validating SSO session', { error });
      return false;
    }
  }

  /**
   * End SSO session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      // Find user with this session
      const users = await prisma.user.findMany({
        where: {
          metadata: {
            path: ['ssoSessions'],
            array_contains: [{ id: sessionId }],
          },
        },
      });

      if (users.length > 0) {
        const user = users[0];
        const sessions = ((user.metadata as any)?.ssoSessions || []) as SSOSession[];
        const filteredSessions = sessions.filter(s => s.id !== sessionId);

        await prisma.user.update({
          where: { id: user.id },
          data: {
            metadata: {
              ...(user.metadata as any),
              ssoSessions: filteredSessions,
            } as any,
          },
        });
      }

      logger.info('SSO session ended', { sessionId });
    } catch (error) {
      logger.error('Error ending SSO session', { error });
    }
  }

  /**
   * Get active SSO sessions for user
   */
  async getUserSessions(userId: string): Promise<SSOSession[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return [];
      }

      const sessions = ((user.metadata as any)?.ssoSessions || []) as SSOSession[];
      const now = new Date();

      // Filter active sessions
      return sessions
        .filter(s => new Date(s.expiresAt) >= now)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      logger.error('Error getting user sessions', { error });
      return [];
    }
  }

  /**
   * Get SSO statistics for organization
   */
  async getSSOStats(organizationId: string): Promise<{
    totalLogins: number;
    activeUsers: number;
    activeSessions: number;
    avgSessionDuration: number;
  }> {
    try {
      // Get all users in organization
      const users = await prisma.user.findMany({
        where: { organizationId },
      });

      const now = new Date();
      let totalLogins = 0;
      let activeSessions = 0;
      const activeUserIds = new Set<string>();
      const completedSessions: SSOSession[] = [];

      users.forEach(user => {
        const sessions = ((user.metadata as any)?.ssoSessions || []) as SSOSession[];
        totalLogins += sessions.length;

        sessions.forEach(session => {
          const expiresAt = new Date(session.expiresAt);
          if (expiresAt > now) {
            activeSessions++;
            activeUserIds.add(user.id);
          } else {
            completedSessions.push(session);
          }
        });
      });

      const totalDuration = completedSessions.reduce((sum, s) => {
        return sum + (new Date(s.expiresAt).getTime() - new Date(s.createdAt).getTime());
      }, 0);

      return {
        totalLogins,
        activeUsers: activeUserIds.size,
        activeSessions,
        avgSessionDuration: completedSessions.length
          ? Math.floor(totalDuration / completedSessions.length / 1000)
          : 0,
      };
    } catch (error) {
      logger.error('Error getting SSO stats', { error });
      return {
        totalLogins: 0,
        activeUsers: 0,
        activeSessions: 0,
        avgSessionDuration: 0,
      };
    }
  }

  /**
   * Disable SAML for organization
   */
  async disableSAML(organizationId: string): Promise<void> {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      const samlConfig = (org?.settings as any)?.samlConfig as SAMLConfig | undefined;
      if (samlConfig) {
        samlConfig.isActive = false;

        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            settings: {
              ...(org?.settings as any),
              samlConfig,
            } as any,
          },
        });
      }

      // Clear from memory
      this.serviceProviders.delete(organizationId);
      this.identityProviders.delete(organizationId);

      logger.info('SAML disabled for organization', { organizationId });
    } catch (error) {
      logger.error('Error disabling SAML', { error });
      throw error;
    }
  }
}

export const ssoService = new SSOService();
