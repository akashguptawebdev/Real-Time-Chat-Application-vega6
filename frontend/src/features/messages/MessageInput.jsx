import { useState, useRef, useEffect } from 'react';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import CircularProgress from '@mui/material/CircularProgress';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;  // 25 MB

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/svg+xml', 'image/bmp',
]);

const ALLOWED_DOC_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]);

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function MessageInput({ onSendMessage, onSendFile, disabled, onTyping }) {
  const [text, setText] = useState('');
  const [stagedFile, setStagedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState('');
  const [sending, setSending] = useState(false);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Focus input when ready
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  // Clean up object URL when staged file changes/unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validateAndStageFile = (file) => {
    setFileError('');
    if (!file) return;

    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isDoc = ALLOWED_DOC_TYPES.has(file.type);

    if (!isImage && !isDoc) {
      setFileError('Unsupported file type. Please upload images (PNG, JPG, GIF, WebP) or documents (PDF, DOCX, TXT, ZIP).');
      return;
    }

    if (isImage && file.size > MAX_IMAGE_SIZE) {
      setFileError(`Image size exceeds the 10 MB limit (${formatBytes(file.size)}).`);
      return;
    }

    if (!isImage && file.size > MAX_FILE_SIZE) {
      setFileError(`File size exceeds the 25 MB limit (${formatBytes(file.size)}).`);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (isImage) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }

    setStagedFile(file);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) validateAndStageFile(file);
    e.target.value = ''; // reset so user can re-pick same file
  };

  const removeStagedFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStagedFile(null);
    setPreviewUrl(null);
    setFileError('');
  };

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

    if ((!content && !stagedFile) || sending || disabled) return;

    if (onTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping(false);
    }

    setSending(true);
    setFileError('');
    try {
      if (stagedFile) {
        if (onSendFile) {
          await onSendFile(stagedFile, content);
        }
        removeStagedFile();
        setText('');
      } else {
        await onSendMessage(content);
        setText('');
      }
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      console.error('Failed to send:', err);
      setFileError(err.response?.data?.message || 'Failed to send message. Please try again.');
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

  const isImageFile = stagedFile && ALLOWED_IMAGE_TYPES.has(stagedFile.type);

  return (
    <div className="bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md">
      {/* File Validation Error Banner */}
      {fileError && (
        <div className="px-4 py-2 bg-red-950/70 border-b border-red-800/60 text-red-200 text-xs flex items-center justify-between">
          <span className="font-medium">{fileError}</span>
          <button
            onClick={() => setFileError('')}
            className="text-red-400 hover:text-red-200 p-0.5 rounded cursor-pointer"
          >
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </button>
        </div>
      )}

      {/* Staged File Preview Banner */}
      {stagedFile && (
        <div className="px-4 py-2.5 bg-slate-800/70 border-b border-slate-700/60 flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            {isImageFile && previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                className="w-12 h-12 rounded-xl object-cover border border-indigo-500/40 shadow-sm shrink-0"
              />
            ) : stagedFile.type === 'application/pdf' ? (
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                <PictureAsPdfRoundedIcon sx={{ fontSize: 22 }} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <DescriptionRoundedIcon sx={{ fontSize: 22 }} />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate">{stagedFile.name}</p>
              <p className="text-[11px] text-slate-400">{formatBytes(stagedFile.size)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={removeStagedFile}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Remove attachment"
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 flex items-center gap-2">
        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        />
        <input
          ref={imageInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*"
        />

        {/* Attachment Buttons */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={disabled || sending}
            onClick={() => imageInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
            title="Attach image (max 10MB)"
          >
            <ImageRoundedIcon sx={{ fontSize: 20 }} />
          </button>
          <button
            type="button"
            disabled={disabled || sending}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
            title="Attach document (max 25MB)"
          >
            <AttachFileRoundedIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative flex items-center bg-slate-800/90 rounded-2xl px-4 py-2.5 border border-slate-700/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={stagedFile ? 'Add a caption... (optional)' : 'Type a message... (Press Enter to send)'}
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 outline-none resize-none max-h-32 leading-5"
            style={{ height: 'auto' }}
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!text.trim() && !stagedFile) || sending || disabled}
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
    </div>
  );
}
