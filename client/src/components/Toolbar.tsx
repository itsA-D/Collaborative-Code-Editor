import { useState } from 'react';

export default function Toolbar({
  title,
  onSave,
  onFork,
  onShare,
  onRename,
  onDelete,
  status
}: {
  title: string;
  onSave: () => void;
  onFork: () => void;
  onShare: () => void;
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
  status: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== title && onRename) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="editor-toolbar">
      {isEditing ? (
        <>
          <input
            className="input"
            style={{ marginRight: 8, maxWidth: 300 }}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setEditTitle(title); setIsEditing(false); }
            }}
            autoFocus
          />
        </>
      ) : (
        <strong
          style={{ marginRight: 8, cursor: onRename ? 'pointer' : 'default' }}
          onClick={() => onRename && setIsEditing(true)}
          title={onRename ? 'Click to rename' : ''}
        >
          {title}
        </strong>
      )}
      <button className="btn primary" onClick={onSave}>Save</button>
      <button className="btn" onClick={onFork}>Fork</button>
      <button className="btn" onClick={onShare}>Share</button>
      {onDelete && <button className="btn" style={{ color: '#ef4444' }} onClick={onDelete}>Delete</button>}
      <span className="spacer" />
      <span className="status">{status}</span>
    </div>
  );
}
