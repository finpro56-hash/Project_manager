import React, { useState } from 'react';
import { X, Tag, Plus, Trash2, Palette, ShieldAlert } from 'lucide-react';
import { TaskTag, TagCategory, UserMember } from '../types';
import { hasPermission } from '../lib/permissions';

interface TagManagerModalProps {
  tags: TaskTag[];
  activeMember?: UserMember;
  onClose: () => void;
  onCreateTag: (tag: Omit<TaskTag, 'id'>) => void;
  onDeleteTag: (tagId: string) => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#64748b', // Slate
];

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  tags,
  activeMember,
  onClose,
  onCreateTag,
  onDeleteTag,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [category, setCategory] = useState<TagCategory>('domain');

  const canManage = hasPermission(activeMember, 'canManageTags');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !canManage) return;

    onCreateTag({
      name: name.trim(),
      color,
      category,
    });
    setName('');
  };

  // Group tags by category
  const categories: TagCategory[] = ['domain', 'priority', 'sprint', 'status', 'custom'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Task Categorization Tags
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize work streams, domains, sprint milestones, and taxonomy tags.
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

        {!canManage && (
          <div className="bg-amber-50 dark:bg-amber-950/70 px-4 py-2 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>
              Your current role (<strong>{activeMember?.role}</strong>) does not have permission to create or delete tags. Viewing tags in audit mode.
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          {/* Create Tag Form */}
          {canManage && (
            <form
              onSubmit={handleSubmit}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 space-y-3"
            >
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                Create New Categorization Tag
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tag name (e.g. ServiceWorker, P0, Auth)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TagCategory)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 capitalize"
                  >
                    <option value="domain">Domain</option>
                    <option value="priority">Priority</option>
                    <option value="sprint">Sprint</option>
                    <option value="status">Status</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Color Presets */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Color:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full border-2 transition transform ${
                        color === c ? 'scale-115 border-white ring-2 ring-indigo-500' : 'border-transparent'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                    title="Custom hex color"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tag</span>
                </button>
              </div>
            </form>
          )}

          {/* Grouped Tags List */}
          <div className="space-y-4">
            {categories.map((cat) => {
              const catTags = tags.filter((t) => t.category === cat);
              if (catTags.length === 0) return null;

              return (
                <div key={cat}>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    {cat} Tags ({catTags.length})
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {catTags.map((tag) => (
                      <div
                        key={tag.id}
                        style={{
                          backgroundColor: `${tag.color}15`,
                          borderColor: `${tag.color}35`,
                        }}
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {tag.name}
                        </span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => onDeleteTag(tag.id)}
                            className="p-0.5 rounded text-slate-400 hover:text-rose-500 transition"
                            title="Delete tag"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
