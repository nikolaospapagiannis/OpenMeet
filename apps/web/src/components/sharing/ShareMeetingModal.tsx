'use client';

import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, Link as LinkIcon, Mail, MessageSquare } from 'lucide-react';
import { ShareLinkGenerator } from './ShareLinkGenerator';
import { EmailInviteForm } from './EmailInviteForm';
import { ShareToIntegrations } from './ShareToIntegrations';

interface ShareMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  meetingTitle: string;
}

export function ShareMeetingModal({
  isOpen,
  onClose,
  meetingId,
  meetingTitle,
}: ShareMeetingModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'email' | 'integrations'>('link');

  return (
    <Dialog open={isOpen} onClose={onClose} className="max-w-2xl w-full">
      <DialogHeader>
        <DialogTitle>
          <div className="flex items-center gap-2">
            <Share2 className="w-6 h-6 text-blue-500" />
            Share Meeting
          </div>
        </DialogTitle>
        <p className="text-sm text-slate-400 mt-1">
          Share "{meetingTitle}" with others
        </p>
      </DialogHeader>

      <DialogContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Integrations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-4">
            <ShareLinkGenerator meetingId={meetingId} />
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <EmailInviteForm meetingId={meetingId} meetingTitle={meetingTitle} />
          </TabsContent>

          <TabsContent value="integrations" className="mt-4">
            <ShareToIntegrations meetingId={meetingId} meetingTitle={meetingTitle} />
          </TabsContent>
        </Tabs>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
