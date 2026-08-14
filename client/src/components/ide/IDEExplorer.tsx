interface File {
  name: string;
  type: 'html' | 'css' | 'js' | 'folder';
  active?: boolean;
}

interface Props {
  files: File[];
  activeTab: string;
  onFileSelect: (file: string) => void;
}

export default function IDEExplorer({ files, activeTab, onFileSelect }: Props) {
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'html': return '🌐';
      case 'css': return '🎨';
      case 'js': return '📜';
      case 'folder': return '📁';
      default: return '📄';
    }
  };

  const projectFiles = files.filter(f => f.type !== 'folder');
  const folders = files.filter(f => f.type === 'folder');

  return (
    <div className="ide-explorer">
      <div className="ide-explorer-header">
        <span>Explorer</span>
        <span style={{ opacity: 0.5 }}>⋯</span>
      </div>
      <div className="ide-explorer-content">
        <div className="ide-file-section">
          <div className="ide-section-title">
            <span>▾</span>
            <span>PROJECT</span>
          </div>
          <div className="ide-file-tree">
            {folders.map((folder) => (
              <div key={folder.name} className="ide-file-item">
                <span className="ide-file-icon">{getFileIcon(folder.type)}</span>
                <span>{folder.name}</span>
              </div>
            ))}
            {projectFiles.map((file) => (
              <div
                key={file.name}
                className={`ide-file-item ${activeTab === file.type ? 'active' : ''}`}
                onClick={() => onFileSelect(file.type)}
              >
                <span className="ide-file-icon">{getFileIcon(file.type)}</span>
                <span>{file.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
