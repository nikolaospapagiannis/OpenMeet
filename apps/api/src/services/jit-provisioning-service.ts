/**
 * Just-In-Time (JIT) Provisioning Service
 *
 * Automatically creates and updates users when they log in via SSO
 * Supports attribute mapping from SAML assertions to user fields
 */

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface JITProvisioningOptions {
  organizationId: string;
  ssoProvider: 'okta' | 'azure_ad' | 'auth0' | 'google_workspace' | 'custom_saml';
  externalId: string;
  attributes: Record<string, any>;
  attributeMapping?: Record<string, string>;
  roleMapping?: Record<string, UserRole>;
  defaultRole?: UserRole;
  autoCreateOrganization?: boolean;
}

export interface JITResult {
  user: any;
  isNew: boolean;
  organization: any;
}

export class JITProvisioningService {
  /**
   * Provision user from SSO login
   */
  async provisionUser(options: JITProvisioningOptions): Promise<JITResult> {
    const {
      organizationId,
      ssoProvider,
      externalId,
      attributes,
      attributeMapping,
      roleMapping,
      defaultRole,
    } = options;

    // Get SSO configuration
    const ssoConfig = await prisma.sSOConfig.findUnique({
      where: { organizationId },
      include: { organization: true },
    });

    if (!ssoConfig) {
      throw new Error('SSO configuration not found');
    }

    if (!ssoConfig.jitProvisioning) {
      throw new Error('JIT provisioning is disabled for this organization');
    }

    // Map SAML attributes to user fields
    const mappedAttributes = this.mapAttributes(
      attributes,
      attributeMapping || (ssoConfig.jitAttributeMapping as any) || {}
    );

    // Extract required fields
    const email = mappedAttributes.email || attributes.email || attributes.emailAddress;
    const firstName = mappedAttributes.firstName || attributes.firstName || attributes.givenName;
    const lastName = mappedAttributes.lastName || attributes.lastName || attributes.familyName;

    if (!email) {
      throw new Error('Email attribute is required for JIT provisioning');
    }

    // Check if user already exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { oauthProviderId: externalId },
        ],
      },
    });

    let isNew = false;

    if (!user) {
      // Create new user
      const role = this.mapRole(
        attributes,
        roleMapping || (ssoConfig.jitRoleMapping as any) || {},
        defaultRole || UserRole.user
      );

      user = await prisma.user.create({
        data: {
          email,
          emailVerified: true,
          firstName,
          lastName,
          organizationId,
          role,
          oauthProvider: ssoProvider,
          oauthProviderId: externalId,
          isActive: true,
          metadata: {
            jitProvisioned: true,
            jitProvisionedAt: new Date().toISOString(),
            ssoProvider,
            originalAttributes: attributes,
          },
        },
      });

      // Create SCIM user record if SCIM is enabled
      if (ssoConfig.scimEnabled) {
        await prisma.sCIMUser.create({
          data: {
            ssoConfigId: ssoConfig.id,
            userId: user.id,
            externalId,
            userName: email,
            active: true,
            givenName: firstName,
            familyName: lastName,
            displayName: `${firstName} ${lastName}`,
            emails: [
              {
                value: email,
                type: 'work',
                primary: true,
              },
            ],
            rawData: attributes,
          },
        });
      }

      isNew = true;

      // Log audit event
      await prisma.sSOAuditLog.create({
        data: {
          ssoConfigId: ssoConfig.id,
          eventType: 'jit_user_created',
          resourceType: 'User',
          resourceId: user.id,
          userId: user.id,
          email,
          success: true,
          requestData: attributes,
        },
      });
    } else {
      // Update existing user with latest attributes
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName,
          lastName,
          lastLoginAt: new Date(),
          metadata: {
            ...(user.metadata as any),
            lastSSOLogin: new Date().toISOString(),
            ssoProvider,
          },
        },
      });

      // Update SCIM user if exists
      if (ssoConfig.scimEnabled) {
        const scimUser = await prisma.sCIMUser.findFirst({
          where: {
            ssoConfigId: ssoConfig.id,
            userId: user.id,
          },
        });

        if (scimUser) {
          await prisma.sCIMUser.update({
            where: { id: scimUser.id },
            data: {
              givenName: firstName,
              familyName: lastName,
              displayName: `${firstName} ${lastName}`,
              lastSyncedAt: new Date(),
              rawData: attributes,
            },
          });
        }
      }

      // Log audit event
      await prisma.sSOAuditLog.create({
        data: {
          ssoConfigId: ssoConfig.id,
          eventType: 'jit_user_updated',
          resourceType: 'User',
          resourceId: user.id,
          userId: user.id,
          email,
          success: true,
          requestData: attributes,
        },
      });
    }

    return {
      user,
      isNew,
      organization: ssoConfig.organization,
    };
  }

  /**
   * Map SAML attributes to our user fields
   */
  private mapAttributes(
    samlAttributes: Record<string, any>,
    attributeMapping: Record<string, string>
  ): Record<string, any> {
    const mapped: Record<string, any> = {};

    // Apply custom attribute mapping
    for (const [ourField, samlField] of Object.entries(attributeMapping)) {
      if (samlAttributes[samlField]) {
        mapped[ourField] = Array.isArray(samlAttributes[samlField])
          ? samlAttributes[samlField][0]
          : samlAttributes[samlField];
      }
    }

    // Default mappings if not specified
    const defaults: Record<string, string[]> = {
      email: ['email', 'emailAddress', 'mail', 'Email'],
      firstName: ['firstName', 'givenName', 'given_name', 'FirstName'],
      lastName: ['lastName', 'familyName', 'surname', 'family_name', 'LastName'],
      displayName: ['displayName', 'display_name', 'cn', 'commonName'],
      phone: ['phoneNumber', 'phone', 'mobile', 'mobilePhone'],
      department: ['department', 'Department'],
      title: ['title', 'jobTitle', 'Title'],
    };

    for (const [field, possibleKeys] of Object.entries(defaults)) {
      if (!mapped[field]) {
        for (const key of possibleKeys) {
          if (samlAttributes[key]) {
            mapped[field] = Array.isArray(samlAttributes[key])
              ? samlAttributes[key][0]
              : samlAttributes[key];
            break;
          }
        }
      }
    }

    return mapped;
  }

  /**
   * Map IdP roles/groups to our user roles
   */
  private mapRole(
    attributes: Record<string, any>,
    roleMapping: Record<string, UserRole>,
    defaultRole: UserRole
  ): UserRole {
    // Check for groups/roles in attributes
    const groups = attributes.groups || attributes.memberOf || attributes.roles || [];
    const groupList = Array.isArray(groups) ? groups : [groups];

    // Try to find a matching role
    for (const group of groupList) {
      const groupName = typeof group === 'string' ? group : group.value || group.display;

      if (groupName && roleMapping[groupName]) {
        return roleMapping[groupName];
      }
    }

    // Return default role
    return defaultRole;
  }

  /**
   * Provision user from Okta
   */
  async provisionFromOkta(
    organizationId: string,
    oktaUser: any
  ): Promise<JITResult> {
    return this.provisionUser({
      organizationId,
      ssoProvider: 'okta',
      externalId: oktaUser.id,
      attributes: {
        email: oktaUser.profile.email,
        firstName: oktaUser.profile.firstName,
        lastName: oktaUser.profile.lastName,
        displayName: `${oktaUser.profile.firstName} ${oktaUser.profile.lastName}`,
        phone: oktaUser.profile.mobilePhone,
        login: oktaUser.profile.login,
        status: oktaUser.status,
      },
    });
  }

  /**
   * Provision user from Auth0
   */
  async provisionFromAuth0(
    organizationId: string,
    auth0User: any
  ): Promise<JITResult> {
    const nameParts = (auth0User.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return this.provisionUser({
      organizationId,
      ssoProvider: 'auth0',
      externalId: auth0User.user_id || auth0User.sub,
      attributes: {
        email: auth0User.email,
        firstName,
        lastName,
        displayName: auth0User.name,
        picture: auth0User.picture,
        emailVerified: auth0User.email_verified,
      },
    });
  }

  /**
   * Provision user from SAML assertion
   */
  async provisionFromSAML(
    organizationId: string,
    samlAssertion: {
      nameId: string;
      sessionIndex: string;
      attributes: Record<string, any>;
    }
  ): Promise<JITResult> {
    return this.provisionUser({
      organizationId,
      ssoProvider: 'custom_saml',
      externalId: samlAssertion.nameId,
      attributes: samlAssertion.attributes,
    });
  }

  /**
   * Update user attributes from SSO
   */
  async updateUserAttributes(
    userId: string,
    attributes: Record<string, any>,
    attributeMapping?: Record<string, string>
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const mapped = this.mapAttributes(attributes, attributeMapping || {});

    const updates: any = {
      lastLoginAt: new Date(),
    };

    if (mapped.firstName) updates.firstName = mapped.firstName;
    if (mapped.lastName) updates.lastName = mapped.lastName;

    updates.metadata = {
      ...(user.metadata as any),
      lastSSOSync: new Date().toISOString(),
      latestAttributes: attributes,
    };

    await prisma.user.update({
      where: { id: userId },
      data: updates,
    });
  }

  /**
   * Deprovision user (deactivate on SSO logout or removal)
   */
  async deprovisionUser(
    organizationId: string,
    externalId: string
  ): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        organizationId,
        oauthProviderId: externalId,
      },
    });

    if (!user) {
      return; // User doesn't exist, nothing to do
    }

    // Deactivate user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: false,
        metadata: {
          ...(user.metadata as any),
          deprovisionedAt: new Date().toISOString(),
        },
      },
    });

    // Deactivate SCIM user if exists
    const scimUser = await prisma.sCIMUser.findFirst({
      where: {
        userId: user.id,
      },
    });

    if (scimUser) {
      await prisma.sCIMUser.update({
        where: { id: scimUser.id },
        data: { active: false },
      });

      // Log audit event
      const ssoConfig = await prisma.sSOConfig.findUnique({
        where: { organizationId },
      });

      if (ssoConfig) {
        await prisma.sSOAuditLog.create({
          data: {
            ssoConfigId: ssoConfig.id,
            eventType: 'jit_user_deprovisioned',
            resourceType: 'User',
            resourceId: user.id,
            userId: user.id,
            email: user.email,
            success: true,
          },
        });
      }
    }
  }

  /**
   * Get JIT provisioning statistics
   */
  async getJITStats(organizationId: string): Promise<{
    totalJITUsers: number;
    jitUsersLast30Days: number;
    activeJITUsers: number;
    providers: Record<string, number>;
  }> {
    const ssoConfig = await prisma.sSOConfig.findUnique({
      where: { organizationId },
    });

    if (!ssoConfig) {
      return {
        totalJITUsers: 0,
        jitUsersLast30Days: 0,
        activeJITUsers: 0,
        providers: {},
      };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total, recent, active, allUsers] = await Promise.all([
      prisma.user.count({
        where: {
          organizationId,
          metadata: {
            path: ['jitProvisioned'],
            equals: true,
          },
        },
      }),
      prisma.user.count({
        where: {
          organizationId,
          metadata: {
            path: ['jitProvisioned'],
            equals: true,
          },
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      prisma.user.count({
        where: {
          organizationId,
          isActive: true,
          metadata: {
            path: ['jitProvisioned'],
            equals: true,
          },
        },
      }),
      prisma.user.findMany({
        where: {
          organizationId,
          metadata: {
            path: ['jitProvisioned'],
            equals: true,
          },
        },
        select: {
          oauthProvider: true,
        },
      }),
    ]);

    // Count by provider
    const providers: Record<string, number> = {};
    allUsers.forEach(user => {
      const provider = user.oauthProvider || 'unknown';
      providers[provider] = (providers[provider] || 0) + 1;
    });

    return {
      totalJITUsers: total,
      jitUsersLast30Days: recent,
      activeJITUsers: active,
      providers,
    };
  }
}

export const jitProvisioningService = new JITProvisioningService();
