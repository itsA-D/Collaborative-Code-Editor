import { useState, useRef, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  color: string;
  currentTab?: string;
}

export default function UserPresence({ users, onBack, isAutosaving }: {
  users: User[];
  onBack?: () => void;
  isAutosaving?: boolean;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopoverOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="active-users" style={{ alignItems: 'center', flexWrap: 'nowrap', position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {users.length === 0 ? (
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>No collaborators</span>
        ) : (
          <>
            <span style={{ fontSize: '12px', color: 'var(--muted)', marginRight: '4px' }}>
              {users.length === 1 ? '1 collaborator' : `${users.length} collaborators`}
            </span>
            <button
              className="presence-trigger"
              onClick={() => setPopoverOpen(!popoverOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--control-bg)',
                cursor: 'pointer',
                fontSize: '11px',
              }}
              aria-label={popoverOpen ? 'Hide collaborators' : 'Show collaborators'}
              aria-expanded={popoverOpen}
            >
              {users.slice(0, 3).map(u => (
                <span
                  key={u.id}
                  style={{
                    width: 20,
                    height: 20,
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
                  }}
                  title={u.name}
                >
                  {u.name.charAt(0)}
                </span>
              ))}
              {users.length > 3 && (
                <span
                  style={{
                    width: 20,
                    height: 20,
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
                  +{users.length - 3}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {popoverOpen && (
        <div
          ref={popoverRef}
          className="presence-popover"
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: '8px',
            minWidth: 220,
            maxWidth: 280,
            padding: '12px',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 100,
            fontSize: '12px',
          }}
          role="dialog"
          aria-label="Collaborators"
        >
          <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--fg)' }}>
            Collaborators ({users.length})
          </div>
          {users.map(u => (
            <div
              key={u.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: u.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}
              >
                {u.name.charAt(0)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.name}
                </div>
                {u.currentTab && (
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Editing {u.currentTab}
                  </div>
                )}
              </div>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#22C55E',
                  boxShadow: '0 0 6px #22C55E',
                  flexShrink: 0,
                }}
                title="Active"
              />
            </div>
          ))}
          {users.length === 0 && (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              No other collaborators in this session
            </div>
          )}
        </div>
      )}

      <span className="spacer" />
      {isAutosaving ? (
        <div className="autosave-indicator">
          <div className="autosave-ring-container">
            <div className="autosave-pulse-ring"></div>
            <div className="autosave-pulse-ring" style={{ animationDelay: '0.4s' }}></div>
            <div className="autosave-pulse-ring" style={{ animationDelay: '0.8s' }}></div>
            <div className="autosave-inner-dot"></div>
          </div>
          <span className="autosave-label">auto-saving...</span>
        </div>
      ) : null}
      {onBack && (
        <button className="btn" type="button" onClick={onBack}>Back</button>
      )}
    </div>
  );
}