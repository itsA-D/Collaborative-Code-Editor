import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import { IDEWorkspace } from '../components/ide';
import { SAVE_REQUEST_EVENT } from '../components/session/SessionGuard';
import { useAuth } from '../state/AuthContext';
import { useTemporarySession, type TempFileKey } from '../state/TemporarySessionContext';
import { analytics } from '../analytics/events';

const TABS = [
  { id: 'html', name: 'index.html', type: 'html' as const, icon: '🌐' },
  { id: 'css', name: 'styles.css', type: 'css' as const, icon: '🎨' },
  { id: 'js', name: 'script.js', type: 'js' as const, icon: '📜' },
];

const getLanguageName = (tab: TempFileKey) => {
  if (tab === 'html') return 'HTML';
  if (tab === 'css') return 'CSS';
  return 'JavaScript';
};

/**
 * Temporary session: the existing IDE running on a local, unsaved draft.
 * Nothing here touches the API — the draft only becomes a snippet when the
 * user explicitly saves it (see SessionGuard).
 */
export default function TemporaryEditor() {
  const { user } = useAuth();
  const { active, dirty, files, activeFile, startSession, setFile, setActiveFile } = useTemporarySession();
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const nav = useNavigate();

  // Landing here directly (deep link / refresh) starts a fresh draft.
  useEffect(() => {
    if (!active) startSession();
  }, [active, startSession]);

  useEffect(() => {
    analytics.ideOpened({ authenticated: !!user, language: getLanguageName(activeFile) });
  }, [user]);

  // Stable identity: this page re-renders on every keystroke.
  const handleCursor = useCallback((pos: { lineNumber: number; column: number }) => {
    setCursorPosition({ line: pos.lineNumber, column: pos.column });
  }, []);

  const reportEdit = useMemo(
    () =>
      analytics.codeEditedThrottled(() => ({
        language: activeFile === 'js' ? 'javascript' : activeFile,
        editor: 'temporary_ide',
        collaborative: false,
      })),
    []
  );

  const handleLocalChange = useCallback(
    (key: TempFileKey) => (value: string) => {
      reportEdit();
      setFile(key, value);
    },
    [reportEdit, setFile]
  );

  function requestSave() {
    window.dispatchEvent(new CustomEvent(SAVE_REQUEST_EVENT));
  }

  /** Routed navigation, so the unsaved-changes guard can intercept it. */
  function leaveSession() {
    const canGoBack = !!(window.history.state && (window.history.state as any).idx > 0);
    if (canGoBack) nav(-1);
    else nav('/', { replace: true });
  }

  return (
    <>
      <IDEWorkspace
        tabs={TABS}
        activeTab={activeFile}
        onTabChange={(tabId) => setActiveFile(tabId as TempFileKey)}
        onSave={requestSave}
        onLeave={leaveSession}
        preview={files}
        status={{
          isConnected: false,
          language: getLanguageName(activeFile),
          cursorPosition,
          statusLabel: 'Local draft',
          statusTone: 'local',
        }}
        statusBadge={
          <span
            className={`ide-session-badge${dirty ? ' is-dirty' : ''}`}
            title={
              dirty
                ? 'Unsaved changes in this browser session'
                : 'Temporary session — saved snippets are stored in your library'
            }
          >
            <span className="ide-session-badge__dot" aria-hidden="true" />
            {dirty ? 'Unsaved session' : 'Temporary session'}
          </span>
        }
      >
        <div style={{ flex: 1, minHeight: 0 }}>
          {(['html', 'css', 'js'] as TempFileKey[]).map((key) => (
            <div key={key} style={{ display: activeFile === key ? 'block' : 'none', height: '100%' }}>
              <CodeEditor
                language={key === 'js' ? 'javascript' : key}
                yText={null}
                awareness={null}
                defaultValue={files[key]}
                onLocalChange={handleLocalChange(key)}
                onCursor={handleCursor}
              />
            </div>
          ))}
        </div>
      </IDEWorkspace>
      <p className="visually-hidden" role="status">
        {user
          ? 'Temporary session. Your work is not saved yet.'
          : 'Temporary session. Log in to save this work as a snippet.'}
      </p>
    </>
  );
}