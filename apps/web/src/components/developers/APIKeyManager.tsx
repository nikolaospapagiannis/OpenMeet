'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Key,
  Copy,
  RotateCw,
  Trash2,
  MoreVertical,
  Plus,
  Eye,
  EyeOff,
  Shield,
  Clock,
  Activity
} from 'lucide-react';
import { useDeveloperPortal } from '@/hooks/useDeveloperPortal';

interface APIKey {
  id: string;
  name: string;
  keyPreview: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  rateLimit: number;
  isActive: boolean;
  createdAt: string;
}

interface APIKeyManagerProps {
  onSelectKey?: (keyId: string) => void;
  selectedKeyId?: string | null;
}

export default function APIKeyManager({ onSelectKey, selectedKeyId }: APIKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyDetails, setNewKeyDetails] = useState<{ key: string; id: string } | null>(null);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [showKey, setShowKey] = useState(false);

  // New API key form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read']);
  const [newKeyExpiry, setNewKeyExpiry] = useState('30');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState('1000');

  const { fetchAPIKeys, createAPIKey, rotateAPIKey, revokeAPIKey } = useDeveloperPortal();

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      const keys = await fetchAPIKeys();
      setApiKeys(keys);
    } catch (error) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    try {
      const result = await createAPIKey({
        name: newKeyName,
        scopes: newKeyScopes,
        expiresInDays: parseInt(newKeyExpiry),
        rateLimit: parseInt(newKeyRateLimit),
      });

      setNewKeyDetails({ key: result.key, id: result.id });
      setShowCreateDialog(false);
      setShowKeyDialog(true);

      // Reset form
      setNewKeyName('');
      setNewKeyScopes(['read']);
      setNewKeyExpiry('30');
      setNewKeyRateLimit('1000');

      await loadAPIKeys();
      toast.success('API key created successfully');
    } catch (error) {
      toast.error('Failed to create API key');
    }
  };

  const handleRotateKey = async (keyId: string) => {
    try {
      const result = await rotateAPIKey(keyId);
      setNewKeyDetails({ key: result.key, id: result.id });
      setShowKeyDialog(true);
      await loadAPIKeys();
      toast.success('API key rotated successfully');
    } catch (error) {
      toast.error('Failed to rotate API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await revokeAPIKey(keyId);
      await loadAPIKeys();
      toast.success('API key revoked successfully');
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getScopeColor = (scope: string) => {
    const colors: Record<string, string> = {
      read: 'bg-blue-100 text-blue-800',
      write: 'bg-green-100 text-green-800',
      delete: 'bg-red-100 text-red-800',
      admin: 'bg-purple-100 text-purple-800',
    };
    return colors[scope] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for programmatic access
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No API keys yet. Create your first key to get started.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow
                    key={apiKey.id}
                    className={selectedKeyId === apiKey.id ? 'bg-accent' : ''}
                    onClick={() => onSelectKey?.(apiKey.id)}
                  >
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {apiKey.keyPreview}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(apiKey.keyPreview);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {apiKey.scopes.map((scope) => (
                          <Badge
                            key={scope}
                            variant="secondary"
                            className={getScopeColor(scope)}
                          >
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{apiKey.rateLimit}/hour</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDate(apiKey.lastUsedAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {apiKey.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Revoked</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRotateKey(apiKey.id);
                            }}
                          >
                            <RotateCw className="h-4 w-4 mr-2" />
                            Rotate Key
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedKey(apiKey);
                              onSelectKey?.(apiKey.id);
                            }}
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            View Usage
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevokeKey(apiKey.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revoke Key
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for programmatic access to your data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Production API Key"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {['read', 'write', 'delete'].map((scope) => (
                  <Badge
                    key={scope}
                    variant={newKeyScopes.includes(scope) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      if (newKeyScopes.includes(scope)) {
                        setNewKeyScopes(newKeyScopes.filter((s) => s !== scope));
                      } else {
                        setNewKeyScopes([...newKeyScopes, scope]);
                      }
                    }}
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="expiry">Expiration</Label>
              <Select value={newKeyExpiry} onValueChange={setNewKeyExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="rateLimit">Rate Limit (requests/hour)</Label>
              <Select value={newKeyRateLimit} onValueChange={setNewKeyRateLimit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1,000</SelectItem>
                  <SelectItem value="5000">5,000</SelectItem>
                  <SelectItem value="10000">10,000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={!newKeyName}>
              Create API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New API Key Display Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Store this key securely. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          {newKeyDetails && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Make sure to copy your API key now. You won&apos;t be able to see it again!
                </AlertDescription>
              </Alert>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={showKey ? newKeyDetails.key : '••••••••••••••••••••••••••••••••'}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(newKeyDetails.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowKeyDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}