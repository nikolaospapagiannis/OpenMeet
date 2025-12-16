'use client';

import { useState, useEffect } from 'react';
import {
  Share2,
  Users,
  User,
  Mail,
  Lock,
  Unlock,
  Eye,
  Edit,
  Shield,
  Plus,
  X,
  Search,
  Copy,
  Check,
  ChevronDown,
  Globe,
  UserPlus,
  Settings,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TemplatePermission {
  id: string;
  userId?: string;
  teamId?: string;
  email?: string;
  name: string;
  avatar?: string;
  role: 'viewer' | 'editor' | 'admin';
  type: 'user' | 'team' | 'email';
  addedAt: Date;
  addedBy: string;
  lastAccessed?: Date;
  isActive: boolean;
}

interface SharingSettings {
  isPublic: boolean;
  publicUrl?: string;
  allowDuplication: boolean;
  requireApproval: boolean;
  expiresAt?: Date;
  maxUsers?: number;
}

interface TemplateSharingProps {
  templateId: string;
  templateName: string;
  ownerId: string;
  currentUserId: string;
  onPermissionUpdate?: (permission: TemplatePermission) => void;
  onSettingsUpdate?: (settings: SharingSettings) => void;
  readOnly?: boolean;
}

export default function TemplateSharing({
  templateId,
  templateName,
  ownerId,
  currentUserId,
  onPermissionUpdate,
  onSettingsUpdate,
  readOnly = false
}: TemplateSharingProps) {
  const [permissions, setPermissions] = useState<TemplatePermission[]>([]);
  const [settings, setSettings] = useState<SharingSettings>({
    isPublic: false,
    allowDuplication: true,
    requireApproval: false
  });
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [inviteMessage, setInviteMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'people' | 'teams' | 'settings'>('people');
  const [bulkSelect, setBulkSelect] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Mock data - replace with API call
  useEffect(() => {
    const mockPermissions: TemplatePermission[] = [
      {
        id: '1',
        userId: ownerId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        type: 'user',
        addedAt: new Date('2024-12-01'),
        addedBy: 'System',
        lastAccessed: new Date('2024-12-09T10:00:00'),
        isActive: true
      },
      {
        id: '2',
        userId: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'editor',
        type: 'user',
        addedAt: new Date('2024-12-05'),
        addedBy: 'John Doe',
        lastAccessed: new Date('2024-12-08T15:30:00'),
        isActive: true
      },
      {
        id: '3',
        teamId: 'sales-team',
        name: 'Sales Team',
        role: 'viewer',
        type: 'team',
        addedAt: new Date('2024-12-06'),
        addedBy: 'John Doe',
        lastAccessed: new Date('2024-12-07T09:15:00'),
        isActive: true
      },
      {
        id: '4',
        email: 'bob@external.com',
        name: 'Bob Johnson (External)',
        role: 'viewer',
        type: 'email',
        addedAt: new Date('2024-12-07'),
        addedBy: 'Jane Smith',
        isActive: false
      }
    ];

    setPermissions(mockPermissions);
    setSettings({
      isPublic: false,
      publicUrl: `https://app.example.com/templates/shared/${templateId}`,
      allowDuplication: true,
      requireApproval: false,
      expiresAt: new Date('2025-01-01')
    });
    setLoading(false);
  }, [templateId, ownerId]);

  // Role descriptions
  const roleDescriptions = {
    viewer: 'Can view and use the template',
    editor: 'Can view, use, and edit the template',
    admin: 'Full control including sharing and deleting'
  };

  // Filter permissions
  const filteredPermissions = permissions.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      (selectedTab === 'people' && p.type === 'user') ||
      (selectedTab === 'teams' && p.type === 'team') ||
      selectedTab === 'settings';

    return matchesSearch && matchesTab;
  });

  // Handle invite
  const handleInvite = async () => {
    if (!inviteEmail) return;

    const newPermission: TemplatePermission = {
      id: `temp-${Date.now()}`,
      email: inviteEmail,
      name: inviteEmail,
      role: inviteRole,
      type: 'email',
      addedAt: new Date(),
      addedBy: 'Current User',
      isActive: false
    };

    setPermissions([...permissions, newPermission]);
    onPermissionUpdate?.(newPermission);

    // Reset form
    setInviteEmail('');
    setInviteRole('viewer');
    setInviteMessage('');
    setShowInviteDialog(false);
  };

  // Update permission role
  const updatePermissionRole = (permissionId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    if (readOnly) return;

    const updated = permissions.map(p =>
      p.id === permissionId ? { ...p, role: newRole } : p
    );
    setPermissions(updated);

    const permission = updated.find(p => p.id === permissionId);
    if (permission) {
      onPermissionUpdate?.(permission);
    }
  };

  // Remove permission
  const removePermission = (permissionId: string) => {
    if (readOnly) return;

    setPermissions(permissions.filter(p => p.id !== permissionId));
    setBulkSelect(new Set());
  };

  // Copy share link
  const copyShareLink = () => {
    if (settings.publicUrl) {
      navigator.clipboard.writeText(settings.publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Toggle public access
  const togglePublicAccess = () => {
    if (readOnly) return;

    const newSettings = { ...settings, isPublic: !settings.isPublic };
    setSettings(newSettings);
    onSettingsUpdate?.(newSettings);
  };

  // Bulk actions
  const handleBulkAction = (action: 'remove' | 'changeRole', role?: 'viewer' | 'editor' | 'admin') => {
    if (readOnly) return;

    if (action === 'remove') {
      setPermissions(permissions.filter(p => !bulkSelect.has(p.id)));
      setBulkSelect(new Set());
      setShowBulkActions(false);
    } else if (action === 'changeRole' && role) {
      const updated = permissions.map(p =>
        bulkSelect.has(p.id) ? { ...p, role } : p
      );
      setPermissions(updated);
      setBulkSelect(new Set());
      setShowBulkActions(false);
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500 text-white';
      case 'editor': return 'bg-blue-500 text-white';
      case 'viewer': return 'bg-gray-500 text-white';
      default: return '';
    }
  };

  // Format date
  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return hours === 0 ? 'Just now' : `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <CardGlass>
        <CardGlassContent className="py-8 text-center">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-[var(--ff-bg-layer)] rounded-lg" />
            ))}
          </div>
        </CardGlassContent>
      </CardGlass>
    );
  }

  return (
    <CardGlass>
      <CardGlassHeader>
        <div className="flex items-center justify-between">
          <CardGlassTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share & Collaborate
          </CardGlassTitle>
          {!readOnly && (
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite People
            </Button>
          )}
        </div>
      </CardGlassHeader>
      <CardGlassContent>
        {/* Public Link Section */}
        <div className="mb-6 p-4 bg-[var(--ff-bg-layer)] rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-[var(--ff-text-secondary)]" />
              <div>
                <p className="font-medium">Public Access</p>
                <p className="text-xs text-[var(--ff-text-muted)]">
                  Anyone with the link can {settings.allowDuplication ? 'view and duplicate' : 'view'} this template
                </p>
              </div>
            </div>
            <Switch
              checked={settings.isPublic}
              onCheckedChange={togglePublicAccess}
              disabled={readOnly}
            />
          </div>

          {settings.isPublic && settings.publicUrl && (
            <div className="flex gap-2 mt-3">
              <Input
                value={settings.publicUrl}
                readOnly
                className="bg-[var(--ff-bg-dark)] border-[var(--ff-border)] text-sm"
              />
              <Button
                variant="outline"
                onClick={copyShareLink}
                className="border-[var(--ff-border)]"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="people">
                People ({permissions.filter(p => p.type === 'user').length})
              </TabsTrigger>
              <TabsTrigger value="teams">
                Teams ({permissions.filter(p => p.type === 'team').length})
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {selectedTab !== 'settings' && (
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--ff-text-muted)] w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 bg-[var(--ff-bg-layer)] border-[var(--ff-border)]"
                  />
                </div>
                {bulkSelect.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className="border-[var(--ff-border)]"
                  >
                    {bulkSelect.size} selected
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {showBulkActions && bulkSelect.size > 0 && (
            <div className="mb-4 p-3 bg-[var(--ff-bg-layer)] rounded-lg flex items-center justify-between">
              <span className="text-sm text-[var(--ff-text-secondary)]">
                {bulkSelect.size} item(s) selected
              </span>
              <div className="flex gap-2">
                <Select onValueChange={(value: any) => handleBulkAction('changeRole', value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Change role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('remove')}
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          <TabsContent value="people" className="space-y-2">
            {filteredPermissions.filter(p => p.type === 'user' || p.type === 'email').map(permission => (
              <div
                key={permission.id}
                className="flex items-center justify-between p-4 border border-[var(--ff-border)] rounded-lg hover:bg-[var(--ff-bg-layer)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {!readOnly && permission.userId !== ownerId && (
                    <input
                      type="checkbox"
                      checked={bulkSelect.has(permission.id)}
                      onChange={(e) => {
                        const newSelect = new Set(bulkSelect);
                        if (e.target.checked) {
                          newSelect.add(permission.id);
                        } else {
                          newSelect.delete(permission.id);
                        }
                        setBulkSelect(newSelect);
                      }}
                      className="rounded border-[var(--ff-border)]"
                    />
                  )}
                  <div className="w-10 h-10 rounded-full bg-[var(--ff-purple-500)]/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-[var(--ff-purple-500)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{permission.name}</p>
                      {permission.userId === ownerId && (
                        <Badge className="text-xs bg-[var(--ff-purple-500)] text-white">Owner</Badge>
                      )}
                      {permission.userId === currentUserId && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                      {permission.type === 'email' && !permission.isActive && (
                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--ff-text-muted)]">
                      {permission.email || `Added ${formatDate(permission.addedAt)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-[var(--ff-text-muted)]">
                      Last active
                    </p>
                    <p className="text-xs text-[var(--ff-text-secondary)]">
                      {formatDate(permission.lastAccessed)}
                    </p>
                  </div>
                  {permission.userId !== ownerId && !readOnly ? (
                    <Select
                      value={permission.role}
                      onValueChange={(value: any) => updatePermissionRole(permission.id, value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getRoleBadgeColor(permission.role)}>
                      {permission.role}
                    </Badge>
                  )}
                  {permission.userId !== ownerId && !readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePermission(permission.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="teams" className="space-y-2">
            {filteredPermissions.filter(p => p.type === 'team').map(permission => (
              <div
                key={permission.id}
                className="flex items-center justify-between p-4 border border-[var(--ff-border)] rounded-lg hover:bg-[var(--ff-bg-layer)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {!readOnly && (
                    <input
                      type="checkbox"
                      checked={bulkSelect.has(permission.id)}
                      onChange={(e) => {
                        const newSelect = new Set(bulkSelect);
                        if (e.target.checked) {
                          newSelect.add(permission.id);
                        } else {
                          newSelect.delete(permission.id);
                        }
                        setBulkSelect(newSelect);
                      }}
                      className="rounded border-[var(--ff-border)]"
                    />
                  )}
                  <div className="w-10 h-10 rounded-full bg-[var(--ff-blue-500)]/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[var(--ff-blue-500)]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{permission.name}</p>
                    <p className="text-xs text-[var(--ff-text-muted)]">
                      Added by {permission.addedBy} • {formatDate(permission.addedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!readOnly ? (
                    <Select
                      value={permission.role}
                      onValueChange={(value: any) => updatePermissionRole(permission.id, value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getRoleBadgeColor(permission.role)}>
                      {permission.role}
                    </Badge>
                  )}
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePermission(permission.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-[var(--ff-border)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Copy className="w-5 h-5 text-[var(--ff-text-secondary)]" />
                  <div>
                    <p className="font-medium">Allow Duplication</p>
                    <p className="text-xs text-[var(--ff-text-muted)]">
                      Users can create their own copy of this template
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.allowDuplication}
                  onCheckedChange={(checked) => {
                    const newSettings = { ...settings, allowDuplication: checked };
                    setSettings(newSettings);
                    onSettingsUpdate?.(newSettings);
                  }}
                  disabled={readOnly}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-[var(--ff-border)] rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[var(--ff-text-secondary)]" />
                  <div>
                    <p className="font-medium">Require Approval</p>
                    <p className="text-xs text-[var(--ff-text-muted)]">
                      New users must be approved before accessing
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.requireApproval}
                  onCheckedChange={(checked) => {
                    const newSettings = { ...settings, requireApproval: checked };
                    setSettings(newSettings);
                    onSettingsUpdate?.(newSettings);
                  }}
                  disabled={readOnly}
                />
              </div>

              {settings.expiresAt && (
                <div className="flex items-center justify-between p-4 border border-[var(--ff-border)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[var(--ff-text-secondary)]" />
                    <div>
                      <p className="font-medium">Access Expiration</p>
                      <p className="text-xs text-[var(--ff-text-muted)]">
                        Sharing expires on {settings.expiresAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[var(--ff-border)]"
                    >
                      Change Date
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Invite Dialog */}
        {showInviteDialog && (
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite People</DialogTitle>
                <DialogDescription>
                  Share "{templateName}" with team members
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Permission Level</label>
                  <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleDescriptions).map(([role, description]) => (
                        <SelectItem key={role} value={role}>
                          <div>
                            <p className="font-medium capitalize">{role}</p>
                            <p className="text-xs text-[var(--ff-text-muted)]">{description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Message (optional)</label>
                  <textarea
                    placeholder="Add a personal message..."
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    className="mt-1 w-full p-3 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-sm"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowInviteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={!inviteEmail}
                    className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Invite
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardGlassContent>
    </CardGlass>
  );
}