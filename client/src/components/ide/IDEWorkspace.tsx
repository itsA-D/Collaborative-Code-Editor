import { useRef, useState, type ReactNode } from 'react';
import LivePreview from '../LivePreview';
import { IDEStatusBar, IDETabs } from '.';

export interface IDEWorkspaceTab {
  id: string;
  name: string;
  type: 'html' | 'css' | 'js';
  icon: string;
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  currentTab?: string;
}

interface Props {
  tabs: IDEWorkspaceTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Code area (Monaco instances, typing indicators, ...). */
  children: ReactNode;
  preview: { html: string; css: string; js: string };
  status: {
    isConnected: boolean;
    language: string;
    cursorPosition?: { line: number; column: number };
    statusLabel?: string;
    statusTone?: 'default' | 'local';
  };
  isConnected?: boolean;
  userCount?: number;
  onSave?: () => void;
  onShare?: () => void;
  onLeave?: () => void;
  title?: string;
  onRename?: (newTitle: string) => void;
  statusBadge?: ReactNode;
  collaborators?: Collaborator[];
}

const PREVIEW_WIDTH_KEY = 'ide-preview-width';

/**
 * Shared IDE chrome: tab bar, resizable code/preview split and status bar.
 * Both the saved-snippet editor (Yjs) and the temporary session render through
 * this component, so the workspace behaves identically in either mode.
 */
export default function IDEWorkspace({
  tabs,
  activeTab,
  onTabChange,
  children,
  preview,
  status,
  isConnected,
  userCount,
  onSave,
  onShare,
  onLeave,
  title,
  onRename,
  statusBadge,
  collaborators = [],
}: Props) {
  const [previewWidth, setPreviewWidth] = useState<number>(() => {
    const saved = localStorage.getItem(PREVIEW_WIDTH_KEY);
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed >= 28 && parsed <= 50 ? parsed : 40;
  });
  const [isResizing, setIsResizing] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    setIsResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    const widthPct = ((rect.right - e.clientX) / rect.width) * 100;
    setPreviewWidth(Math.min(50, Math.max(28, widthPct)));
  };

  const handleResizePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem(PREVIEW_WIDTH_KEY, String(previewWidth));
  };

  return (
    <div className="ide-workspace">
      <div className="ide-main">
        <div className="ide-editor-area">
          <IDETabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
            isConnected={isConnected}
            userCount={userCount}
            onSave={onSave}
            onShare={onShare}
            onLeave={onLeave}
            title={title}
            onRename={onRename}
            statusBadge={statusBadge}
            collaborators={collaborators}
          />
          <div className={`ide-editor-content${isResizing ? ' ide-resizing' : ''}`} ref={contentRef}>
            <div className="ide-code-panel">{children}</div>
            <div
              className={`ide-resize-handle${isResizing ? ' resizing' : ''}`}
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerUp}
              role="separator"
              aria-orientation="vertical"
              aria-valuenow={Math.round(previewWidth)}
              aria-valuemin={28}
              aria-valuemax={50}
              title="Drag to resize preview"
            />
            <div className="ide-preview-panel" style={{ width: `${previewWidth}%` }}>
              <LivePreview html={preview.html} css={preview.css} js={preview.js} language={status.language} />
            </div>
          </div>
        </div>
      </div>
      <IDEStatusBar
        isConnected={status.isConnected}
        language={status.language}
        cursorPosition={status.cursorPosition}
        statusLabel={status.statusLabel}
        statusTone={status.statusTone}
      />
    </div>
  );
}