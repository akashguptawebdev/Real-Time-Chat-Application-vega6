import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CircularProgress from '@mui/material/CircularProgress';

import { useAuth } from '../hooks/useAuth.js';
import { useSocket } from '../hooks/useSocket.js';
import Avatar from '../components/ui/Avatar.jsx';
import Spinner from '../components/ui/Spinner.jsx';

import UserSearchBar from '../features/conversations/UserSearchBar.jsx';
import ConversationItem from '../features/conversations/ConversationItem.jsx';
import MessageList from '../features/messages/MessageList.jsx';
import MessageInput from '../features/messages/MessageInput.jsx';

import {
  fetchConversations,
  getOrCreateDirectConversation,
  fetchMessages,
  sendMessageApi,
} from '../features/conversations/conversationApi.js';

export default function ChatPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const token = localStorage.getItem('accessToken');
  const {
    socket,
    isConnected,
    onlineUserIds,
    joinConversation,
    leaveConversation,
    emitTyping,
  } = useSocket(token);

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  const activeConvRef = useRef(activeConversation);
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  // Load existing conversations on mount
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setConversationsLoading(true);

    fetchConversations()
      .then((convs) => {
        if (!isMounted) return;
        setConversations(convs);
        // Automatically restore previously active conversation on refresh or select first
        if (convs.length > 0 && !activeConvRef.current && window.innerWidth >= 768) {
          const savedActiveId = localStorage.getItem('activeConversationId');
          const targetConv = (savedActiveId && convs.find((c) => c.id === savedActiveId)) || convs[0];
          if (targetConv) {
            selectConversation(targetConv);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load conversations:', err);
      })
      .finally(() => {
        if (isMounted) setConversationsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Select a conversation and load its messages
  const selectConversation = useCallback(
    async (conv) => {
      if (!conv) return;

      // Persist active conversation ID so refresh keeps the same chat open
      localStorage.setItem('activeConversationId', conv.id);

      // Leave previous room if switching
      if (activeConvRef.current && activeConvRef.current.id !== conv.id) {
        leaveConversation(activeConvRef.current.id);
      }

      setActiveConversation(conv);
      setMobileView('chat');
      setIsOtherUserTyping(false);

      // Join socket room
      joinConversation(conv.id);

      // Load messages
      setMessagesLoading(true);
      try {
        const msgs = await fetchMessages(conv.id);
        setMessages(msgs);
      } catch (err) {
        console.error('Failed to load messages for conversation:', err);
      } finally {
        setMessagesLoading(false);
      }
    },
    [joinConversation, leaveConversation]
  );

  // Step 2 & 3: User clicks "Message" on search result
  // Calls backend to find or create conversation, then selects it
  const handleSelectUserFromSearch = async (targetUser) => {
    try {
      const conv = await getOrCreateDirectConversation(targetUser.id);

      // Update conversations list in state
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        if (exists) {
          return prev.map((c) => (c.id === conv.id ? { ...c, ...conv } : c));
        }
        return [conv, ...prev];
      });

      // Select and open chat
      await selectConversation(conv);
    } catch (err) {
      console.error('Error starting conversation with user:', err);
    }
  };

  // Socket event listeners for real-time messages & typing
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ conversationId, message }) => {
      // If message belongs to currently open conversation
      if (activeConvRef.current && activeConvRef.current.id === conversationId) {
        setMessages((prev) => {
          // Avoid duplicates if optimistic message already present
          if (prev.some((m) => m.id === message.id || m.clientMessageId === message.clientMessageId)) {
            return prev.map((m) =>
              m.clientMessageId === message.clientMessageId ? message : m
            );
          }
          return [...prev, message];
        });
      }

      // Update sidebar conversation snippet and bring to top
      setConversations((prev) => {
        const convIndex = prev.findIndex((c) => c.id === conversationId);
        if (convIndex > -1) {
          const updatedConv = {
            ...prev[convIndex],
            lastMessage: message,
          };
          const nextList = [...prev];
          nextList.splice(convIndex, 1);
          return [updatedConv, ...nextList];
        }
        return prev;
      });
    };

    const handleUserTyping = ({ conversationId }) => {
      if (activeConvRef.current && activeConvRef.current.id === conversationId) {
        setIsOtherUserTyping(true);
      }
    };

    const handleUserStoppedTyping = ({ conversationId }) => {
      if (activeConvRef.current && activeConvRef.current.id === conversationId) {
        setIsOtherUserTyping(false);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
    };
  }, [socket]);

  // Send message handler
  const handleSendMessage = async (content) => {
    if (!activeConversation) return;

    const convId = activeConversation.id;
    try {
      const newMsg = await sendMessageApi(convId, content);

      // Append message locally if not already received from socket
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Update conversation in sidebar
      setConversations((prev) => {
        const convIndex = prev.findIndex((c) => c.id === convId);
        if (convIndex > -1) {
          const updated = { ...prev[convIndex], lastMessage: newMsg };
          const nextList = [...prev];
          nextList.splice(convIndex, 1);
          return [updated, ...nextList];
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleTyping = (isTyping) => {
    if (activeConversation) {
      emitTyping(activeConversation.id, isTyping);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const activeOtherUser = activeConversation?.otherUser;
  const isOtherUserOnline = activeOtherUser && onlineUserIds.has(activeOtherUser.id);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans antialiased">
      {/* ─────────────────────────────────────────────────────────────────────────────
          LEFT SIDEBAR: User info, Search Bar, Conversation List
      ───────────────────────────────────────────────────────────────────────────── */}
      <aside
        className={`w-full md:w-80 lg:w-96 border-r border-slate-800/80 flex flex-col bg-slate-900/95 backdrop-blur-xl shrink-0 transition-transform duration-200 z-20 ${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* User Profile Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3 min-w-0">
            <Avatar
              name={user.name}
              src={user.avatarUrl}
              size="md"
              isOnline={isConnected}
            />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white truncate">{user.name}</p>
              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <p className="text-[11px] text-slate-400 truncate">
                  {isConnected ? 'Connected' : 'Connecting...'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Log out"
          >
            <LogoutRoundedIcon sx={{ fontSize: 19 }} />
          </button>
        </div>

        {/* Step 1: User Search Bar */}
        <div className="pt-2 pb-1 border-b border-slate-800/60">
          <UserSearchBar
            onSelectUser={handleSelectUserFromSearch}
            onlineUserIds={onlineUserIds}
          />
        </div>

        {/* Conversations Heading */}
        <div className="px-4 py-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
          <span>Direct Messages</span>
          <span className="text-[11px] font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {conversations.length}
          </span>
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
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                Search for another user above and click &ldquo;Message&rdquo; to start.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherUser = conv.otherUser;
              const isOnline = otherUser ? onlineUserIds.has(otherUser.id) : false;
              const isActive = activeConversation?.id === conv.id;

              return (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={isActive}
                  isOnline={isOnline}
                  currentUserId={user.id}
                  onClick={() => selectConversation(conv)}
                />
              );
            })
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────────────────────
          RIGHT AREA: Chat window or Empty State
      ───────────────────────────────────────────────────────────────────────────── */}
      <main
        className={`flex-1 flex flex-col bg-slate-950 overflow-hidden ${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        }`}
      >
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 border-b border-slate-800 bg-slate-900/70 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                {/* Mobile back button */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors mr-1"
                >
                  <ArrowBackIcon sx={{ fontSize: 20 }} />
                </button>

                <Avatar
                  name={activeOtherUser?.name || 'User'}
                  src={activeOtherUser?.avatarUrl}
                  size="md"
                  isOnline={isOtherUserOnline}
                />

                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-white truncate">
                    {activeOtherUser?.name || 'Chat'}
                  </h2>
                  <p className="text-xs flex items-center space-x-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOtherUserOnline ? 'bg-emerald-400' : 'bg-slate-500'
                      }`}
                    />
                    <span className={isOtherUserOnline ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                      {isOtherUserOnline ? 'Active now' : 'Offline'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Chat action placeholders */}
              <div className="flex items-center space-x-1 text-slate-400">
                <button className="p-2 hover:bg-slate-800 hover:text-slate-200 rounded-xl transition-colors cursor-pointer">
                  <MoreVertIcon sx={{ fontSize: 20 }} />
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <MessageList
              messages={messages}
              loading={messagesLoading}
              currentUserId={user.id}
              otherUser={activeOtherUser}
              isTyping={isOtherUserTyping}
            />

            {/* Message Input Bar */}
            <MessageInput
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              disabled={messagesLoading}
            />
          </>
        ) : (
          /* Empty State: No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-slate-950 to-slate-900">
            <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-xl shadow-indigo-900/10">
              <ForumRoundedIcon sx={{ fontSize: 40, color: '#818cf8' }} />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to Chatly, {user.name.split(' ')[0]}!
            </h2>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed mb-6">
              Start one-to-one conversations with anyone on your team. Use the search bar on the
              left to find someone by name or email, click &ldquo;Message&rdquo;, and start chatting in real-time.
            </p>

            <div className="flex items-center space-x-2 text-xs text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-4 py-2 rounded-xl">
              <span>💡 Tip: Try searching for &ldquo;Sarah&rdquo;, &ldquo;Alex&rdquo;, or &ldquo;Maya&rdquo;</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
