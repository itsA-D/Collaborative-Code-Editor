import { useState, type ReactNode } from 'react';

interface Tab {
  id: string;
  name: string;
  type: 'html' | 'css' | 'js';
  icon: string;
}

interface Props {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  isConnected?: boolean;
  userCount?: number;
  onSave?: () => void;
  onShare?: () => void;
  /** Leaves the workspace (temporary session): routed, so the guard intercepts it. */
  onLeave?: () => void;
  /** Current snippet title; when set with onRename, the title becomes editable. */
  title?: string;
  onRename?: (newTitle: string) => void;
  /** Small status marker rendered before the connection pill. */
  statusBadge?: ReactNode;
}

export default function IDETabs({ tabs, activeTab, onTabChange, onTabClose, isConnected, userCount, onSave, onShare, onLeave, title, onRename, statusBadge }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title ?? '');

  const commitRename = () => {
    const next = editTitle.trim();
    if (next && next !== title && onRename) onRename(next);
    setIsEditing(false);
  };

  return (
    <div className="ide-tabs-container">
      <div className="ide-tabs-left">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`ide-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="ide-file-icon">{tab.icon}</span>
            <span>{tab.name}</span>
            {onTabClose && (
              <span
                className="ide-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="ide-tabs-right">
        {title !== undefined && onRename && (
          isEditing ? (
            <input
              className="ide-title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setEditTitle(title); setIsEditing(false); }
              }}
              autoFocus
              aria-label="Snippet title"
            />
          ) : (
            <button
              type="button"
              className="ide-title"
              onClick={() => { setEditTitle(title); setIsEditing(true); }}
              title="Click to rename"
            >
              {title}
            </button>
          )
        )}
        {statusBadge}
        {isConnected !== undefined && (
          <div className="ide-collab-status">
            <div className={`ide-status-dot ${isConnected ? '' : 'disconnected'}`} />
            <span>{userCount || 0} users</span>
          </div>
        )}
        {onSave && (
          <button className="btn" onClick={onSave} style={{ padding: '4px 10px', fontSize: '11px' }}>
            Save
          </button>
        )}
        {onShare && (
          <button className="btn" onClick={onShare} style={{ padding: '4px 10px', fontSize: '11px' }}>
            Share
          </button>
        )}
        {onLeave && (
          <button className="btn" onClick={onLeave} style={{ padding: '4px 10px', fontSize: '11px' }}>
            Leave
          </button>
        )}
      </div>
    </div>
  );
}
