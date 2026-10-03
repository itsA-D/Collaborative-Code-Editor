export default function UserPresence({ users, onBack, isAutosaving, followId, onFollowUser }: {
  users: { id: string; name: string; color: string; currentTab?: string }[];
  onBack?: () => void;
  isAutosaving?: boolean;
  followId?: string | null;
  onFollowUser?: (id: string | null) => void;
}) {
  return (
    <div className="active-users" style={{ alignItems: 'center', flexWrap: 'nowrap' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)', marginRight: '4px' }}>Collaborators:</span>
        {users.length === 0 && <span style={{ fontSize: '13px', color: 'var(--muted)' }}>None</span>}
        {users.map(u => {
          const isFollowing = followId === u.id;
          return (
            <button
              className="user-pill"
              key={u.id}
              onClick={() => onFollowUser && onFollowUser(isFollowing ? null : u.id)}
              style={{
                borderColor: u.color,
                color: u.color,
                background: isFollowing ? `${u.color}22` : 'var(--control-bg)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                transition: 'all 0.2s',
                boxShadow: isFollowing ? `0 0 0 1px ${u.color}` : 'none'
              }}
              title={isFollowing ? 'Stop following' : 'Follow user'}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', backgroundColor: u.color,
                boxShadow: isFollowing ? `0 0 6px ${u.color}` : 'none'
              }}></span>
              <span style={{ fontWeight: 600 }}>{u.name}</span>
              {u.currentTab && (
                <span style={{
                  fontSize: '10px',
                  backgroundColor: 'var(--panel)',
                  padding: '1px 4px',
                  borderRadius: '4px',
                  opacity: 0.8,
                  textTransform: 'uppercase'
                }}>
                  {u.currentTab}
                </span>
              )}
            </button>
          );
        })}
      </div>
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