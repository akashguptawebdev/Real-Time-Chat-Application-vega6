import { useState, useRef, useEffect } from 'react';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CircularProgress from '@mui/material/CircularProgress';

export default function MessageInput({ onSendMessage, disabled, onTyping }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Focus input when ready
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleChange = (e) => {
    setText(e.target.value);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const content = text.trim();
    if (!content || sending || disabled) return;

    if (onTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping(false);
    }

    setSending(true);
    try {
      await onSendMessage(content);
      setText('');
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md flex items-center gap-2"
    >
      <div className="flex-1 relative flex items-center bg-slate-800/90 rounded-2xl px-4 py-2.5 border border-slate-700/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Press Enter to send)"
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 outline-none resize-none max-h-32 leading-5"
          style={{ height: 'auto' }}
        />
      </div>

      <button
        type="submit"
        disabled={!text.trim() || sending || disabled}
        className="w-11 h-11 shrink-0 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        title="Send message"
      >
        {sending ? (
          <CircularProgress size={18} sx={{ color: '#ffffff' }} />
        ) : (
          <SendRoundedIcon sx={{ fontSize: 19 }} />
        )}
      </button>
    </form>
  );
}
