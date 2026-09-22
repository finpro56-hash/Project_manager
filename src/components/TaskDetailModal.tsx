import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  User,
  Tag,
  CheckSquare,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  Eye,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskTag,
  UserMember,
  ChecklistItem,
  ActivePresence,
} from '../types';
import { hasPermission, canModifyTask } from '../lib/permissions';
import { syncEngine } from '../lib/syncEngine';

interface TaskDetailModalProps {
  task: Task;
  tags: TaskTag[];
  members: UserMember[];
  activeMember?: UserMember;
  presences: ActivePresence[];
  onClose: () => void;
  onUpdateTask: (updated: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddComment: (content: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  tags,
  members,
  activeMember,
  presences,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onAddComment,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId || '');
  const [dueDate, setDueDate] = useState<string>(task.dueDate || '');
  const [estimatedHours, setEstimatedHours] = useState<number>(task.estimatedHours || 0);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(task.tagIds || []);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist || []);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [commentText, setCommentText] = useState('');

  // Notify server that active user is inspecting this task
  useEffect(() => {
    syncEngine.setCurrentTaskId(task.id);
    return () => {
      syncEngine.setCurrentTaskId(null);
    };
  }, [task.id]);

  // Keep local fields in sync if task updates remotely
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeId(task.assigneeId || '');
    setDueDate(task.dueDate || '');
    setEstimatedHours(task.estimatedHours || 0);
    setSelectedTagIds(task.tagIds || []);
    setChecklist(task.checklist || []);
  }, [task]);

  const canEdit = canModifyTask(activeMember, task);
  const canDelete = hasPermission(activeMember, 'canDeleteTask');

  const otherViewers = presences
    .filter((p) => p.currentTaskId === task.id && p.userId !== activeMember?.id)
    .map((p) => members.find((m) => m.id === p.userId))
    .filter(Boolean);

  const handleSave = () => {
    if (!canEdit) return;
    onUpdateTask({
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate || undefined,
      estimatedHours: estimatedHours || undefined,
      tagIds: selectedTagIds,
      checklist,
    });
  };

  const handleToggleChecklist = (id: string) => {
    if (!canEdit) return;
    const updated = checklist.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);
    onUpdateTask({ checklist: updated });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskText.trim() || !canEdit) return;
    const newItem: ChecklistItem = {
      id: `c-${Date.now()}`,
      text: newSubtaskText.trim(),
      completed: false,
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    setNewSubtaskText('');
    onUpdateTask({ checklist: updated });
  };

  const handleDeleteSubtask = (id: string) => {
    if (!canEdit) return;
    const updated = checklist.filter((item) => item.id !== id);
    setChecklist(updated);
    onUpdateTask({ checklist: updated });
  };

  const handleToggleTag = (tagId: string) => {
    if (!canEdit) return;
    const updated = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    setSelectedTagIds(updated);
    onUpdateTask({ tagIds: updated });
  };

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(commentText.trim());
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400">#{task.id.slice(-6)}</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                task.status === 'done'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
              }`}
            >
              {task.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={() => {
                  if (confirm('Permanently delete this task?')) {
                    onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Collaborators Notice */}
        {otherViewers.length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-950/80 px-4 py-2 border-b border-indigo-200 dark:border-indigo-800 flex items-center gap-2 text-xs text-indigo-800 dark:text-indigo-300 font-medium">
            <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse shrink-0" />
            <span>
              <strong>{otherViewers.map((v) => v?.name).join(', ')}</strong> {otherViewers.length === 1 ? 'is' : 'are'} actively collaborating on this task. Changes sync in real-time.
            </span>
          </div>
        )}

        {/* Read-only permission notice */}
        {!canEdit && (
          <div className="bg-amber-50 dark:bg-amber-950/80 px-4 py-2 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Your current role (<strong>{activeMember?.role}</strong>) does not have permission to modify this task. Viewing in read-only mode.
            </span>
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          {/* Title & Description */}
          <div>
            <input
              type="text"
              value={title}
              disabled={!canEdit}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="w-full text-base sm:text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-hidden pb-1"
              placeholder="Task Title..."
            />
            <textarea
              value={description}
              disabled={!canEdit}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              rows={3}
              className="w-full mt-3 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              placeholder="Add detailed task description, deliverables, or specifications..."
            />
          </div>

          {/* Core Properties Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Status */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Status
              </label>
              <select
                value={status}
                disabled={!canEdit}
                onChange={(e) => {
                  const val = e.target.value as TaskStatus;
                  setStatus(val);
                  onUpdateTask({ status: val });
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Priority
              </label>
              <select
                value={priority}
                disabled={!canEdit}
                onChange={(e) => {
                  const val = e.target.value as TaskPriority;
                  setPriority(val);
                  onUpdateTask({ priority: val });
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Assignee
              </label>
              <select
                value={assigneeId}
                disabled={!canEdit}
                onChange={(e) => {
                  const val = e.target.value;
                  setAssigneeId(val);
                  onUpdateTask({ assigneeId: val || undefined });
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                disabled={!canEdit}
                onChange={(e) => {
                  const val = e.target.value;
                  setDueDate(val);
                  onUpdateTask({ dueDate: val || undefined });
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Categorization Tags */}
          <div>
            <label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              <span>Categorization Tags</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleToggleTag(tag.id)}
                    style={{
                      borderColor: isSelected ? tag.color : undefined,
                      backgroundColor: isSelected ? `${tag.color}20` : undefined,
                      color: isSelected ? tag.color : undefined,
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                      isSelected
                        ? 'font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span>{tag.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtasks / Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>Checklist ({checklist.filter((c) => c.completed).length}/{checklist.length})</span>
              </label>
            </div>

            <div className="space-y-1.5 mb-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      disabled={!canEdit}
                      onChange={() => handleToggleChecklist(item.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span
                      className={`text-xs ${
                        item.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {item.text}
                    </span>
                  </label>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteSubtask(item.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {canEdit && (
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskText}
                  onChange={(e) => setNewSubtaskText(e.target.value)}
                  placeholder="Add a checklist step..."
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskText.trim()}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-medium text-xs disabled:opacity-50 cursor-pointer"
                >
                  Add
                </button>
              </form>
            )}
          </div>

          {/* Collaborative Activity & Comments */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span>Real-Time Team Discussion ({task.comments.length})</span>
            </h4>

            {/* Comments Stream */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
              {task.comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No comments yet. Start the conversation!</p>
              ) : (
                task.comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <img
                      src={c.userAvatar}
                      alt={c.userName}
                      className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                    />
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                          {c.userName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment input form */}
            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              <img
                src={activeMember?.avatar}
                alt={activeMember?.name}
                className="w-7 h-7 rounded-full object-cover shrink-0"
              />
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={`Comment as ${activeMember?.name}...`}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <span>Version #{task.version} • Created {new Date(task.createdAt).toLocaleDateString()}</span>
          <span>Last synchronized with cloud {new Date(task.updatedAt).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
