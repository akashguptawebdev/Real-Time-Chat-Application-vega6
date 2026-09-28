import Avatar from '../../components/ui/Avatar.jsx';

function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isMine, showAvatar, otherUser }) {
  const senderName = message.sender?.name || (isMine ? 'You' : otherUser?.name || 'User');
  const senderAvatar = message.sender?.avatarUrl || (isMine ? null : otherUser?.avatarUrl);

  return (
    <div className={`flex items-end gap-2 mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {/* Other user avatar */}
      {!isMine && (
        <div className="w-8 shrink-0 mb-1">
          {showAvatar ? (
            <Avatar name={senderName} src={senderAvatar} size="sm" />
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      {/* Message content */}
      <div
        className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
          isMine
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs'
            : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-xs'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        <div
          className={`flex items-center justify-end mt-1 text-[10px] space-x-1 ${
            isMine ? 'text-indigo-200' : 'text-slate-400'
          }`}
        >
          <span>{formatTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
