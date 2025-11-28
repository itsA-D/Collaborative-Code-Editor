export default function Toolbar({ title, onSave, onFork, onShare, status }: { title: string; onSave: () => void; onFork: () => void; onShare: () => void; status: string; }) {
  return (
    <div className="editor-toolbar">
      <strong style={{ marginRight: 8 }}>{title}</strong>
      <button className="btn primary" onClick={onSave}>Save</button>
      <button className="btn" onClick={onFork}>Fork</button>
      <button className="btn" onClick={onShare}>Share</button>
      <span className="spacer" />
      <span className="status">{status}</span>
    </div>
  );
}
