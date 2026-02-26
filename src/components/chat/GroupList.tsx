"use client";

import { useState } from "react";
import { Search, Globe, Lock, Plus, LogIn, Users, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ChatGroup } from "@/lib/types";

interface GroupListProps {
  groups: ChatGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateClick: () => void;
  onJoinClick: () => void;
  onDeleteGroup?: (id: string) => void;
  isAdmin: boolean;
}

export function GroupList({
  groups,
  selectedId,
  onSelect,
  onCreateClick,
  onJoinClick,
  onDeleteGroup,
  isAdmin,
}: GroupListProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full bg-surface-900 flex flex-col">
      <div className="p-3 space-y-3 border-b border-surface-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("chat.searchGroups")}
            className="input-field w-full pl-9"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onJoinClick} className="btn-secondary flex-1 text-sm">
            <LogIn className="h-4 w-4 mr-1" />
            {t("chat.joinByCode")}
          </button>
          {isAdmin && (
            <button onClick={onCreateClick} className="btn-primary flex-1 text-sm">
              <Plus className="h-4 w-4 mr-1" />
              {t("chat.createGroup")}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-surface-500 text-sm">
            {t("chat.noGroups")}
          </div>
        ) : (
          filtered.map((group) => {
            const isSelected = group.id === selectedId;
            return (
              <button
                key={group.id}
                onClick={() => onSelect(group.id)}
                className={cn(
                  "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors group/item",
                  isSelected
                    ? "bg-surface-700 border-l-2 border-brand-400"
                    : "hover:bg-surface-800 border-l-2 border-transparent"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-100 truncate">
                      {group.name}
                    </span>
                    {group.is_public || group.is_default ? (
                      <Globe className="h-3.5 w-3.5 text-surface-500 flex-shrink-0" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-surface-500 flex-shrink-0" />
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs text-surface-500 truncate mt-0.5">
                      {group.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-surface-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>{group.member_count ?? 0}</span>
                  </div>
                  {isAdmin && !group.is_default && onDeleteGroup && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteGroup(group.id);
                      }}
                      className="p-1 text-surface-500 hover:text-error-400 rounded opacity-0 group-hover/item:opacity-100 transition-opacity"
                      title={t("chat.deleteGroup")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
