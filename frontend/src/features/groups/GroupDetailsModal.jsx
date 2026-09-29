import { useState, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ExitToAppRoundedIcon from '@mui/icons-material/ExitToAppRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import CircularProgress from '@mui/material/CircularProgress';

import Avatar from '../../components/ui/Avatar.jsx';
import {
  getGroupDetailsApi,
  updateGroupApi,
  addGroupMembersApi,
  removeGroupMemberApi,
  updateMemberRoleApi,
  transferOwnershipApi,
  deleteGroupApi,
  leaveGroupApi,
  searchUsers,
} from '../conversations/conversationApi.js';

export default function GroupDetailsModal({
  isOpen,
  onClose,
  groupId,
  currentUserId,
  onGroupUpdated,
  onGroupDeleted,
  onLeftGroup,
}) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing group name
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Adding members
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedAddUserId, setSelectedAddUserId] = useState('');
  const [addingMemberLoading, setAddingMemberLoading] = useState(false);

  // Action in progress
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Delete group confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadDetails = async () => {
    if (!groupId) return;
    setLoading(true);
    setError('');
    try {
      const data = await getGroupDetailsApi(groupId);
      setGroup(data);
      setNameInput(data.name || '');
    } catch (err) {
      console.error('Failed to load group details:', err);
      setError(err.response?.data?.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && groupId) {
      loadDetails();
      setIsEditingName(false);
      setIsAddingMember(false);
    }
  }, [isOpen, groupId]);

  if (!isOpen) return null;

  const myRole = group?.myRole || 'MEMBER';
  const isOwner = myRole === 'OWNER';
  const isAdmin = myRole === 'ADMIN';
  const canManageMembers = isOwner || isAdmin;

  // Save new group name
  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === group.name) {
      setIsEditingName(false);
      return;
    }

    setSavingName(true);
    setError('');
    try {
      const updated = await updateGroupApi(groupId, { name: nameInput.trim() });
      setGroup((prev) => ({ ...prev, name: updated.name }));
      setIsEditingName(false);
      onGroupUpdated?.({ id: groupId, name: updated.name });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  // Open add member dropdown
  const handleOpenAddMember = async () => {
    setIsAddingMember(true);
    setError('');
    try {
      const allUsers = await searchUsers('');
      const currentMemberIds = new Set((group?.members || []).map((m) => m.userId));
      const notMembers = allUsers.filter((u) => !currentMemberIds.has(u.id));
      setAvailableUsers(notMembers);
      if (notMembers.length > 0) setSelectedAddUserId(notMembers[0].id);
    } catch (err) {
      console.error('Failed to load users to add:', err);
    }
  };

  // Confirm add member
  const handleAddMember = async () => {
    if (!selectedAddUserId) return;
    setAddingMemberLoading(true);
    setError('');
    try {
      await addGroupMembersApi(groupId, [selectedAddUserId]);
      await loadDetails();
      setIsAddingMember(false);
      setSuccess('Member added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMemberLoading(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberUserId) => {
    setActionLoadingId(memberUserId);
    setError('');
    try {
      await removeGroupMemberApi(groupId, memberUserId);
      await loadDetails();
      setSuccess('Member removed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Promote / Demote admin
  const handleToggleRole = async (memberUserId, currentRole) => {
    const nextRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    setActionLoadingId(memberUserId);
    setError('');
    try {
      await updateMemberRoleApi(groupId, memberUserId, nextRole);
      await loadDetails();
      setSuccess(`Member role updated to ${nextRole}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update member role');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Transfer ownership
  const handleTransferOwnership = async (newOwnerId, newOwnerName) => {
    setActionLoadingId(newOwnerId);
    setError('');
    try {
      await transferOwnershipApi(groupId, newOwnerId);
      await loadDetails();
      setSuccess(`Ownership transferred to ${newOwnerName}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to transfer ownership');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }

    setActionLoadingId('delete');
    setError('');
    try {
      await deleteGroupApi(groupId);
      onGroupDeleted?.(groupId);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete group');
      setActionLoadingId(null);
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    setActionLoadingId('leave');
    setError('');
    try {
      await leaveGroupApi(groupId);
      onLeftGroup?.(groupId);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave group');
      setActionLoadingId(null);
    }
  };

  const members = group?.members || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-base text-white">Group Info</h3>
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                isOwner
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : isAdmin
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-slate-700/50 text-slate-300 border-slate-600/40'
              }`}
            >
              Your Role: {myRole}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
              {success}
            </div>
          )}

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <CircularProgress size={24} sx={{ color: '#818cf8' }} />
              <span className="text-xs">Loading group details...</span>
            </div>
          ) : (
            <>
              {/* Group Name & Stats */}
              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                  <Avatar name={group.name} src={group.avatarUrl} size="lg" />
                  <div className="min-w-0 flex-1">
                    {isEditingName ? (
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="bg-slate-900 border border-indigo-500 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none flex-1"
                        />
                        <button
                          onClick={handleSaveName}
                          disabled={savingName}
                          className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                        >
                          {savingName ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CheckRoundedIcon sx={{ fontSize: 16 }} />}
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          className="p-1.5 text-slate-400 hover:text-white"
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-base text-white truncate">{group.name}</h4>
                        {canManageMembers && (
                          <button
                            onClick={() => setIsEditingName(true)}
                            className="text-slate-400 hover:text-indigo-300 p-0.5 rounded transition-colors"
                            title="Edit group name"
                          >
                            <EditRoundedIcon sx={{ fontSize: 15 }} />
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Members Section */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Group Members ({members.length})
                  </span>
                  {canManageMembers && !isAddingMember && (
                    <button
                      onClick={handleOpenAddMember}
                      className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      <PersonAddAlt1RoundedIcon sx={{ fontSize: 14 }} />
                      <span>Add Member</span>
                    </button>
                  )}
                </div>

                {/* Add Member inline form */}
                {isAddingMember && (
                  <div className="p-3 mb-3 bg-indigo-950/40 border border-indigo-800/50 rounded-xl space-y-2">
                    <p className="text-xs font-medium text-indigo-300">Select user to add to group:</p>
                    {availableUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No available users to add.</p>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedAddUserId}
                          onChange={(e) => setSelectedAddUserId(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg p-2 outline-none"
                        >
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddMember}
                          disabled={addingMemberLoading}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                        >
                          {addingMemberLoading ? 'Adding...' : 'Add'}
                        </button>
                        <button
                          onClick={() => setIsAddingMember(false)}
                          className="px-2 py-1.5 text-slate-400 hover:text-white text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Member List */}
                <div className="border border-slate-800 rounded-xl divide-y divide-slate-800/80 max-h-60 overflow-y-auto bg-slate-950/40">
                  {members.map((member) => {
                    const isSelf = member.userId === currentUserId;
                    const u = member.user || {};
                    const role = member.role;
                    const isTargetOwner = role === 'OWNER';
                    const isTargetAdmin = role === 'ADMIN';
                    const isActionLoading = actionLoadingId === member.userId;

                    // Permission rules for actions on this target member:
                    // 1. Can remove:
                    //    - Owner can remove anyone except themselves.
                    //    - Admin can remove regular Member (cannot remove Owner or another Admin).
                    const canRemoveThis =
                      !isSelf &&
                      ((isOwner && !isTargetOwner) || (isAdmin && !isTargetOwner && !isTargetAdmin));

                    // 2. Can promote/demote:
                    //    - Only Owner can promote/demote (cannot demote self).
                    const canPromoteDemoteThis = isOwner && !isSelf && !isTargetOwner;

                    // 3. Can transfer ownership:
                    //    - Only Owner can transfer ownership to another member.
                    const canTransferThis = isOwner && !isSelf;

                    return (
                      <div
                        key={member.userId}
                        className="p-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
                      >
                        {/* User identity & Role badge */}
                        <div className="flex items-center space-x-3 min-w-0 mr-2">
                          <Avatar name={u.name || 'User'} src={u.avatarUrl} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <p className="text-xs font-semibold text-white truncate">
                                {u.name || 'User'}
                              </p>
                              {isSelf && (
                                <span className="text-[10px] text-slate-500 font-normal">(You)</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>

                        {/* Role Badge + Action Buttons */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {/* Role Badge */}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isTargetOwner
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : isTargetAdmin
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700/60'
                            }`}
                          >
                            {role}
                          </span>

                          {/* Owner Actions: Promote/Demote */}
                          {canPromoteDemoteThis && (
                            <button
                              onClick={() => handleToggleRole(member.userId, role)}
                              disabled={isActionLoading}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
                              title={role === 'ADMIN' ? 'Demote to Member' : 'Promote to Admin'}
                            >
                              {role === 'ADMIN' ? 'Demote' : 'Make Admin'}
                            </button>
                          )}

                          {/* Owner Actions: Transfer Ownership */}
                          {canTransferThis && (
                            <button
                              onClick={() => handleTransferOwnership(member.userId, u.name)}
                              disabled={isActionLoading}
                              className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Transfer Ownership"
                            >
                              <SecurityRoundedIcon sx={{ fontSize: 16 }} />
                            </button>
                          )}

                          {/* Admin / Owner Actions: Remove Member */}
                          {canRemoveThis && (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              disabled={isActionLoading}
                              className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Remove from group"
                            >
                              <CloseIcon sx={{ fontSize: 15 }} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Danger Zone: Delete group or Leave group */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                {isOwner ? (
                  <button
                    onClick={handleDeleteGroup}
                    disabled={actionLoadingId === 'delete'}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      confirmDelete
                        ? 'bg-red-600 text-white border-red-500 animate-pulse'
                        : 'bg-red-600/10 hover:bg-red-600/20 border-red-500/30 text-red-400'
                    }`}
                  >
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
                    <span>
                      {actionLoadingId === 'delete'
                        ? 'Deleting...'
                        : confirmDelete
                        ? 'Click Again to Confirm Delete'
                        : 'Delete Group'}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleLeaveGroup}
                    disabled={actionLoadingId === 'leave'}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-600/10 hover:border-red-500/30 hover:text-red-400 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <ExitToAppRoundedIcon sx={{ fontSize: 15 }} />
                    <span>{actionLoadingId === 'leave' ? 'Leaving...' : 'Leave Group'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
