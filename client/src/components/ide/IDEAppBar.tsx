interface Props {
  projectName: string;
  isConnected: boolean;
  userCount: number;
  onSave: () => void;
  onShare: () => void;
  onSettings?: () => void;
}

export default function IDEAppBar({ projectName, isConnected, userCount, onSave, onShare, onSettings }: Props) {
  return (
    <div className="ide-app-bar">
      <div className="ide-app-left">
        <span className="ide-brand">Collab Coder</span>
        <span className="ide-project-separator">/</span>
        <span className="ide-project-name">{projectName}</span>
      </div>
      <div className="ide-app-right">
        <div className="ide-collab-status">
          <div className={`ide-status-dot ${isConnected ? '' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        {userCount > 0 && (
          <div className="ide-collab-avatars">
            {Array.from({ length: Math.min(userCount, 3) }).map((_, i) => (
              <div key={i} className="ide-avatar">
                {String.fromCharCode(65 + i)}
              </div>
            ))}
            {userCount > 3 && <span className="ide-avatar">+{userCount - 3}</span>}
          </div>
        )}
        <button className="btn" onClick={onSave} style={{ padding: '4px 10px', fontSize: '11px' }}>
          Save
        </button>
        <button className="btn" onClick={onShare} style={{ padding: '4px 10px', fontSize: '11px' }}>
          Share
        </button>
        {onSettings && (
          <button className="btn" onClick={onSettings} style={{ padding: '4px 8px', fontSize: '14px' }}>
            ⋯
          </button>
        )}
      </div>
    </div>
  );
}
