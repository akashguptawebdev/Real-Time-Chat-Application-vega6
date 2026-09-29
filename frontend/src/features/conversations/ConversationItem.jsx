import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
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
  const isGroup = conversation.type === 'group';
  const otherUser = conversation.otherUser || {};
  const displayName = isGroup ? conversation.name : otherUser.name || 'Direct Chat';
  const displayAvatar = isGroup ? conversation.avatarUrl : otherUser.avatarUrl;

  const lastMessage = conversation.lastMessage;
  const isMine = lastMessage && lastMessage.senderId === currentUserId;
  const senderName = lastMessage?.sender?.name ? lastMessage.sender.name.split(' ')[0] : 'Member';

  const memberCount = conversation.members?.length || 0;
  const myRole = conversation.myRole;
  const unreadCount = Number(conversation.unreadCount) || 0;
  const hasUnread = unreadCount > 0 && !isActive;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl flex items-center space-x-3 transition-all relative group cursor-pointer ${
        isActive
          ? 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-sm'
          : hasUnread
          ? 'bg-indigo-950/40 border border-indigo-500/30 text-white shadow-sm hover:bg-indigo-900/50'
          : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'
      }`}
    >
      {/* Active Left Indicator Bar */}
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full" />
      )}

      {/* Avatar with icon or live status */}
      <div className="relative shrink-0">
        <Avatar
          name={displayName}
          src={displayAvatar}
          size="md"
          isOnline={!isGroup ? isOnline : undefined}
          className="shrink-0"
        />
        {isGroup && (
          <span
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400"
            title="Group Chat"
          >
            <GroupsRoundedIcon sx={{ fontSize: 10 }} />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center space-x-1.5 min-w-0 mr-1">
            <p
              className={`text-sm font-semibold truncate ${
                isActive
                  ? 'text-indigo-200'
                  : hasUnread
                  ? 'text-white'
                  : 'text-slate-200 group-hover:text-white'
              }`}
            >
              {displayName}
            </p>
            {isGroup && myRole && (
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border shrink-0 ${
                  myRole === 'OWNER'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : myRole === 'ADMIN'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700/60'
                }`}
              >
                {myRole}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-1">
            <span className={`text-[11px] ${hasUnread ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
              {formatTimestamp(lastMessage?.created_at || conversation.created_at)}
            </span>
            {/* Unread Badge */}
            {hasUnread && (
              <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-indigo-600 text-white text-[11px] font-bold px-1.5 shadow-md shadow-indigo-600/50 ring-2 ring-indigo-400/30">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>

        {/* Last message snippet or member count */}
        <p className={`text-xs truncate ${hasUnread ? 'text-indigo-200 font-semibold' : 'text-slate-400'}`}>
          {lastMessage ? (
            <>
              {isMine ? (
                <span className="text-slate-400 font-medium">You: </span>
              ) : isGroup ? (
                <span className={`${hasUnread ? 'text-indigo-300/90' : 'text-indigo-300/80'} font-medium`}>{senderName}: </span>
              ) : null}
              <span>
                {lastMessage.content
                  ? lastMessage.content
                  : lastMessage.messageType === 'image'
                  ? '📷 Photo'
                  : lastMessage.messageType === 'file'
                  ? `📎 ${lastMessage.fileName || 'Attachment'}`
                  : ''}
              </span>
            </>
          ) : isGroup ? (
            <span className="italic text-slate-400">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          ) : (
            <span className="italic text-slate-400">No messages yet</span>
          )}
        </p>
      </div>
    </button>
  );
}
