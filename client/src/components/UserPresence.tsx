export default function UserPresence({ users, onBack, isAutosaving }: { users: { id: string; name: string; color: string }[]; onBack?: () => void; isAutosaving?: boolean }) {
  return (
    <div className="active-users" style={{ alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {users.map(u => (
          <span className="user-pill" key={u.id} style={{ borderColor: u.color, color: u.color }}>{u.name}</span>
        ))}
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