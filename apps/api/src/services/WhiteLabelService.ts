import { PrismaClient, WhitelabelConfig } from '@prisma/client';
import crypto from 'crypto';
import dns from 'dns';
import tls from 'tls';
import { promisify } from 'util';

const prisma = new PrismaClient();

// Promisify DNS methods
const resolveCname = promisify(dns.resolveCname);
const resolveA = promisify(dns.resolve4);
const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  logoSquareUrl?: string;
  faviconUrl?: string;
  customDomain?: string;
  customDomainVerified: boolean;
  emailFromName: string;
  emailFromEmail?: string;
  emailLogoUrl?: string;
  emailFooter?: string;
  customCSS?: string;
  customJS?: string;
  productName: string;
  companyName?: string;
  tagline?: string;
  hideWatermark: boolean;
  customFonts?: Record<string, any>;
}

export interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
}

export class WhiteLabelService {
  /**
   * Get branding configuration for an organization
   */
  async getBrandingConfig(organizationId: string): Promise<BrandingConfig | null> {
    const config = await prisma.whitelabelConfig.findUnique({
      where: { organizationId },
    });

    if (!config) {
      return null;
    }

    return this.mapToConfig(config);
  }

  /**
   * Get branding configuration by custom domain
   */
  async getBrandingByDomain(domain: string): Promise<BrandingConfig | null> {
    const config = await prisma.whitelabelConfig.findFirst({
      where: {
        customDomain: domain,
        customDomainVerified: true,
      },
    });

    if (!config) {
      return null;
    }

    return this.mapToConfig(config);
  }

  /**
   * Create or update branding configuration
   */
  async updateBrandingConfig(
    organizationId: string,
    data: Partial<BrandingConfig>
  ): Promise<BrandingConfig> {
    // Validate colors
    if (data.primaryColor) this.validateColor(data.primaryColor);
    if (data.secondaryColor) this.validateColor(data.secondaryColor);
    if (data.accentColor) this.validateColor(data.accentColor);
    if (data.backgroundColor) this.validateColor(data.backgroundColor);
    if (data.textColor) this.validateColor(data.textColor);

    // Check if config exists
    const existing = await prisma.whitelabelConfig.findUnique({
      where: { organizationId },
    });

    const configData = {
      organizationId,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      backgroundColor: data.backgroundColor,
      textColor: data.textColor,
      logoUrl: data.logoUrl,
      logoDarkUrl: data.logoDarkUrl,
      logoSquareUrl: data.logoSquareUrl,
      faviconUrl: data.faviconUrl,
      emailFromName: data.emailFromName,
      emailFromEmail: data.emailFromEmail,
      emailLogoUrl: data.emailLogoUrl,
      emailFooter: data.emailFooter,
      customCSS: data.customCSS,
      customJS: data.customJS,
      productName: data.productName,
      companyName: data.companyName,
      tagline: data.tagline,
      hideWatermark: data.hideWatermark,
      customFonts: data.customFonts as any,
    };

    // Remove undefined values
    Object.keys(configData).forEach((key) => {
      if (configData[key as keyof typeof configData] === undefined) {
        delete configData[key as keyof typeof configData];
      }
    });

    if (existing) {
      const updated = await prisma.whitelabelConfig.update({
        where: { organizationId },
        data: configData,
      });
      return this.mapToConfig(updated);
    } else {
      const created = await prisma.whitelabelConfig.create({
        data: {
          organizationId,
          ...configData,
        },
      });
      return this.mapToConfig(created);
    }
  }

  /**
   * Configure custom domain
   */
  async configureCustomDomain(
    organizationId: string,
    customDomain: string
  ): Promise<{ config: BrandingConfig; dnsRecords: DNSRecord[] }> {
    // Validate domain format
    if (!this.isValidDomain(customDomain)) {
      throw new Error('Invalid domain format');
    }

    // Check if domain is already in use
    const existingDomain = await prisma.whitelabelConfig.findFirst({
      where: {
        customDomain,
        organizationId: { not: organizationId },
      },
    });

    if (existingDomain) {
      throw new Error('Domain already in use by another organization');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Generate DNS records for verification
    const dnsRecords: DNSRecord[] = [
      {
        type: 'CNAME',
        name: customDomain,
        value: 'app.openmeet.com',
        ttl: 3600,
      },
      {
        type: 'TXT',
        name: `_openmeet-verify.${customDomain}`,
        value: verificationToken,
        ttl: 3600,
      },
    ];

    // Update or create config with DNS records
    const config = await prisma.whitelabelConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        customDomain,
        customDomainVerified: false,
        customDomainDNS: dnsRecords as any,
      },
      update: {
        customDomain,
        customDomainVerified: false,
        customDomainDNS: dnsRecords as any,
      },
    });

    return {
      config: this.mapToConfig(config),
      dnsRecords,
    };
  }

  /**
   * Verify custom domain DNS configuration
   */
  async verifyCustomDomain(organizationId: string): Promise<boolean> {
    const config = await prisma.whitelabelConfig.findUnique({
      where: { organizationId },
    });

    if (!config || !config.customDomain) {
      throw new Error('No custom domain configured');
    }

    const dnsRecords = (config.customDomainDNS as any) || [];
    const domain = config.customDomain;

    try {
      // Verify all required DNS records
      const cnameValid = await this.verifyCNAMERecord(domain);
      const txtValid = await this.verifyTXTRecord(domain, dnsRecords);
      const sslValid = await this.verifyCertificate(domain);

      const isVerified = cnameValid && txtValid && sslValid;

      // Update verification status
      await prisma.whitelabelConfig.update({
        where: { organizationId },
        data: {
          customDomainVerified: isVerified,
        },
      });

      return isVerified;
    } catch (error) {
      console.error('DNS verification error:', error);

      // Update verification status to false on error
      await prisma.whitelabelConfig.update({
        where: { organizationId },
        data: {
          customDomainVerified: false,
        },
      });

      return false;
    }
  }

  /**
   * Verify CNAME record for custom domain
   */
  private async verifyCNAMERecord(domain: string): Promise<boolean> {
    try {
      const cnames = await resolveCname(domain);
      // Check if CNAME points to our domain
      const expectedCname = 'app.openmeet.com';
      return cnames.some(cname =>
        cname.toLowerCase() === expectedCname ||
        cname.toLowerCase() === `${expectedCname}.`
      );
    } catch (error: any) {
      // CNAME not found, try A record as fallback
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        return await this.verifyARecord(domain);
      }
      console.error('CNAME verification error:', error);
      return false;
    }
  }

  /**
   * Verify A record for custom domain (fallback if no CNAME)
   */
  private async verifyARecord(domain: string): Promise<boolean> {
    try {
      const addresses = await resolveA(domain);
      // Check if A record points to our IP addresses
      const ourIPs = ['192.0.2.1']; // Replace with actual IPs
      return addresses.some(addr => ourIPs.includes(addr));
    } catch (error) {
      console.error('A record verification error:', error);
      return false;
    }
  }

  /**
   * Verify TXT record for domain ownership
   */
  private async verifyTXTRecord(domain: string, dnsRecords: DNSRecord[]): Promise<boolean> {
    try {
      // Find the expected verification TXT record
      const txtRecord = dnsRecords.find(r => r.type === 'TXT');
      if (!txtRecord) {
        console.error('No TXT record found in DNS configuration');
        return false;
      }

      // Extract verification subdomain and token
      const verificationDomain = txtRecord.name;
      const expectedToken = txtRecord.value;

      const txtRecords = await resolveTxt(verificationDomain);

      // TXT records come as arrays of chunks, flatten them
      const flatTxtRecords = txtRecords.map(record =>
        Array.isArray(record) ? record.join('') : record
      );

      // Check if our verification token exists
      return flatTxtRecords.some(record =>
        record === expectedToken ||
        record.includes(expectedToken)
      );
    } catch (error: any) {
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        console.error('TXT record not found');
        return false;
      }
      console.error('TXT verification error:', error);
      return false;
    }
  }

  /**
   * Verify SSL certificate for custom domain
   */
  private async verifyCertificate(domain: string): Promise<boolean> {
    return new Promise((resolve) => {
      const options = {
        host: domain,
        port: 443,
        rejectUnauthorized: false, // Allow self-signed certs for verification
        timeout: 5000,
      };

      const socket = tls.connect(options, () => {
        try {
          const cert = socket.getPeerCertificate();

          if (!cert || Object.keys(cert).length === 0) {
            socket.end();
            resolve(false);
            return;
          }

          // Check if certificate is valid
          const now = new Date();
          const validFrom = new Date(cert.valid_from);
          const validTo = new Date(cert.valid_to);

          // Certificate should be currently valid
          const isTimeValid = now >= validFrom && now <= validTo;

          // Check if domain matches certificate
          const subjects = [cert.subject?.CN, ...(cert.subjectaltname?.split(', ') || [])]
            .filter(Boolean)
            .map(s => s?.replace('DNS:', '').toLowerCase());

          const domainLower = domain.toLowerCase();
          const isDomainValid = subjects.some(subject => {
            if (!subject) return false;
            // Exact match or wildcard match
            if (subject === domainLower) return true;
            if (subject.startsWith('*.')) {
              const baseDomain = subject.substring(2);
              return domainLower.endsWith(baseDomain) &&
                     domainLower.split('.').length === baseDomain.split('.').length + 1;
            }
            return false;
          });

          socket.end();
          resolve(isTimeValid && isDomainValid);
        } catch (error) {
          console.error('Certificate verification error:', error);
          socket.end();
          resolve(false);
        }
      });

      socket.on('error', (error) => {
        console.error('SSL connection error:', error);
        resolve(false);
      });

      socket.on('timeout', () => {
        console.error('SSL connection timeout');
        socket.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Get full DNS verification details
   */
  async getDNSVerificationDetails(organizationId: string): Promise<{
    cname: { valid: boolean; records: string[] };
    txt: { valid: boolean; records: string[] };
    ssl: { valid: boolean; details: any };
    overall: boolean;
  }> {
    const config = await prisma.whitelabelConfig.findUnique({
      where: { organizationId },
    });

    if (!config || !config.customDomain) {
      throw new Error('No custom domain configured');
    }

    const domain = config.customDomain;
    const dnsRecords = (config.customDomainDNS as any) || [];

    // Check CNAME
    let cnameRecords: string[] = [];
    let cnameValid = false;
    try {
      cnameRecords = await resolveCname(domain);
      cnameValid = await this.verifyCNAMERecord(domain);
    } catch (error) {
      console.error('CNAME check error:', error);
    }

    // Check TXT
    let txtRecords: string[] = [];
    let txtValid = false;
    try {
      const txtRecord = dnsRecords.find((r: DNSRecord) => r.type === 'TXT');
      if (txtRecord) {
        const records = await resolveTxt(txtRecord.name);
        txtRecords = records.map(r => Array.isArray(r) ? r.join('') : r);
        txtValid = await this.verifyTXTRecord(domain, dnsRecords);
      }
    } catch (error) {
      console.error('TXT check error:', error);
    }

    // Check SSL
    let sslDetails: any = {};
    let sslValid = false;
    try {
      sslValid = await this.verifyCertificate(domain);
      // Could add more SSL details here if needed
      sslDetails = { valid: sslValid };
    } catch (error) {
      console.error('SSL check error:', error);
    }

    return {
      cname: { valid: cnameValid, records: cnameRecords },
      txt: { valid: txtValid, records: txtRecords },
      ssl: { valid: sslValid, details: sslDetails },
      overall: cnameValid && txtValid && sslValid,
    };
  }

  /**
   * Upload logo
   */
  async uploadLogo(
    organizationId: string,
    logoType: 'logo' | 'logoDark' | 'logoSquare' | 'favicon',
    fileUrl: string
  ): Promise<BrandingConfig> {
    const updateData: any = {};

    switch (logoType) {
      case 'logo':
        updateData.logoUrl = fileUrl;
        break;
      case 'logoDark':
        updateData.logoDarkUrl = fileUrl;
        break;
      case 'logoSquare':
        updateData.logoSquareUrl = fileUrl;
        break;
      case 'favicon':
        updateData.faviconUrl = fileUrl;
        break;
    }

    const config = await prisma.whitelabelConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        ...updateData,
      },
      update: updateData,
    });

    return this.mapToConfig(config);
  }

  /**
   * Get CSS variables for theming
   */
  getCSSVariables(config: BrandingConfig): Record<string, string> {
    return {
      '--color-primary': config.primaryColor,
      '--color-secondary': config.secondaryColor,
      '--color-accent': config.accentColor,
      '--color-background': config.backgroundColor,
      '--color-text': config.textColor,
    };
  }

  /**
   * Calculate contrast ratio between two colors
   */
  calculateContrast(color1: string, color2: string): number {
    const getLuminance = (hex: string): number => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = ((rgb >> 16) & 0xff) / 255;
      const g = ((rgb >> 8) & 0xff) / 255;
      const b = (rgb & 0xff) / 255;

      const [rs, gs, bs] = [r, g, b].map((c) => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Validate color hex format
   */
  private validateColor(color: string): void {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(color)) {
      throw new Error(`Invalid color format: ${color}`);
    }
  }

  /**
   * Validate domain format
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(domain);
  }

  /**
   * Map database model to config interface
   */
  private mapToConfig(config: WhitelabelConfig): BrandingConfig {
    return {
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      accentColor: config.accentColor,
      backgroundColor: config.backgroundColor,
      textColor: config.textColor,
      logoUrl: config.logoUrl || undefined,
      logoDarkUrl: config.logoDarkUrl || undefined,
      logoSquareUrl: config.logoSquareUrl || undefined,
      faviconUrl: config.faviconUrl || undefined,
      customDomain: config.customDomain || undefined,
      customDomainVerified: config.customDomainVerified,
      emailFromName: config.emailFromName,
      emailFromEmail: config.emailFromEmail || undefined,
      emailLogoUrl: config.emailLogoUrl || undefined,
      emailFooter: config.emailFooter || undefined,
      customCSS: config.customCSS || undefined,
      customJS: config.customJS || undefined,
      productName: config.productName,
      companyName: config.companyName || undefined,
      tagline: config.tagline || undefined,
      hideWatermark: config.hideWatermark,
      customFonts: config.customFonts as any,
    };
  }

  /**
   * Delete branding configuration
   */
  async deleteBrandingConfig(organizationId: string): Promise<void> {
    await prisma.whitelabelConfig.delete({
      where: { organizationId },
    });
  }

  /**
   * Reset to default branding
   */
  async resetToDefaults(organizationId: string): Promise<BrandingConfig> {
    const config = await prisma.whitelabelConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
      },
      update: {
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accentColor: '#8B5CF6',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        logoUrl: null,
        logoDarkUrl: null,
        logoSquareUrl: null,
        faviconUrl: null,
        customCSS: null,
        customJS: null,
        productName: 'OpenMeet',
        emailFromName: 'OpenMeet',
        hideWatermark: false,
      },
    });

    return this.mapToConfig(config);
  }
}

export const whiteLabelService = new WhiteLabelService();
