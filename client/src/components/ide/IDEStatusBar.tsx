interface Props {
  isConnected: boolean;
  language: string;
  cursorPosition?: { line: number; column: number };
}

export default function IDEStatusBar({ isConnected, language, cursorPosition }: Props) {
  return (
    <div className="ide-status-bar">
      <div className="ide-status-left">
        <div className="ide-status-item">
          <div className={`ide-status-dot ${isConnected ? '' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="ide-status-item">
          <span>{language}</span>
        </div>
        <div className="ide-status-item">
          <span>UTF-8</span>
        </div>
        <div className="ide-status-item">
          <span>Spaces: 2</span>
        </div>
      </div>
      <div className="ide-status-right">
        {cursorPosition && (
          <div className="ide-status-item">
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          </div>
        )}
      </div>
    </div>
  );
}
