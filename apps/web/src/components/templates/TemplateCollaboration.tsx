'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  User,
  UserPlus,
  UserMinus,
  Circle,
  MessageSquare,
  Bell,
  BellOff,
  Eye,
  Edit,
  Lock,
  Unlock,
  Clock,
  Activity,
  Zap,
  MousePointer,
  Type,
  Hash,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Share2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Send,
  Smile,
  Paperclip,
  AtSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'idle' | 'offline';
  lastSeen?: Date;
  cursor?: {
    x: number;
    y: number;
    element?: string;
    selection?: string;
  };
  isTyping?: boolean;
  currentSection?: string;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canShare: boolean;
    canDelete: boolean;
  };
}

interface CollaborationEvent {
  id: string;
  type: 'join' | 'leave' | 'edit' | 'comment' | 'mention' | 'save' | 'share';
  userId: string;
  userName: string;
  timestamp: Date;
  details?: any;
  section?: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  resolved?: boolean;
  replies?: Comment[];
  mentions?: string[];
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  reactions?: Record<string, string[]>;
  edited?: boolean;
  editedAt?: Date;
}

interface PresenceIndicator {
  userId: string;
  element: string;
  type: 'cursor' | 'selection' | 'typing';
  data?: any;
}

interface TemplateCollaborationProps {
  templateId: string;
  currentUser: Collaborator;
  collaborators: Collaborator[];
  onInvite?: (email: string, role: 'editor' | 'viewer') => void;
  onRemove?: (userId: string) => void;
  onRoleChange?: (userId: string, newRole: 'editor' | 'viewer') => void;
  onStartCall?: () => void;
  onSendMessage?: (message: string, mentions?: string[]) => void;
  onComment?: (comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  onPresenceUpdate?: (presence: PresenceIndicator) => void;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
  showPresence?: boolean;
  showComments?: boolean;
  showActivity?: boolean;
  showVideo?: boolean;
  className?: string;
}

export default function TemplateCollaboration({
  templateId,
  currentUser,
  collaborators,
  onInvite,
  onRemove,
  onRoleChange,
  onStartCall,
  onSendMessage,
  onComment,
  onPresenceUpdate,
  connectionStatus = 'connected',
  showPresence = true,
  showComments = true,
  showActivity = true,
  showVideo = false,
  className
}: TemplateCollaborationProps) {
  const [activeTab, setActiveTab] = useState<'collaborators' | 'comments' | 'activity'>('collaborators');
  const [isExpanded, setIsExpanded] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [message, setMessage] = useState('');
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [events, setEvents] = useState<CollaborationEvent[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Mock real-time events
  useEffect(() => {
    // Simulate collaboration events
    const mockEvents: CollaborationEvent[] = [
      {
        id: '1',
        type: 'join',
        userId: 'user1',
        userName: 'Alice Johnson',
        timestamp: new Date(Date.now() - 1000 * 60 * 5)
      },
      {
        id: '2',
        type: 'edit',
        userId: 'user2',
        userName: 'Bob Smith',
        timestamp: new Date(Date.now() - 1000 * 60 * 3),
        section: 'Introduction',
        details: { changes: 15 }
      },
      {
        id: '3',
        type: 'comment',
        userId: 'user3',
        userName: 'Carol White',
        timestamp: new Date(Date.now() - 1000 * 60 * 2),
        section: 'Action Items'
      },
      {
        id: '4',
        type: 'save',
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: new Date(Date.now() - 1000 * 60 * 1),
        details: { version: 'v1.2.3' }
      }
    ];
    setEvents(mockEvents);

    // Simulate comments
    const mockComments: Comment[] = [
      {
        id: '1',
        userId: 'user2',
        userName: 'Bob Smith',
        userAvatar: undefined,
        content: 'Great template! I think we should add more detail to the action items section.',
        timestamp: new Date(Date.now() - 1000 * 60 * 10),
        replies: [
          {
            id: '2',
            userId: currentUser.id,
            userName: currentUser.name,
            content: 'Good idea! Let me update that section.',
            timestamp: new Date(Date.now() - 1000 * 60 * 8)
          }
        ],
        reactions: {
          '👍': ['user3', currentUser.id],
          '💡': ['user1']
        }
      },
      {
        id: '3',
        userId: 'user3',
        userName: 'Carol White',
        content: '@Alice Can you review the metrics section when you get a chance?',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        mentions: ['Alice Johnson']
      }
    ];
    setComments(mockComments);
  }, [currentUser]);

  // Simulate typing indicator
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Notify others that user is typing
    onPresenceUpdate?.({
      userId: currentUser.id,
      element: 'message-input',
      type: 'typing',
      data: { isTyping: true }
    });

    // Clear typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      onPresenceUpdate?.({
        userId: currentUser.id,
        element: 'message-input',
        type: 'typing',
        data: { isTyping: false }
      });
    }, 2000);
  }, [currentUser.id, onPresenceUpdate]);

  // Handle message send
  const handleSendMessage = () => {
    if (!message.trim()) return;

    onSendMessage?.(message, selectedMentions);

    // Add to activity
    const newEvent: CollaborationEvent = {
      id: Date.now().toString(),
      type: 'comment',
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: new Date(),
      details: { message, mentions: selectedMentions }
    };
    setEvents([newEvent, ...events]);

    setMessage('');
    setSelectedMentions([]);
    messageInputRef.current?.focus();
  };

  // Handle mention search
  const handleMentionSearch = (text: string) => {
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex >= 0 && lastAtIndex === text.length - 1) {
      setShowMentions(true);
      setMentionSearch('');
    } else if (lastAtIndex >= 0) {
      const searchTerm = text.substring(lastAtIndex + 1);
      setMentionSearch(searchTerm);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  // Add mention to message
  const addMention = (user: Collaborator) => {
    const lastAtIndex = message.lastIndexOf('@');
    const newMessage = message.substring(0, lastAtIndex) + `@${user.name} `;
    setMessage(newMessage);
    setSelectedMentions([...selectedMentions, user.id]);
    setShowMentions(false);
    messageInputRef.current?.focus();
  };

  // Handle comment reply
  const handleReply = (commentId: string) => {
    if (!replyText.trim()) return;

    const newReply: Comment = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: replyText,
      timestamp: new Date()
    };

    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply]
        };
      }
      return comment;
    }));

    setReplyText('');
    setReplyingTo(null);
  };

  // Toggle reaction on comment
  const toggleReaction = (commentId: string, emoji: string) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        const reactions = { ...(comment.reactions || {}) };
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }
        const userIndex = reactions[emoji].indexOf(currentUser.id);
        if (userIndex >= 0) {
          reactions[emoji].splice(userIndex, 1);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji].push(currentUser.id);
        }
        return { ...comment, reactions };
      }
      return comment;
    }));
  };

  // Resolve comment
  const resolveComment = (commentId: string) => {
    setComments(comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, resolved: !comment.resolved };
      }
      return comment;
    }));
  };

  // Handle invite
  const handleInvite = () => {
    if (!inviteEmail || !inviteEmail.includes('@')) return;

    onInvite?.(inviteEmail, inviteRole);
    setInviteEmail('');
    setShowInviteDialog(false);

    // Add to activity
    const newEvent: CollaborationEvent = {
      id: Date.now().toString(),
      type: 'share',
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: new Date(),
      details: { email: inviteEmail, role: inviteRole }
    };
    setEvents([newEvent, ...events]);
  };

  // Get online collaborators
  const onlineCollaborators = collaborators.filter(c => c.status === 'online');
  const offlineCollaborators = collaborators.filter(c => c.status !== 'online');

  // Filter mentions based on search
  const filteredMentions = collaborators.filter(c =>
    c.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  return (
    <CardGlass className={cn("w-80 h-full flex flex-col", className)}>
      {/* Header */}
      <CardGlassHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardGlassTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>Collaboration</span>
            <Badge variant="secondary" className="ml-1">
              {onlineCollaborators.length} online
            </Badge>
          </CardGlassTitle>
          <div className="flex items-center gap-1">
            {/* Connection Status */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs",
                    connectionStatus === 'connected' && "bg-green-500/10 text-green-500",
                    connectionStatus === 'connecting' && "bg-yellow-500/10 text-yellow-500",
                    connectionStatus === 'disconnected' && "bg-red-500/10 text-red-500"
                  )}>
                    {connectionStatus === 'connected' ? (
                      <Wifi className="w-3 h-3" />
                    ) : connectionStatus === 'connecting' ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <WifiOff className="w-3 h-3" />
                    )}
                    {connectionStatus}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {connectionStatus === 'connected' ? 'Real-time sync active' :
                   connectionStatus === 'connecting' ? 'Reconnecting...' :
                   'Connection lost - changes will sync when reconnected'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotifications(!notifications)}
              className="p-1 h-7 w-7"
            >
              {notifications ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </Button>

            {/* Expand/Collapse */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 h-7 w-7"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Video Call Bar */}
        {showVideo && isExpanded && (
          <div className="flex items-center justify-between mt-3 p-2 bg-[var(--ff-bg-layer)] rounded-lg">
            <div className="flex items-center gap-2">
              <Button
                variant={videoEnabled ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setVideoEnabled(!videoEnabled)}
                className="p-1 h-7 w-7"
              >
                {videoEnabled ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <VideoOff className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant={audioEnabled ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAudioEnabled(!audioEnabled)}
                className="p-1 h-7 w-7"
              >
                {audioEnabled ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onStartCall}
              className="text-xs"
            >
              Start Call
            </Button>
          </div>
        )}
      </CardGlassHeader>

      {isExpanded && (
        <CardGlassContent className="flex-1 flex flex-col p-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <TabsList className="w-full rounded-none border-b border-[var(--ff-border)]">
              <TabsTrigger value="collaborators" className="flex-1">
                <Users className="w-4 h-4 mr-1" />
                Users
              </TabsTrigger>
              {showComments && (
                <TabsTrigger value="comments" className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Chat
                  {comments.length > 0 && (
                    <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                      {comments.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              {showActivity && (
                <TabsTrigger value="activity" className="flex-1">
                  <Activity className="w-4 h-4 mr-1" />
                  Activity
                </TabsTrigger>
              )}
            </TabsList>

            {/* Collaborators Tab */}
            <TabsContent value="collaborators" className="flex-1 m-0 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {/* Current User */}
                <div className="mb-4">
                  <div className="text-xs text-[var(--ff-text-muted)] mb-2">You</div>
                  <div className="flex items-center gap-3 p-2 bg-[var(--ff-bg-layer)] rounded-lg">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.avatar} />
                        <AvatarFallback>
                          {currentUser.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <Circle className="absolute -bottom-1 -right-1 w-3 h-3 fill-green-500 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{currentUser.name}</div>
                      <div className="text-xs text-[var(--ff-text-muted)]">{currentUser.role}</div>
                    </div>
                  </div>
                </div>

                {/* Online Collaborators */}
                {onlineCollaborators.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-[var(--ff-text-muted)] mb-2">
                      Online ({onlineCollaborators.length})
                    </div>
                    <div className="space-y-2">
                      {onlineCollaborators.map(collaborator => (
                        <div
                          key={collaborator.id}
                          className="flex items-center gap-3 p-2 hover:bg-[var(--ff-bg-hover)] rounded-lg transition-colors group"
                        >
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={collaborator.avatar} />
                              <AvatarFallback style={{ backgroundColor: collaborator.color }}>
                                {collaborator.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <Circle className={cn(
                              "absolute -bottom-1 -right-1 w-3 h-3",
                              collaborator.status === 'online' && "fill-green-500 text-green-500",
                              collaborator.status === 'idle' && "fill-yellow-500 text-yellow-500"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{collaborator.name}</span>
                              {collaborator.isTyping && (
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  typing...
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--ff-text-muted)]">
                              <span>{collaborator.role}</span>
                              {collaborator.currentSection && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{collaborator.currentSection}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {currentUser.permissions.canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{collaborator.name}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {collaborator.role !== 'owner' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => onRoleChange?.(collaborator.id, collaborator.role === 'editor' ? 'viewer' : 'editor')}
                                    >
                                      {collaborator.role === 'editor' ? (
                                        <>
                                          <Eye className="w-4 h-4 mr-2" />
                                          Change to Viewer
                                        </>
                                      ) : (
                                        <>
                                          <Edit className="w-4 h-4 mr-2" />
                                          Change to Editor
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => onRemove?.(collaborator.id)}
                                      className="text-red-500"
                                    >
                                      <UserMinus className="w-4 h-4 mr-2" />
                                      Remove Access
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Send Message
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Offline Collaborators */}
                {offlineCollaborators.length > 0 && (
                  <div>
                    <div className="text-xs text-[var(--ff-text-muted)] mb-2">
                      Offline ({offlineCollaborators.length})
                    </div>
                    <div className="space-y-2">
                      {offlineCollaborators.map(collaborator => (
                        <div
                          key={collaborator.id}
                          className="flex items-center gap-3 p-2 opacity-60 hover:opacity-100 hover:bg-[var(--ff-bg-hover)] rounded-lg transition-all"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={collaborator.avatar} />
                            <AvatarFallback style={{ backgroundColor: collaborator.color }}>
                              {collaborator.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{collaborator.name}</div>
                            <div className="text-xs text-[var(--ff-text-muted)]">
                              Last seen {collaborator.lastSeen ? new Date(collaborator.lastSeen).toLocaleTimeString() : 'recently'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>

              {/* Invite Button */}
              {onInvite && currentUser.permissions.canShare && (
                <div className="p-4 border-t border-[var(--ff-border)]">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowInviteDialog(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Collaborator
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Comments/Chat Tab */}
            {showComments && (
              <TabsContent value="comments" className="flex-1 m-0 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {comments.map(comment => (
                      <div key={comment.id} className={cn(
                        "space-y-2",
                        comment.resolved && "opacity-50"
                      )}>
                        <div className="flex items-start gap-2">
                          <Avatar className="h-6 w-6 mt-1">
                            <AvatarImage src={comment.userAvatar} />
                            <AvatarFallback>
                              {comment.userName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{comment.userName}</span>
                              <span className="text-xs text-[var(--ff-text-muted)]">
                                {comment.timestamp.toLocaleTimeString()}
                              </span>
                              {comment.edited && (
                                <span className="text-xs text-[var(--ff-text-muted)] italic">
                                  (edited)
                                </span>
                              )}
                              {comment.resolved && (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              )}
                            </div>
                            <div className="text-sm">{comment.content}</div>

                            {/* Reactions */}
                            {comment.reactions && Object.keys(comment.reactions).length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {Object.entries(comment.reactions).map(([emoji, users]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => toggleReaction(comment.id, emoji)}
                                    className={cn(
                                      "px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors",
                                      users.includes(currentUser.id)
                                        ? "bg-[var(--ff-purple-500)]/20 text-[var(--ff-purple-500)]"
                                        : "bg-[var(--ff-bg-layer)] hover:bg-[var(--ff-bg-hover)]"
                                    )}
                                  >
                                    <span>{emoji}</span>
                                    <span>{users.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 mt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-auto text-xs"
                                onClick={() => setReplyingTo(comment.id)}
                              >
                                Reply
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-auto text-xs"
                                onClick={() => toggleReaction(comment.id, '👍')}
                              >
                                React
                              </Button>
                              {currentUser.id === comment.userId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 h-auto text-xs"
                                  onClick={() => resolveComment(comment.id)}
                                >
                                  {comment.resolved ? 'Unresolve' : 'Resolve'}
                                </Button>
                              )}
                            </div>

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="ml-4 mt-2 space-y-2 border-l-2 border-[var(--ff-border)] pl-3">
                                {comment.replies.map(reply => (
                                  <div key={reply.id} className="flex items-start gap-2">
                                    <Avatar className="h-5 w-5 mt-0.5">
                                      <AvatarImage src={reply.userAvatar} />
                                      <AvatarFallback>
                                        {reply.userName.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-xs">{reply.userName}</span>
                                        <span className="text-xs text-[var(--ff-text-muted)]">
                                          {reply.timestamp.toLocaleTimeString()}
                                        </span>
                                      </div>
                                      <div className="text-xs mt-0.5">{reply.content}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply Input */}
                            {replyingTo === comment.id && (
                              <div className="ml-4 mt-2 flex gap-1">
                                <Input
                                  placeholder="Write a reply..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleReply(comment.id);
                                    }
                                  }}
                                  className="text-xs h-7"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleReply(comment.id)}
                                  disabled={!replyText.trim()}
                                  className="h-7 px-2"
                                >
                                  <Send className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-[var(--ff-border)]">
                  {/* Mentions Dropdown */}
                  {showMentions && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg shadow-lg max-h-32 overflow-y-auto">
                      {filteredMentions.map(user => (
                        <button
                          key={user.id}
                          onClick={() => addMention(user)}
                          className="w-full px-3 py-2 text-left hover:bg-[var(--ff-bg-hover)] flex items-center gap-2"
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Typing Indicators */}
                  {typingUsers.size > 0 && (
                    <div className="text-xs text-[var(--ff-text-muted)] mb-2">
                      {Array.from(typingUsers).map(userId => {
                        const user = collaborators.find(c => c.id === userId);
                        return user?.name;
                      }).filter(Boolean).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="flex-1 flex gap-1">
                      <Input
                        ref={messageInputRef}
                        placeholder="Type a message..."
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          handleMentionSearch(e.target.value);
                          handleTyping();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2"
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2"
                      >
                        <Smile className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Activity Tab */}
            {showActivity && (
              <TabsContent value="activity" className="flex-1 m-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3">
                    {events.map(event => (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          event.type === 'join' && "bg-green-500/10 text-green-500",
                          event.type === 'leave' && "bg-red-500/10 text-red-500",
                          event.type === 'edit' && "bg-blue-500/10 text-blue-500",
                          event.type === 'comment' && "bg-purple-500/10 text-purple-500",
                          event.type === 'save' && "bg-yellow-500/10 text-yellow-500",
                          event.type === 'share' && "bg-cyan-500/10 text-cyan-500"
                        )}>
                          {event.type === 'join' && <UserPlus className="w-4 h-4" />}
                          {event.type === 'leave' && <UserMinus className="w-4 h-4" />}
                          {event.type === 'edit' && <Edit className="w-4 h-4" />}
                          {event.type === 'comment' && <MessageSquare className="w-4 h-4" />}
                          {event.type === 'save' && <CheckCircle className="w-4 h-4" />}
                          {event.type === 'share' && <Share2 className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            <span className="font-medium">{event.userName}</span>
                            {event.type === 'join' && ' joined the template'}
                            {event.type === 'leave' && ' left the template'}
                            {event.type === 'edit' && ` edited ${event.section || 'the template'}`}
                            {event.type === 'comment' && ` commented on ${event.section || 'the template'}`}
                            {event.type === 'save' && ' saved the template'}
                            {event.type === 'share' && ` shared with ${event.details?.email}`}
                          </div>
                          {event.details && event.type === 'edit' && (
                            <div className="text-xs text-[var(--ff-text-muted)] mt-1">
                              {event.details.changes} changes
                            </div>
                          )}
                          {event.details && event.type === 'save' && (
                            <div className="text-xs text-[var(--ff-text-muted)] mt-1">
                              Version {event.details.version}
                            </div>
                          )}
                          <div className="text-xs text-[var(--ff-text-muted)] mt-1">
                            {event.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>

          {/* Invite Dialog */}
          {showInviteDialog && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-[var(--ff-bg-dark)] rounded-lg p-4 w-full max-w-sm">
                <h3 className="font-medium mb-3">Invite Collaborator</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="invite-email" className="text-sm">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="collaborator@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invite-role" className="text-sm">Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">
                          <div className="flex items-center gap-2">
                            <Edit className="w-4 h-4" />
                            <span>Editor - Can edit template</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            <span>Viewer - Can view only</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleInvite}>
                    Send Invite
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardGlassContent>
      )}
    </CardGlass>
  );
}