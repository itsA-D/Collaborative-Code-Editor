import { useCallback, useEffect, useState } from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { useTemporarySession } from '../../state/TemporarySessionContext';
import LeaveSessionModal from './LeaveSessionModal';
import SaveSessionModal from './SaveSessionModal';

type SaveRequest = { title: string } | null;

export const TEMP_EDITOR_PATH = '/editor/temp';

/** Fired by CodeEditor's Ctrl+S handler and by the temporary editor's Save button. */
export const SAVE_REQUEST_EVENT = 'save-request';

/**
 * Single owner of the temporary-session lifecycle guard:
 * - internal navigation  -> custom Leave/Discard/Save modal (useBlocker)
 * - browser leaving      -> native beforeunload (registered by the session context)
 * - explicit save        -> existing POST /api/snippets, then straight to the board
 */
export default function SessionGuard() {
  const { user } = useAuth();
  const { active, dirty, files, markSaved, discard } = useTemporarySession();
  const nav = useNavigate();
  const location = useLocation();
  const onTempEditor = location.pathname === TEMP_EDITOR_PATH;

  const [saveRequest, setSaveRequest] = useState<SaveRequest>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    // Only leaving the temporary editor needs a decision. The draft lives in
    // sessionStorage, so re-entering it (or moving around the rest of the app)
    // must stay frictionless.
    return (
      active &&
      dirty &&
      currentLocation.pathname === TEMP_EDITOR_PATH &&
      nextLocation.pathname !== TEMP_EDITOR_PATH
    );
  });

  const blocked = blocker.state === 'blocked';

  const closeSaveModal = useCallback(() => {
    if (saving) return;
    setSaveRequest(null);
    setSaveError('');
  }, [saving]);

  /** Finish the navigation the user originally asked for. */
  const continueNavigation = useCallback(() => {
    if (blocker.state === 'blocked') blocker.proceed();
    else nav('/explore');
  }, [blocker, nav]);

  const requestSave = useCallback(() => {
    setSaveError('');
    setSaveRequest({ title: '' });
  }, []);

  const handleSave = useCallback(
    async (title: string) => {
      setSaving(true);
      setSaveError('');
      try {
        await api.post('/api/snippets', {
          title,
          html: files.html,
          css: files.css,
          js: files.js,
          isPublic: true,
        });
        markSaved();
        setSaveRequest(null);
        setSaving(false);
        continueNavigation();
      } catch (e: any) {
        setSaving(false);
        setSaveError(e?.response?.data?.message || 'Could not save this snippet.');
      }
    },
    [files, markSaved, continueNavigation]
  );

  const handleDiscard = useCallback(() => {
    discard();
    continueNavigation();
  }, [discard, continueNavigation]);

  const handleSignIn = useCallback(() => {
    // Release the pending navigation first, otherwise the login route change
    // would be blocked again and the guard would reopen the leave modal.
    if (blocker.state === 'blocked') blocker.reset?.();
    setSaveRequest(null);
    setSaveError('');
    // The draft stays in sessionStorage, so returning to /editor/temp restores it.
    nav('/login');
  }, [blocker, nav]);

  // Drop a pending blocked navigation if the draft became clean meanwhile.
  useEffect(() => {
    if (blocker.state === 'blocked' && !dirty) blocker.proceed();
  }, [blocker, dirty]);

  // Save intent only belongs to the temporary editor: the saved-snippet editor
  // has its own Ctrl+S handling, so it must not be intercepted here.
  useEffect(() => {
    if (!onTempEditor) return;
    const onSaveRequest = () => requestSave();
    window.addEventListener(SAVE_REQUEST_EVENT, onSaveRequest);
    return () => window.removeEventListener(SAVE_REQUEST_EVENT, onSaveRequest);
  }, [onTempEditor, requestSave]);

  return (
    <>
      <LeaveSessionModal
        open={blocked && !saveRequest}
        onKeepEditing={() => blocker.reset?.()}
        onDiscard={handleDiscard}
        onSave={requestSave}
      />
      <SaveSessionModal
        open={saveRequest !== null}
        saving={saving}
        error={saveError}
        canSave={!!user}
        onCancel={closeSaveModal}
        onSave={handleSave}
        onSignIn={handleSignIn}
      />
    </>
  );
}