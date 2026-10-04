import { useState, type ReactNode } from 'react';

interface Tab {
  id: string;
  name: string;
  type: 'html' | 'css' | 'js';
  icon: string;
}

interface Collaborator {
  id: string;
  name: string;
  color: string;
  currentTab?: string;
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
  onLeave?: () => void;
  title?: string;
  onRename?: (newTitle: string) => void;
  statusBadge?: ReactNode;
  collaborators?: Collaborator[];
}

export default function IDETabs({
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  isConnected,
  userCount,
  onSave,
  onShare,
  onLeave,
  title,
  onRename,
  statusBadge,
  collaborators = [],
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title ?? '');

  const commitRename = () => {
    const next = editTitle.trim();
    if (next && next !== title && onRename) onRename(next);
    setIsEditing(false);
  };

  // Show up to 3 collaborator avatars, then +N
  const visibleCollaborators = collaborators.slice(0, 3);
  const remainingCount = collaborators.length - 3;

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
        {collaborators.length > 0 && (
          <div className="ide-collaborators" style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
            {visibleCollaborators.map(u => (
              <span
                key={u.id}
                className="collaborator-avatar"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: u.color,
                  border: '2px solid var(--bg)',
                  boxShadow: '0 0 0 1px var(--border)',
                  marginLeft: -6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 600,
                  color: '#fff',
                  textTransform: 'uppercase',
                  cursor: 'default',
                }}
                title={`${u.name}${u.currentTab ? ` — Editing ${u.currentTab}` : ''}`}
              >
                {u.name.charAt(0)}
              </span>
            ))}
            {remainingCount > 0 && (
              <span
                className="collaborator-more"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: 'var(--panel)',
                  border: '2px solid var(--border)',
                  marginLeft: -6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--muted)',
                }}
              >
                +{remainingCount}
              </span>
            )}
          </div>
        )}
        {isConnected !== undefined && (
          <div className="ide-collab-status" style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
            <div className={`ide-status-dot ${isConnected ? '' : 'disconnected'}`} />
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {userCount !== undefined ? userCount : (collaborators.length + 1)} user{userCount !== undefined ? (userCount === 1 ? '' : 's') : (collaborators.length === 0 ? '' : 's')}
            </span>
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