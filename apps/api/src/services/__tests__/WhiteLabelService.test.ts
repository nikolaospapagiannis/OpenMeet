import { WhiteLabelService } from '../WhiteLabelService';
import dns from 'dns';
import tls from 'tls';

// Mock DNS and TLS modules
jest.mock('dns');
jest.mock('tls');
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    whitelabelConfig: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
      delete: jest.fn()
    }
  }))
}));

describe('WhiteLabelService', () => {
  let service: WhiteLabelService;

  beforeEach(() => {
    service = new WhiteLabelService();
    jest.clearAllMocks();
  });

  describe('DNS Verification', () => {
    it('should verify CNAME records correctly', async () => {
      const mockResolveCname = jest.fn().mockResolvedValue(['app.openmeet.com']);
      jest.mocked(dns.resolveCname).mockImplementation((domain, callback) => {
        callback(null, ['app.openmeet.com']);
      });

      const mockPrisma = (service as any).prisma;
      mockPrisma.whitelabelConfig.findUnique.mockResolvedValue({
        customDomain: 'custom.example.com',
        customDomainDNS: [
          { type: 'CNAME', name: 'custom.example.com', value: 'app.openmeet.com' },
          { type: 'TXT', name: '_openmeet-verify.custom.example.com', value: 'verification-token' }
        ]
      });

      // Mock TXT verification
      jest.mocked(dns.resolveTxt).mockImplementation((domain, callback) => {
        callback(null, [['verification-token']]);
      });

      // Mock SSL verification
      const mockSocket = {
        getPeerCertificate: jest.fn().mockReturnValue({
          valid_from: new Date(Date.now() - 86400000).toISOString(),
          valid_to: new Date(Date.now() + 86400000).toISOString(),
          subject: { CN: 'custom.example.com' },
          subjectaltname: 'DNS:custom.example.com'
        }),
        end: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      };
      jest.mocked(tls.connect).mockImplementation((options, callback) => {
        callback();
        return mockSocket as any;
      });

      mockPrisma.whitelabelConfig.update.mockResolvedValue({
        customDomainVerified: true
      });

      const result = await service.verifyCustomDomain('org-123');

      expect(result).toBe(true);
      expect(mockPrisma.whitelabelConfig.update).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        data: { customDomainVerified: true }
      });
    });

    it('should fail verification when CNAME is incorrect', async () => {
      jest.mocked(dns.resolveCname).mockImplementation((domain, callback) => {
        callback(null, ['wrong.domain.com']);
      });

      const mockPrisma = (service as any).prisma;
      mockPrisma.whitelabelConfig.findUnique.mockResolvedValue({
        customDomain: 'custom.example.com',
        customDomainDNS: [
          { type: 'TXT', name: '_openmeet-verify.custom.example.com', value: 'verification-token' }
        ]
      });

      // Mock A record check (fallback)
      jest.mocked(dns.resolve4).mockImplementation((domain, callback) => {
        callback(new Error('ENOTFOUND'), []);
      });

      mockPrisma.whitelabelConfig.update.mockResolvedValue({
        customDomainVerified: false
      });

      const result = await service.verifyCustomDomain('org-123');

      expect(result).toBe(false);
      expect(mockPrisma.whitelabelConfig.update).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        data: { customDomainVerified: false }
      });
    });

    it('should verify TXT records for ownership', async () => {
      const mockPrisma = (service as any).prisma;
      mockPrisma.whitelabelConfig.findUnique.mockResolvedValue({
        customDomain: 'custom.example.com',
        customDomainDNS: [
          { type: 'CNAME', name: 'custom.example.com', value: 'app.openmeet.com' },
          { type: 'TXT', name: '_openmeet-verify.custom.example.com', value: 'test-token-123' }
        ]
      });

      // Mock CNAME verification
      jest.mocked(dns.resolveCname).mockImplementation((domain, callback) => {
        callback(null, ['app.openmeet.com']);
      });

      // Mock TXT verification
      jest.mocked(dns.resolveTxt).mockImplementation((domain, callback) => {
        if (domain === '_openmeet-verify.custom.example.com') {
          callback(null, [['test-token-123']]);
        } else {
          callback(new Error('ENOTFOUND'), []);
        }
      });

      // Mock SSL verification
      const mockSocket = {
        getPeerCertificate: jest.fn().mockReturnValue({
          valid_from: new Date(Date.now() - 86400000).toISOString(),
          valid_to: new Date(Date.now() + 86400000).toISOString(),
          subject: { CN: 'custom.example.com' },
          subjectaltname: 'DNS:custom.example.com'
        }),
        end: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      };
      jest.mocked(tls.connect).mockImplementation((options, callback) => {
        callback();
        return mockSocket as any;
      });

      mockPrisma.whitelabelConfig.update.mockResolvedValue({
        customDomainVerified: true
      });

      const result = await service.verifyCustomDomain('org-123');

      expect(result).toBe(true);
    });

    it('should verify SSL certificate validity', async () => {
      const mockPrisma = (service as any).prisma;
      mockPrisma.whitelabelConfig.findUnique.mockResolvedValue({
        customDomain: 'custom.example.com',
        customDomainDNS: []
      });

      // Mock CNAME and TXT to pass
      jest.mocked(dns.resolveCname).mockImplementation((domain, callback) => {
        callback(null, ['app.openmeet.com']);
      });
      jest.mocked(dns.resolveTxt).mockImplementation((domain, callback) => {
        callback(null, []);
      });

      // Test expired certificate
      const expiredCert = {
        valid_from: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        valid_to: new Date(Date.now() - 86400000).toISOString(), // 1 day ago (expired)
        subject: { CN: 'custom.example.com' },
        subjectaltname: 'DNS:custom.example.com'
      };

      const mockSocket = {
        getPeerCertificate: jest.fn().mockReturnValue(expiredCert),
        end: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      };

      jest.mocked(tls.connect).mockImplementation((options, callback) => {
        callback();
        return mockSocket as any;
      });

      mockPrisma.whitelabelConfig.update.mockResolvedValue({
        customDomainVerified: false
      });

      const result = await service.verifyCustomDomain('org-123');

      expect(result).toBe(false); // Should fail due to expired certificate
    });

    it('should handle wildcard SSL certificates', async () => {
      const mockPrisma = (service as any).prisma;
      mockPrisma.whitelabelConfig.findUnique.mockResolvedValue({
        customDomain: 'app.example.com',
        customDomainDNS: []
      });

      jest.mocked(dns.resolveCname).mockImplementation((domain, callback) => {
        callback(null, ['app.openmeet.com']);
      });
      jest.mocked(dns.resolveTxt).mockImplementation((domain, callback) => {
        callback(null, []);
      });

      // Wildcard certificate
      const wildcardCert = {
        valid_from: new Date(Date.now() - 86400000).toISOString(),
        valid_to: new Date(Date.now() + 86400000).toISOString(),
        subject: { CN: '*.example.com' },
        subjectaltname: 'DNS:*.example.com'
      };

      const mockSocket = {
        getPeerCertificate: jest.fn().mockReturnValue(wildcardCert),
        end: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      };

      jest.mocked(tls.connect).mockImplementation((options, callback) => {
        callback();
        return mockSocket as any;
      });

      mockPrisma.whitelabelConfig.update.mockResolvedValue({
        customDomainVerified: true
      });

      const result = await service.verifyCustomDomain('org-123');

      expect(result).toBe(true); // Should pass with wildcard certificate
    });

    it('should get full DNS verification details', async () => {
      const mockPrisma = (service as any).prisma;
      mockPrisma.whitelabelConfig.findUnique.mockResolvedValue({
        customDomain: 'custom.example.com',
        customDomainDNS: [
          { type: 'CNAME', name: 'custom.example.com', value: 'app.openmeet.com' },
          { type: 'TXT', name: '_openmeet-verify.custom.example.com', value: 'verification-token' }
        ]
      });

      jest.mocked(dns.resolveCname).mockImplementation((domain, callback) => {
        callback(null, ['app.openmeet.com']);
      });

      jest.mocked(dns.resolveTxt).mockImplementation((domain, callback) => {
        callback(null, [['verification-token']]);
      });

      const mockSocket = {
        getPeerCertificate: jest.fn().mockReturnValue({
          valid_from: new Date(Date.now() - 86400000).toISOString(),
          valid_to: new Date(Date.now() + 86400000).toISOString(),
          subject: { CN: 'custom.example.com' },
          subjectaltname: 'DNS:custom.example.com'
        }),
        end: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn()
      };
      jest.mocked(tls.connect).mockImplementation((options, callback) => {
        callback();
        return mockSocket as any;
      });

      const details = await service.getDNSVerificationDetails('org-123');

      expect(details).toEqual({
        cname: { valid: true, records: ['app.openmeet.com'] },
        txt: { valid: true, records: ['verification-token'] },
        ssl: { valid: true, details: { valid: true } },
        overall: true
      });
    });
  });
});