import { useEffect, useRef, useCallback } from 'react';
import MessageBubble from './MessageBubble.jsx';
import Avatar from '../../components/ui/Avatar.jsx';
import CircularProgress from '@mui/material/CircularProgress';

export default function MessageList({
  messages = [],
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  currentUserId,
  otherUser,
  isTyping,
  conversationId,
  conversationType = 'direct',
  activeMembers = [],
  onEditMessage,
  onDeleteMessage,
  onReactMessage,
}) {
  const bottomRef = useRef(null);
  const topSentinelRef = useRef(null);
  const containerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  // Auto-scroll to bottom on first load or new messages (not when loading older ones)
  useEffect(() => {
    if (!loadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isTyping, loadingMore]);

  // Preserve scroll position when older messages are prepended
  useEffect(() => {
    if (!loadingMore && containerRef.current) {
      const prevHeight = prevScrollHeightRef.current;
      if (prevHeight > 0) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight - prevHeight;
        prevScrollHeightRef.current = 0;
      }
    }
  }, [messages, loadingMore]);

  // IntersectionObserver for infinite scroll upward
  const handleTopSentinel = useCallback(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && onLoadMore) {
        if (containerRef.current) {
          prevScrollHeightRef.current = containerRef.current.scrollHeight;
        }
        onLoadMore();
      }
    },
    [hasMore, loadingMore, onLoadMore]
  );

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleTopSentinel, {
      root: containerRef.current,
      threshold: 0.1,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleTopSentinel]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center space-y-2">
          <CircularProgress size={24} sx={{ color: '#818cf8' }} />
          <span className="text-xs">Loading conversation history...</span>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-4">
          <Avatar name={otherUser?.name || 'Conversation'} src={otherUser?.avatarUrl} size="xl" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">
          {otherUser?.name ? `Chat with ${otherUser.name}` : 'New Conversation'}
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mb-4">
          {otherUser?.email || 'Send your first message to begin the chat.'}
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs shadow-sm">
          <span>Say hello! 👋</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1">
      {/* Top sentinel — triggers load of older messages */}
      <div ref={topSentinelRef} className="flex justify-center py-1">
        {loadingMore ? (
          <CircularProgress size={18} sx={{ color: '#818cf8' }} />
        ) : hasMore ? (
          <span className="text-[11px] text-slate-500 italic">Scroll up for more</span>
        ) : null}
      </div>

      {messages.map((message, index) => {
        const isMine = message.senderId === currentUserId;
        const prevMessage = messages[index - 1];
        const nextMessage = messages[index + 1];
        const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;
        const showDateSeparator =
          !prevMessage ||
          new Date(prevMessage.created_at).toDateString() !==
            new Date(message.created_at).toDateString();

        return (
          <div key={message.id || message.clientMessageId || index}>
            {showDateSeparator && (
              <div className="flex items-center justify-center my-4">
                <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/50">
                  {new Date(message.created_at).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}

            <MessageBubble
              message={message}
              isMine={isMine}
              showAvatar={isLastInGroup}
              otherUser={otherUser}
              conversationId={conversationId}
              conversationType={conversationType}
              currentUserId={currentUserId}
              activeMembers={activeMembers}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onReact={onReactMessage}
            />
          </div>
        );
      })}

      {/* Typing indicator */}
      {isTyping && (
        <div className="flex items-center space-x-2 text-slate-400 text-xs py-1">
          <Avatar name={otherUser?.name || 'User'} src={otherUser?.avatarUrl} size="xs" />
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl px-3 py-2 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
          </div>
          <span className="text-[11px] text-slate-400">{otherUser?.name || 'User'} is typing...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
