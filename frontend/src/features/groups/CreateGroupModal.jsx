import { useState, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CircularProgress from '@mui/material/CircularProgress';
import Avatar from '../../components/ui/Avatar.jsx';
import { searchUsers, createGroupApi } from '../conversations/conversationApi.js';

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated, currentUserId }) {
  const [name, setName] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load available users when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setName('');
    setSelectedUserIds(new Set());
    setLoadingUsers(true);

    searchUsers('')
      .then((data) => {
        setUsers(data.filter((u) => u.id !== currentUserId));
      })
      .catch((err) => {
        console.error('Failed to load users for group:', err);
      })
      .finally(() => {
        setLoadingUsers(false);
      });
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const newGroup = await createGroupApi({
        name: name.trim(),
        memberIds: Array.from(selectedUserIds),
      });

      onGroupCreated(newGroup);
      onClose();
    } catch (err) {
      console.error('Group creation failed:', err);
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <GroupsRoundedIcon sx={{ fontSize: 18 }} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Create New Group</h3>
              <p className="text-[11px] text-slate-400">You will be the group Owner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Group Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Systems, Project Alpha"
              className="w-full bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Member Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Add Members
              </label>
              <span className="text-[11px] text-indigo-400 font-medium">
                {selectedUserIds.size} selected
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl max-h-52 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/40">
              {loadingUsers ? (
                <div className="p-6 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
                  <CircularProgress size={14} sx={{ color: '#818cf8' }} />
                  <span>Loading team members...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No other users available to add.
                </div>
              ) : (
                users.map((u) => {
                  const isSelected = selectedUserIds.has(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-600/15 hover:bg-indigo-600/20'
                          : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 mr-2">
                        <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-700 bg-slate-800'
                        }`}
                      >
                        {isSelected && <CheckRoundedIcon sx={{ fontSize: 14 }} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center space-x-1.5"
            >
              {submitting ? (
                <>
                  <CircularProgress size={14} sx={{ color: '#ffffff' }} />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Group</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
