import Avatar from '../../components/ui/Avatar.jsx';

function formatTimestamp(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export default function ConversationItem({
  conversation,
  isActive,
  onClick,
  isOnline = false,
  currentUserId,
}) {
  const otherUser = conversation.otherUser || {};
  const displayName = otherUser.name || conversation.name || 'Direct Chat';
  const displayAvatar = otherUser.avatarUrl || conversation.avatarUrl;

  const lastMessage = conversation.lastMessage;
  const isMine = lastMessage && lastMessage.senderId === currentUserId;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl flex items-center space-x-3 transition-all relative group ${
        isActive
          ? 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-sm'
          : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'
      }`}
    >
      {/* Active Left Indicator Bar */}
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full" />
      )}

      {/* Avatar with live status */}
      <Avatar
        name={displayName}
        src={displayAvatar}
        size="md"
        isOnline={isOnline}
        className="shrink-0"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p
            className={`text-sm font-semibold truncate ${
              isActive ? 'text-indigo-200' : 'text-slate-200 group-hover:text-white'
            }`}
          >
            {displayName}
          </p>
          <span className="text-[11px] text-slate-400 shrink-0 ml-2">
            {formatTimestamp(lastMessage?.created_at || conversation.created_at)}
          </span>
        </div>

        {/* Last message snippet */}
        <p className="text-xs text-slate-400 truncate">
          {lastMessage ? (
            <>
              {isMine && <span className="text-slate-400 font-medium">You: </span>}
              <span>{lastMessage.content}</span>
            </>
          ) : (
            <span className="italic text-slate-400">No messages yet</span>
          )}
        </p>
      </div>
    </button>
  );
}
