import React, { useState } from 'react';
import { X, Shield, Check, Info, Lock, UserCheck, AlertTriangle, UserPlus, Trash2 } from 'lucide-react';
import { UserMember, Role, PermissionKey } from '../types';
import {
  ROLE_DEFAULT_PERMISSIONS,
  PERMISSION_METADATA,
  hasPermission,
} from '../lib/permissions';

interface PermissionsModalProps {
  members: UserMember[];
  activeMember?: UserMember;
  onClose: () => void;
  onUpdateMemberPermissions: (
    memberId: string,
    role: Role,
    customPermissions: Partial<Record<PermissionKey, boolean>>
  ) => void;
  onAddMember?: (name: string, email: string, role: Role) => void;
  onDeleteMember?: (memberId: string) => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  members,
  activeMember,
  onClose,
  onUpdateMemberPermissions,
  onAddMember,
  onDeleteMember,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<Role>('member');

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0];
  const canManage = hasPermission(activeMember, 'canManagePermissions');

  const permissionKeys = Object.keys(PERMISSION_METADATA) as PermissionKey[];

  const handleRoleChange = (newRole: Role) => {
    if (!canManage || !selectedMember) return;
    onUpdateMemberPermissions(selectedMember.id, newRole, selectedMember.customPermissions || {});
  };

  const handleTogglePermission = (key: PermissionKey) => {
    if (!canManage || !selectedMember) return;

    const currentCustom = { ...(selectedMember.customPermissions || {}) };
    const currentEffective = hasPermission(selectedMember, key);

    currentCustom[key] = !currentEffective;

    onUpdateMemberPermissions(selectedMember.id, selectedMember.role, currentCustom);
  };

  const handleResetToRoleDefaults = () => {
    if (!canManage || !selectedMember) return;
    onUpdateMemberPermissions(selectedMember.id, selectedMember.role, {});
  };

  const handleCreateMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !onAddMember) return;
    onAddMember(
      newMemberName.trim(),
      newMemberEmail.trim() || `${newMemberName.toLowerCase().replace(/\s+/g, '.')}@project.local`,
      newMemberRole
    );
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('member');
    setIsAddingMember(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Permissions & Access Control
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  canManage
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {canManage ? 'Admin Mode' : 'Read Only'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Define role-based security rules and individual member overrides.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Member Selector Bar (Horizontal Scrollable) */}
        <div className="sm:hidden border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 pl-1">Team:</span>
          {members.map((m) => {
            const isSelected = selectedMember && m.id === selectedMember.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMemberId(m.id)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-transparent shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <img src={m.avatar} alt={m.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                <span className="truncate max-w-[80px]">{m.name}</span>
              </button>
            );
          })}
          {canManage && onAddMember && (
            <button
              onClick={() => setIsAddingMember(!isAddingMember)}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Modal Body: Sidebar (desktop) + Permissions Details */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden text-xs">
          {/* Desktop Member List Sidebar */}
          <div className="hidden sm:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 overflow-y-auto flex-col justify-between shrink-0">
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Team Members ({members.length})
                </span>
                {canManage && onAddMember && (
                  <button
                    onClick={() => setIsAddingMember(!isAddingMember)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                    title="Add team member"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {/* Add Member Form */}
              {isAddingMember && (
                <form
                  onSubmit={handleCreateMemberSubmit}
                  className="mb-3 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-900/50 shadow-xs space-y-2"
                >
                  <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                    New Member
                  </div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as Role)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-1 px-2 rounded-lg bg-indigo-600 text-white font-medium text-center hover:bg-indigo-700"
                    >
                      Invite
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingMember(false)}
                      className="py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1">
                {members.map((m) => {
                  const isSelected = selectedMember && m.id === selectedMember.id;
                  const isOwner = m.id === 'user-1' || m.role === 'owner';
                  return (
                    <div
                      key={m.id}
                      className={`group w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedMemberId(m.id)}
                        className="flex items-center gap-2 truncate flex-1 text-left"
                      >
                        <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {m.name}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">{m.role}</div>
                        </div>
                      </button>
                      {canManage && onDeleteMember && !isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove ${m.name} from workspace?`)) {
                              onDeleteMember(m.id);
                              if (selectedMemberId === m.id) {
                                setSelectedMemberId(members[0]?.id || '');
                              }
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded-md transition"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Member Permission Details & Custom Overrides */}
          <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4">
            {/* Mobile Add Member Form if active */}
            {isAddingMember && (
              <form
                onSubmit={handleCreateMemberSubmit}
                className="sm:hidden p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-2"
              >
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Add New Team Member
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as Role)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 text-white font-medium text-xs text-center hover:bg-indigo-700"
                  >
                    Invite Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="py-1.5 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Top row: Member summary and base role selector */}
            {selectedMember && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <img
                    src={selectedMember.avatar}
                    alt={selectedMember.name}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-indigo-500/20 shrink-0"
                  />
                  <div className="truncate">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                      {selectedMember.name}
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{selectedMember.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-200/80 dark:border-slate-700/80">
                  <label className="text-[11px] font-semibold text-slate-500 shrink-0">Role:</label>
                  <select
                    value={selectedMember.role}
                    disabled={!canManage || selectedMember.id === 'user-1' || selectedMember.email === 'finpro56@gmail.com'}
                    onChange={(e) => handleRoleChange(e.target.value as Role)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize"
                  >
                    <option value="owner">Owner (Full Admin)</option>
                    <option value="admin">Admin (Manager)</option>
                    <option value="member">Member (Contributor)</option>
                    <option value="viewer">Viewer (Read Only)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Granular Capabilities Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                  Permissions Matrix
                </h5>
                {canManage && (
                  <button
                    onClick={handleResetToRoleDefaults}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Reset Defaults
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-800">
                {permissionKeys.map((key) => {
                  const meta = PERMISSION_METADATA[key];
                  const isEffective = selectedMember ? hasPermission(selectedMember, key) : false;
                  const isOverridden =
                    selectedMember?.customPermissions &&
                    selectedMember.customPermissions[key] !== undefined;

                  return (
                    <div
                      key={key}
                      className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <div className="pr-2 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {meta.label}
                          </span>
                          {isOverridden && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                              Override
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">{meta.description}</p>
                      </div>

                      <button
                        type="button"
                        disabled={!canManage || selectedMember?.id === 'user-1'}
                        onClick={() => handleTogglePermission(key)}
                        className={`w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer disabled:cursor-not-allowed shrink-0 ${
                          isEffective ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                            isEffective ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end text-xs shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 sm:py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
