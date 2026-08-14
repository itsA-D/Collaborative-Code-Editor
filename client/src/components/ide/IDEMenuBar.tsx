export default function IDEMenuBar() {
  const menuItems = ['File', 'Edit', 'View', 'Selection', 'Run', 'Terminal', 'Help'];

  return (
    <div className="ide-menu-bar">
      {menuItems.map((item) => (
        <button key={item} className="ide-menu-item">
          {item}
        </button>
      ))}
    </div>
  );
}
