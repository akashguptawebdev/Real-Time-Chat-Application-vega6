import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import WifiOffRoundedIcon from '@mui/icons-material/WifiOffRounded';
import CircularProgress from '@mui/material/CircularProgress';

import { useAuth } from '../hooks/useAuth.js';
import { useSocket } from '../hooks/useSocket.js';
import Avatar from '../components/ui/Avatar.jsx';
import Spinner from '../components/ui/Spinner.jsx';

import UserSearchBar from '../features/conversations/UserSearchBar.jsx';
import ConversationItem from '../features/conversations/ConversationItem.jsx';
import MessageList from '../features/messages/MessageList.jsx';
import MessageInput from '../features/messages/MessageInput.jsx';
import CreateGroupModal from '../features/groups/CreateGroupModal.jsx';
import GroupDetailsModal from '../features/groups/GroupDetailsModal.jsx';
import ThemeToggle from '../components/ui/ThemeToggle.jsx';

import {
  fetchConversations,
  getOrCreateDirectConversation,
  fetchMessages,
  sendMessageApi,
  uploadFileApi,
  markConversationReadApi,
  editMessageApi,
  deleteMessageApi,
  toggleReactionApi,
} from '../features/conversations/conversationApi.js';

export default function ChatPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const token = localStorage.getItem('accessToken');
  const {
    socket,
    isConnected,
    onlineUserIds,
    lastSeenMap,
    joinConversation,
    leaveConversation,
    emitTyping,
  } = useSocket(token);

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [mobileView, setMobileView] = useState('list');

  // Group modals
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);

  // Reconnect state — track previous connection state to detect reconnects
  const prevConnectedRef = useRef(false);

  const activeConvRef = useRef(activeConversation);
  useEffect(() => { activeConvRef.current = activeConversation; }, [activeConversation]);

  // ── Load conversations on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setConversationsLoading(true);

    fetchConversations()
      .then((convs) => {
        if (!isMounted) return;
        setConversations(convs);
        if (convs.length > 0 && !activeConvRef.current && window.innerWidth >= 768) {
          const savedActiveId = localStorage.getItem('activeConversationId');
          const targetConv = (savedActiveId && convs.find((c) => c.id === savedActiveId)) || convs[0];
          if (targetConv) selectConversation(targetConv);
        }
      })
      .catch((err) => console.error('Failed to load conversations:', err))
      .finally(() => { if (isMounted) setConversationsLoading(false); });

    return () => { isMounted = false; };
  }, [user]); // eslint-disable-line

  // ── Reconnect: sync missed messages ────────────────────────────────────────
  useEffect(() => {
    if (isConnected && !prevConnectedRef.current) {
      // Just reconnected — refresh the active conversation's messages
      const conv = activeConvRef.current;
      if (conv) {
        fetchMessages(conv.id).then(({ messages: msgs, nextCursor: cur, hasMore: more }) => {
          setMessages(msgs);
          setNextCursor(cur);
          setHasMore(more);
        }).catch(() => {});
      }
      // Also refresh conversation list (unread counts may have changed while offline)
      fetchConversations().then(setConversations).catch(() => {});
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);

  // ── Select a conversation ───────────────────────────────────────────────────
  const selectConversation = useCallback(
    async (conv) => {
      if (!conv) return;
      localStorage.setItem('activeConversationId', conv.id);

      if (activeConvRef.current && activeConvRef.current.id !== conv.id) {
        leaveConversation(activeConvRef.current.id);
      }

      setActiveConversation(conv);
      setMobileView('chat');
      setIsOtherUserTyping(false);
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);

      joinConversation(conv.id);

      setMessagesLoading(true);
      try {
        const { messages: msgs, nextCursor: cursor, hasMore: more } = await fetchMessages(conv.id);
        setMessages(msgs);
        setNextCursor(cursor);
        setHasMore(more);
        setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
        );
        markConversationReadApi(conv.id).catch(() => {});
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setMessagesLoading(false);
      }
    },
    [joinConversation, leaveConversation]
  );

  // ── Load older messages (infinite scroll upward) ────────────────────────────
  const handleLoadMore = useCallback(async () => {
    const conv = activeConvRef.current;
    if (!conv || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { messages: older, nextCursor: newCursor, hasMore: more } = await fetchMessages(conv.id, nextCursor);
      setMessages((prev) => [...older, ...prev]);
      setNextCursor(newCursor);
      setHasMore(more);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  // ── Message Actions ─────────────────────────────────────────────────────────
  const handleEditMessage = useCallback(async (messageId, content) => {
    const conv = activeConvRef.current;
    if (!conv) return;
    try {
      const updated = await editMessageApi(conv.id, messageId, content);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
    } catch (err) {
      console.error('Edit failed:', err);
    }
  }, []);

  const handleDeleteMessage = useCallback(async (messageId) => {
    const conv = activeConvRef.current;
    if (!conv) return;
    try {
      await deleteMessageApi(conv.id, messageId);
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m));
    } catch (err) {
      const msg = err.response?.data?.message || 'Delete failed';
      alert(msg);
    }
  }, []);

  const handleReactMessage = useCallback(async (messageId, emoji) => {
    const conv = activeConvRef.current;
    if (!conv) return;
    try {
      await toggleReactionApi(conv.id, messageId, emoji);
      // Socket will broadcast reaction_updated; handled in useEffect below
    } catch (err) {
      console.error('Reaction failed:', err);
    }
  }, []);

  // ── User search → start DM ──────────────────────────────────────────────────
  const handleSelectUserFromSearch = async (targetUser) => {
    try {
      const conv = await getOrCreateDirectConversation(targetUser.id);
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        if (exists) return prev.map((c) => (c.id === conv.id ? { ...c, ...conv } : c));
        return [conv, ...prev];
      });
      await selectConversation(conv);
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  // ── Group lifecycle handlers ─────────────────────────────────────────────────
  const handleGroupCreated = async (newGroup) => {
    setConversations((prev) => [newGroup, ...prev.filter((c) => c.id !== newGroup.id)]);
    await selectConversation(newGroup);
  };

  const handleGroupUpdated = (updated) => {
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    if (activeConversation?.id === updated.id) {
      setActiveConversation((prev) => (prev ? { ...prev, ...updated } : prev));
    }
  };

  const handleGroupRemovedOrLeft = (groupId) => {
    setConversations((prev) => prev.filter((c) => c.id !== groupId));
    if (activeConversation?.id === groupId) {
      setActiveConversation(null);
      localStorage.removeItem('activeConversationId');
    }
  };

  // ── Real-time socket listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ conversationId, message }) => {
      const isActive = activeConvRef.current?.id === conversationId;
      const isFromOther = message.senderId !== user?.id;

      if (isActive) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id || (m.clientMessageId && m.clientMessageId === message.clientMessageId))) {
            return prev.map((m) => (m.clientMessageId === message.clientMessageId ? message : m));
          }
          return [...prev, message];
        });
        markConversationReadApi(conversationId).catch(() => {});
      }

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx > -1) {
          const current = prev[idx];
          // When chat is not open and someone else sends a message, show/increment unread badge!
          const newUnreadCount = (!isActive && isFromOther)
            ? (Number(current.unreadCount) || 0) + 1
            : (isActive ? 0 : (Number(current.unreadCount) || 0));

          const updated = {
            ...current,
            lastMessage: message,
            unreadCount: newUnreadCount,
          };
          const next = [...prev];
          next.splice(idx, 1);
          return [updated, ...next];
        } else {
          // If conversation wasn't in sidebar yet, fetch conversations so it appears immediately
          fetchConversations().then(setConversations).catch(() => {});
          return prev;
        }
      });
    };

    const handleConversationUpdated = ({ conversationId, lastMessage }) => {
      const isActive = activeConvRef.current?.id === conversationId;
      const isFromOther = lastMessage?.senderId !== user?.id;

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === conversationId);
        if (idx > -1) {
          const current = prev[idx];
          const isNewMsg = current.lastMessage?.id !== lastMessage?.id;
          const newUnreadCount = (!isActive && isFromOther && isNewMsg)
            ? (Number(current.unreadCount) || 0) + 1
            : (isActive ? 0 : (Number(current.unreadCount) || 0));

          const updated = {
            ...current,
            lastMessage,
            unreadCount: newUnreadCount,
          };
          const next = [...prev];
          next.splice(idx, 1);
          return [updated, ...next];
        } else {
          fetchConversations().then(setConversations).catch(() => {});
          return prev;
        }
      });
    };

    const handleMessagesRead = ({ conversationId, readByUserId, latestMessageId, readAt }) => {
      if (activeConvRef.current?.id === conversationId && readByUserId !== user?.id) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId === user?.id && new Date(m.created_at) <= new Date(readAt)) {
              return { ...m, readAt };
            }
            return m;
          })
        );
      }
    };

    // Message edited
    const handleMessageEdited = ({ conversationId, message }) => {
      if (activeConvRef.current?.id === conversationId) {
        setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
      }
    };

    // Message deleted for everyone
    const handleMessageDeleted = ({ conversationId, messageId }) => {
      if (activeConvRef.current?.id === conversationId) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m));
      }
    };

    // Emoji reaction updated
    const handleReactionUpdated = ({ conversationId, messageId, reactions }) => {
      if (activeConvRef.current?.id === conversationId) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
      }
    };

    const handleRemovedFromGroup = ({ conversationId }) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConvRef.current?.id === conversationId) {
        setActiveConversation(null);
        localStorage.removeItem('activeConversationId');
      }
    };

    const handleGroupDeleted = ({ conversationId }) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConvRef.current?.id === conversationId) {
        setActiveConversation(null);
        localStorage.removeItem('activeConversationId');
      }
    };

    const handleGroupUpdatedSocket = ({ conversationId, name, avatarUrl }) => {
      setConversations((prev) => prev.map((c) => c.id === conversationId ? { ...c, name, avatarUrl } : c));
      if (activeConvRef.current?.id === conversationId) {
        setActiveConversation((prev) => (prev ? { ...prev, name, avatarUrl } : prev));
      }
    };

    const handleMemberRoleUpdated = ({ conversationId, userId: targetUserId, role }) => {
      if (user && targetUserId === user.id) {
        setConversations((prev) => prev.map((c) => c.id === conversationId ? { ...c, myRole: role } : c));
        if (activeConvRef.current?.id === conversationId) {
          setActiveConversation((prev) => (prev ? { ...prev, myRole: role } : prev));
        }
      }
    };

    const handleGroupCreatedSocket = ({ conversation }) => {
      if (conversation) {
        setConversations((prev) => [conversation, ...prev.filter((c) => c.id !== conversation.id)]);
      }
    };

    const handleAddedToGroup = async () => {
      try { const convs = await fetchConversations(); setConversations(convs); } catch (e) { /* ignore */ }
    };

    const handleUserTyping = ({ conversationId }) => {
      if (activeConvRef.current?.id === conversationId) setIsOtherUserTyping(true);
    };

    const handleUserStoppedTyping = ({ conversationId }) => {
      if (activeConvRef.current?.id === conversationId) setIsOtherUserTyping(false);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('removed_from_group', handleRemovedFromGroup);
    socket.on('group_deleted', handleGroupDeleted);
    socket.on('group_updated', handleGroupUpdatedSocket);
    socket.on('member_role_updated', handleMemberRoleUpdated);
    socket.on('group_created', handleGroupCreatedSocket);
    socket.on('added_to_group', handleAddedToGroup);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('removed_from_group', handleRemovedFromGroup);
      socket.off('group_deleted', handleGroupDeleted);
      socket.off('group_updated', handleGroupUpdatedSocket);
      socket.off('member_role_updated', handleMemberRoleUpdated);
      socket.off('group_created', handleGroupCreatedSocket);
      socket.off('added_to_group', handleAddedToGroup);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
    };
  }, [socket, user]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSendMessage = async (content) => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    const clientMessageId = crypto.randomUUID();

    const optimisticMsg = {
      id: null,
      clientMessageId,
      conversationId: convId,
      senderId: user.id,
      content,
      created_at: new Date().toISOString(),
      reactions: [],
      sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const newMsg = await sendMessageApi(convId, content, clientMessageId);
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return prev.map((m) => m.clientMessageId === clientMessageId ? newMsg : m);
      });
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === convId);
        if (idx > -1) {
          const updated = { ...prev[idx], lastMessage: newMsg };
          const next = [...prev];
          next.splice(idx, 1);
          return [updated, ...next];
        }
        return prev;
      });
    } catch (err) {
      console.error('Send failed:', err);
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
    }
  };

  // ── Send file / image attachment ───────────────────────────────────────────
  const handleSendFile = async (file, caption = '') => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    const clientMessageId = crypto.randomUUID();

    const isImage = file.type.startsWith('image/');
    const localPreviewUrl = isImage ? URL.createObjectURL(file) : null;

    const optimisticMsg = {
      id: null,
      clientMessageId,
      conversationId: convId,
      senderId: user.id,
      content: caption || null,
      messageType: isImage ? 'image' : 'file',
      fileUrl: localPreviewUrl,
      fileName: file.name,
      fileSize: file.size,
      fileMimeType: file.type,
      created_at: new Date().toISOString(),
      reactions: [],
      sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('content', caption);
      formData.append('clientMessageId', clientMessageId);

      const newMsg = await uploadFileApi(convId, formData);
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return prev.map((m) => (m.clientMessageId === clientMessageId ? newMsg : m));
      });
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === convId);
        if (idx > -1) {
          const updated = { ...prev[idx], lastMessage: newMsg };
          const next = [...prev];
          next.splice(idx, 1);
          return [updated, ...next];
        }
        return prev;
      });
      return newMsg;
    } catch (err) {
      console.error('File upload failed:', err);
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
      throw err;
    }
  };

  const handleTyping = (isTyping) => {
    if (activeConversation) emitTyping(activeConversation.id, isTyping);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) { navigate('/login'); return null; }

  const isGroup = activeConversation?.type === 'group';
  const activeOtherUser = activeConversation?.otherUser;
  const isOtherUserOnline = activeOtherUser && onlineUserIds.has(activeOtherUser.id);
  const otherUserLastSeen = activeOtherUser && lastSeenMap.get(activeOtherUser.id);
  const myRoleInActiveGroup = activeConversation?.myRole;

  const formatLastSeen = (date) => {
    if (!date) return 'Offline';
    const d = new Date(date);
    const diffMins = Math.floor((Date.now() - d) / 60000);
    if (diffMins < 1) return 'Last seen just now';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `Last seen ${diffHrs}h ago`;
    return `Last seen ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans antialiased">

      {/* ── Reconnecting Banner ─────────────────────────────────────────────── */}
      {!isConnected && !authLoading && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500/95 backdrop-blur-sm text-amber-950 text-xs font-semibold py-2 px-4 shadow-lg animate-pulse">
          <WifiOffRoundedIcon sx={{ fontSize: 15 }} />
          Reconnecting to server... Messages will sync when connection is restored.
        </div>
      )}

      {/* ── LEFT SIDEBAR ───────────────────────────────────────────────────── */}
      <aside
        className={`w-full md:w-80 lg:w-96 border-r border-slate-800/80 flex flex-col bg-slate-900/95 backdrop-blur-xl shrink-0 transition-transform duration-200 z-20 ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        } ${!isConnected ? 'mt-8' : ''}`}
      >
        {/* User Profile Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3 min-w-0">
            <Avatar name={user.name} src={user.avatarUrl} size="md" isOnline={isConnected} />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white truncate">{user.name}</p>
              <div className="flex items-center space-x-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <p className="text-[11px] text-slate-400 truncate">
                  {isConnected ? 'Connected' : 'Reconnecting...'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer" title="Log out">
              <LogoutRoundedIcon sx={{ fontSize: 19 }} />
            </button>
          </div>
        </div>

        {/* User Search Bar */}
        <div className="pt-2 pb-1 border-b border-slate-800/60">
          <UserSearchBar onSelectUser={handleSelectUserFromSearch} onlineUserIds={onlineUserIds} />
        </div>

        {/* Conversations Heading + New Group */}
        <div className="px-4 py-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <div className="flex items-center space-x-2">
            <span>Conversations</span>
            <span className="text-[11px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{conversations.length}</span>
            {conversations.reduce((acc, c) => acc + (c.id !== activeConversation?.id ? (Number(c.unreadCount) || 0) : 0), 0) > 0 && (
              <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                {conversations.reduce((acc, c) => acc + (c.id !== activeConversation?.id ? (Number(c.unreadCount) || 0) : 0), 0)} new
              </span>
            )}
          </div>
          <button onClick={() => setIsCreateGroupOpen(true)} className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer transition-colors p-1 rounded-lg hover:bg-slate-800" title="Create New Group">
            <GroupAddRoundedIcon sx={{ fontSize: 16 }} />
            <span className="normal-case">New Group</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {conversationsLoading ? (
            <div className="p-8 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <CircularProgress size={20} sx={{ color: '#818cf8' }} />
              <span className="text-xs">Loading conversations...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ForumRoundedIcon sx={{ fontSize: 36, color: '#475569', mb: 1.5 }} />
              <p className="text-sm font-semibold text-slate-300">No chats yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Search for a user above or create a group.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isConvGroup = conv.type === 'group';
              const otherUser = conv.otherUser;
              const isOnline = otherUser ? onlineUserIds.has(otherUser.id) : false;
              const isActive = activeConversation?.id === conv.id;
              return (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={isActive}
                  isOnline={!isConvGroup ? isOnline : false}
                  currentUserId={user.id}
                  onClick={() => selectConversation(conv)}
                />
              );
            })
          )}
        </div>
      </aside>

      {/* ── RIGHT AREA: Chat window or Empty State ──────────────────────────── */}
      <main
        className={`flex-1 flex flex-col bg-slate-950 overflow-hidden ${mobileView === 'list' ? 'hidden md:flex' : 'flex'} ${!isConnected ? 'mt-8' : ''}`}
      >
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 border-b border-slate-800 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0">
              <div
                onClick={() => isGroup && setIsGroupDetailsOpen(true)}
                className={`flex items-center space-x-3 min-w-0 ${isGroup ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
              >
                <button onClick={(e) => { e.stopPropagation(); setMobileView('list'); }} className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors mr-1">
                  <ArrowBackIcon sx={{ fontSize: 20 }} />
                </button>
                <div className="relative">
                  <Avatar
                    name={isGroup ? activeConversation.name : activeOtherUser?.name || 'User'}
                    src={isGroup ? activeConversation.avatarUrl : activeOtherUser?.avatarUrl}
                    size="md"
                    isOnline={!isGroup ? isOtherUserOnline : undefined}
                  />
                  {isGroup && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                      <GroupsRoundedIcon sx={{ fontSize: 10 }} />
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h2 className="font-bold text-sm text-white truncate">
                      {isGroup ? activeConversation.name : activeOtherUser?.name || 'Chat'}
                    </h2>
                    {isGroup && myRoleInActiveGroup && (
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${
                        myRoleInActiveGroup === 'OWNER' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : myRoleInActiveGroup === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700/60'
                      }`}>{myRoleInActiveGroup}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {isGroup ? (
                      <span className="hover:text-indigo-300 transition-colors">{activeConversation.members?.length || 0} members • Click for info</span>
                    ) : isOtherUserOnline ? (
                      <span className="text-emerald-400 font-medium">Active now</span>
                    ) : (
                      <span className="text-slate-500">{formatLastSeen(otherUserLastSeen || activeOtherUser?.lastSeenAt)}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1 text-slate-400">
                {isGroup && (
                  <button onClick={() => setIsGroupDetailsOpen(true)} className="p-2 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors cursor-pointer" title="Group Settings & Members">
                    <InfoOutlinedIcon sx={{ fontSize: 20 }} />
                  </button>
                )}
              </div>
            </div>

            {/* Message Feed */}
            <MessageList
              messages={messages}
              loading={messagesLoading}
              loadingMore={loadingMore}
              hasMore={hasMore}
              onLoadMore={handleLoadMore}
              currentUserId={user.id}
              otherUser={activeOtherUser}
              isTyping={isOtherUserTyping}
              conversationId={activeConversation.id}
              conversationType={activeConversation.type}
              activeMembers={activeConversation.members || []}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onReactMessage={handleReactMessage}
            />

            {/* Message Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              onSendFile={handleSendFile}
              onTyping={handleTyping}
              disabled={messagesLoading}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-slate-950 to-slate-900">
            <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-xl shadow-indigo-900/10">
              <ForumRoundedIcon sx={{ fontSize: 40, color: '#818cf8' }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to Chatly, {user.name.split(' ')[0]}!</h2>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-6">
              Start one-to-one conversations or create team groups with Owners, Admins, and Members.
            </p>
            <button onClick={() => setIsCreateGroupOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-1.5 cursor-pointer">
              <GroupAddRoundedIcon sx={{ fontSize: 16 }} />
              <span>Create a Group</span>
            </button>
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} onGroupCreated={handleGroupCreated} currentUserId={user.id} />
      {isGroup && (
        <GroupDetailsModal
          isOpen={isGroupDetailsOpen}
          onClose={() => setIsGroupDetailsOpen(false)}
          groupId={activeConversation.id}
          currentUserId={user.id}
          onGroupUpdated={handleGroupUpdated}
          onGroupDeleted={handleGroupRemovedOrLeft}
          onLeftGroup={handleGroupRemovedOrLeft}
        />
      )}
    </div>
  );
}
