export default function UserPresence({ users, onBack }: { users: { id: string; name: string; color: string }[]; onBack?: () => void }) {
  return (
    <div className="active-users" style={{ alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {users.map(u => (
          <span className="user-pill" key={u.id} style={{ borderColor: u.color, color: u.color }}>{u.name}</span>
        ))}
      </div>
      <span className="spacer" />
      {onBack && (
        <button className="btn" type="button" onClick={onBack}>Back</button>
      )}
    </div>
  );
}
