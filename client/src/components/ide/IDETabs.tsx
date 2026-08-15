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
}

export default function IDETabs({ tabs, activeTab, onTabChange, onTabClose, isConnected, userCount, onSave, onShare }: Props) {
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
      </div>
    </div>
  );
}
