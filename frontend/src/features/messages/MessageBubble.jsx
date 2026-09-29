import { useState, useRef, useEffect } from 'react';
import Avatar from '../../components/ui/Avatar.jsx';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const DELETE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function formatTime(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function groupReactions(reactions = []) {
  const map = {};
  reactions.forEach((r) => {
    if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
    map[r.emoji].count++;
    map[r.emoji].users.push(r.user?.name || 'Someone');
  });
  return Object.values(map);
}

export default function MessageBubble({
  message,
  isMine,
  showAvatar,
  otherUser,
  conversationId,
  conversationType,
  currentUserId,
  activeMembers,
  onEdit,
  onDelete,
  onReact,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || '');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const editRef = useRef(null);
  const actionsRef = useRef(null);

  const senderName = message.sender?.name || (isMine ? 'You' : otherUser?.name || 'User');
  const senderAvatar = message.sender?.avatarUrl || (isMine ? null : otherUser?.avatarUrl);
  const isDeleted = !!message.deletedAt;
  const isEdited = !!message.editedAt;
  const canDelete = isMine && !isDeleted && Date.now() - new Date(message.created_at).getTime() < DELETE_WINDOW_MS;
  const canEdit = isMine && !isDeleted && message.messageType !== 'image' && message.messageType !== 'file';

  const grouped = groupReactions(message.reactions || []);

  // "Seen by X of Y" for group chats
  const readCount = message.receipts?.filter((r) => r.readAt && r.userId !== message.senderId).length || 0;
  const totalOthers = activeMembers ? activeMembers.filter((m) => m.userId !== message.senderId).length : 0;
  const showSeenBy = conversationType === 'group' && isMine && totalOthers > 0 && readCount > 0;

  // Read status icon for 1-to-1
  const isRead = message.readAt;
  const showReadStatus = conversationType === 'direct' && isMine && !isDeleted;

  const isImage = message.messageType === 'image' || (message.fileMimeType && message.fileMimeType.startsWith('image/'));
  const isFile = message.messageType === 'file' || (message.fileUrl && !isImage);

  // Close actions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) {
        setShowActions(false);
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleEdit = async () => {
    if (!editText.trim() || editText.trim() === message.content) {
      setIsEditing(false);
      return;
    }
    await onEdit?.(message.id, editText.trim());
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this message for everyone?')) {
      await onDelete?.(message.id);
    }
    setShowActions(false);
  };

  const handleReact = (emoji) => {
    onReact?.(message.id, emoji);
    setShowEmojiPicker(false);
    setShowActions(false);
  };

  return (
    <>
      <div
        className={`flex items-end gap-2 mb-2 group relative ${isMine ? 'justify-end' : 'justify-start'}`}
        onMouseEnter={() => !isDeleted && setShowActions(true)}
        onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
      >
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

        <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[70%]`}>
          {/* Sender name (groups, not-mine messages) */}
          {!isMine && conversationType === 'group' && showAvatar && (
            <span className="text-[11px] text-indigo-400 font-medium mb-0.5 ml-1">{senderName}</span>
          )}

          <div className="relative" ref={actionsRef}>
            {/* Action toolbar (hover) */}
            {showActions && !isDeleted && !isEditing && (
              <div
                className={`absolute top-0 flex items-center gap-0.5 z-20 ${
                  isMine ? 'right-full mr-1' : 'left-full ml-1'
                }`}
              >
                {/* Quick emoji */}
                <button
                  onClick={() => setShowEmojiPicker((p) => !p)}
                  className="p-1.5 rounded-lg bg-slate-700/90 hover:bg-slate-600 text-slate-300 hover:text-yellow-300 transition-all shadow text-xs cursor-pointer"
                  title="React"
                >
                  <EmojiEmotionsOutlinedIcon sx={{ fontSize: 15 }} />
                </button>

                {canEdit && (
                  <button
                    onClick={() => { setIsEditing(true); setShowActions(false); setTimeout(() => editRef.current?.focus(), 50); }}
                    className="p-1.5 rounded-lg bg-slate-700/90 hover:bg-slate-600 text-slate-300 hover:text-indigo-300 transition-all shadow cursor-pointer"
                    title="Edit"
                  >
                    <EditRoundedIcon sx={{ fontSize: 14 }} />
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-lg bg-slate-700/90 hover:bg-slate-600 text-slate-300 hover:text-red-400 transition-all shadow cursor-pointer"
                    title="Delete for everyone"
                  >
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                  </button>
                )}

                {/* Emoji quick picker */}
                {showEmojiPicker && (
                  <div className={`absolute top-full mt-1 flex gap-1 bg-slate-700/95 backdrop-blur-sm rounded-xl px-2 py-1.5 shadow-xl border border-slate-600/60 z-30 ${isMine ? 'right-0' : 'left-0'}`}>
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => handleReact(e)}
                        className="text-base hover:scale-125 transition-transform cursor-pointer leading-none"
                        title={e}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message bubble */}
            {isDeleted ? (
              <div className="rounded-2xl px-4 py-2.5 bg-slate-800/60 border border-slate-700/40 text-slate-500 italic text-sm">
                This message was deleted
              </div>
            ) : isEditing ? (
              <div className="flex flex-col gap-1 min-w-[220px]">
                <textarea
                  ref={editRef}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                    if (e.key === 'Escape') { setIsEditing(false); setEditText(message.content); }
                  }}
                  rows={2}
                  className="w-full bg-slate-700 text-slate-100 text-sm rounded-xl px-3 py-2 outline-none resize-none border border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30"
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => { setIsEditing(false); setEditText(message.content); }} className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-700 cursor-pointer">Cancel</button>
                  <button onClick={handleEdit} className="text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer">
                    <CheckRoundedIcon sx={{ fontSize: 12 }} /> Save
                  </button>
                </div>
              </div>
            ) : isImage ? (
              /* Image Message Bubble */
              <div
                className={`rounded-2xl p-1.5 shadow-sm transition-all overflow-hidden ${
                  isMine
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-sm'
                }`}
              >
                <div
                  onClick={() => setLightboxOpen(true)}
                  className="cursor-pointer group/img relative rounded-xl overflow-hidden max-w-sm max-h-80 bg-black/20"
                >
                  <img
                    src={message.fileUrl}
                    alt={message.fileName || 'Shared image'}
                    className="w-full h-full object-cover rounded-xl hover:opacity-95 transition-opacity"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium">
                    Click to view
                  </div>
                </div>

                {message.content && (
                  <p className="text-sm px-2 pt-2 pb-1 whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </p>
                )}

                <div className={`flex items-center justify-end px-2 pt-1 gap-1 text-[10px] ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
                  <span>{formatTime(message.created_at)}</span>
                  {showReadStatus && (
                    isRead
                      ? <DoneAllRoundedIcon sx={{ fontSize: 12 }} className="text-sky-300" titleAccess="Read" />
                      : <CheckRoundedIcon sx={{ fontSize: 12 }} className="opacity-60" titleAccess="Sent" />
                  )}
                </div>
              </div>
            ) : isFile ? (
              /* Document / File Message Bubble */
              <div
                className={`rounded-2xl p-3 shadow-sm transition-all min-w-[220px] max-w-sm ${
                  isMine
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-sm'
                }`}
              >
                <a
                  href={message.fileUrl}
                  download={message.fileName || 'download'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                    isMine
                      ? 'bg-indigo-700/60 hover:bg-indigo-700/80 border-indigo-500/40 text-white'
                      : 'bg-slate-750 hover:bg-slate-700 border-slate-600/60 text-slate-100'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/30 text-indigo-200 flex items-center justify-center shrink-0">
                    {message.fileMimeType === 'application/pdf' ? (
                      <PictureAsPdfRoundedIcon sx={{ fontSize: 24 }} />
                    ) : (
                      <DescriptionRoundedIcon sx={{ fontSize: 24 }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight">{message.fileName || 'Attachment'}</p>
                    <p className={`text-[10px] ${isMine ? 'text-indigo-200' : 'text-slate-400'} mt-0.5`}>
                      {formatBytes(message.fileSize)}
                    </p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30 shrink-0 text-white">
                    <DownloadRoundedIcon sx={{ fontSize: 16 }} />
                  </div>
                </a>

                {message.content && (
                  <p className="text-sm pt-2 whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </p>
                )}

                <div className={`flex items-center justify-end mt-1 gap-1 text-[10px] ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
                  <span>{formatTime(message.created_at)}</span>
                  {showReadStatus && (
                    isRead
                      ? <DoneAllRoundedIcon sx={{ fontSize: 12 }} className="text-sky-300" titleAccess="Read" />
                      : <CheckRoundedIcon sx={{ fontSize: 12 }} className="opacity-60" titleAccess="Sent" />
                  )}
                </div>
              </div>
            ) : (
              /* Regular Text Message Bubble */
              <div
                className={`rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
                  isMine
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-bl-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                <div className={`flex items-center justify-end mt-1 gap-1 text-[10px] ${isMine ? 'text-indigo-200' : 'text-slate-400'}`}>
                  <span>{formatTime(message.created_at)}</span>
                  {isEdited && <span className="italic opacity-70">edited</span>}
                  {/* Read status icons for 1-to-1 */}
                  {showReadStatus && (
                    isRead
                      ? <DoneAllRoundedIcon sx={{ fontSize: 12 }} className="text-sky-300" titleAccess="Read" />
                      : <CheckRoundedIcon sx={{ fontSize: 12 }} className="opacity-60" titleAccess="Sent" />
                  )}
                </div>
              </div>
            )}

            {/* Reaction pills */}
            {!isDeleted && grouped.length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {grouped.map(({ emoji, count, users }) => {
                  const iReacted = (message.reactions || []).some(
                    (r) => r.emoji === emoji && r.userId === currentUserId
                  );
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      title={users.join(', ')}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-all cursor-pointer ${
                        iReacted
                          ? 'bg-indigo-500/30 border-indigo-500/60 text-indigo-200'
                          : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span>{emoji}</span>
                      {count > 1 && <span className="font-semibold">{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Seen by X of Y (group) */}
            {showSeenBy && (
              <span className="text-[10px] text-slate-500 mt-0.5 text-right block">
                Seen by {readCount} of {totalOthers}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <a
                href={message.fileUrl}
                download={message.fileName || 'image'}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white shadow-lg transition-colors cursor-pointer"
                title="Download original"
              >
                <DownloadRoundedIcon sx={{ fontSize: 20 }} />
              </a>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white shadow-lg transition-colors cursor-pointer"
                title="Close"
              >
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>

            <img
              src={message.fileUrl}
              alt={message.fileName || 'Shared image'}
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            />
            {message.fileName && (
              <p className="mt-2 text-xs text-slate-300 font-medium">{message.fileName}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
