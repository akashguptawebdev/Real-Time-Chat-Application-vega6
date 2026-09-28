import { useState, useEffect, useRef } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import Avatar from '../../components/ui/Avatar.jsx';
import { searchUsers } from './conversationApi.js';

export default function UserSearchBar({ onSelectUser, onlineUserIds = new Set() }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [initiatingId, setInitiatingId] = useState(null);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!isOpen && !query) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const users = await searchUsers(query);
        setResults(users);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleMessageClick = async (user) => {
    setInitiatingId(user.id);
    try {
      await onSelectUser(user);
      setIsOpen(false);
      setQuery('');
    } finally {
      setInitiatingId(null);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full px-3 py-2">
      {/* Search Input Container */}
      <div className="relative flex items-center bg-slate-800/90 rounded-xl px-3 py-2 border border-slate-700/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-sm">
        <SearchIcon sx={{ fontSize: 19, color: '#94a3b8' }} className="shrink-0 mr-2" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search by name or email to chat..."
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 outline-none"
        />
        {loading ? (
          <CircularProgress size={16} sx={{ color: '#818cf8' }} className="shrink-0" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
            title="Clear search"
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </button>
        ) : null}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute left-3 right-3 top-full mt-1.5 z-50 bg-slate-800/95 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-700/40">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>{query ? `Search results for "${query}"` : 'Suggested people'}</span>
            <span className="text-slate-500">{results.length} found</span>
          </div>

          {loading && results.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
              <CircularProgress size={14} sx={{ color: '#818cf8' }} />
              <span>Searching users...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No users found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((user) => {
              const isOnline = onlineUserIds.has(user.id);
              const isInitiating = initiatingId === user.id;

              return (
                <div
                  key={user.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors group"
                >
                  <div className="flex items-center space-x-3 min-w-0 mr-2">
                    <Avatar
                      name={user.name}
                      src={user.avatarUrl}
                      size="md"
                      isOnline={isOnline}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Step 2: Click Message */}
                  <button
                    onClick={() => handleMessageClick(user)}
                    disabled={isInitiating}
                    className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700/50 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
                    title={`Start chat with ${user.name}`}
                  >
                    {isInitiating ? (
                      <>
                        <CircularProgress size={12} sx={{ color: '#ffffff' }} />
                        <span>Opening...</span>
                      </>
                    ) : (
                      <>
                        <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 14 }} />
                        <span>Message</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
