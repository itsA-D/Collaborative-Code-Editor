import { useEffect, useState } from 'react';
import GlassModal from './GlassModal';

/** Matches server/src/utils/validators.ts -> snippetCreateSchema.title */
export const SNIPPET_TITLE_MAX = 200;

interface SaveSessionModalProps {
  open: boolean;
  saving: boolean;
  error: string;
  /** False when signed out — saving needs the existing auth flow. */
  canSave: boolean;
  onCancel: () => void;
  onSave: (title: string) => void;
  onSignIn: () => void;
}

export default function SaveSessionModal({ open, saving, error, canSave, onCancel, onSave, onSignIn }: SaveSessionModalProps) {
  const [title, setTitle] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setTouched(false);
    }
  }, [open]);

  const trimmed = title.trim();
  const tooLong = trimmed.length > SNIPPET_TITLE_MAX;
  const validationError = !trimmed ? 'Give your snippet a name' : tooLong ? `Keep the name under ${SNIPPET_TITLE_MAX} characters` : '';
  const showError = touched && !!validationError;

  function submit() {
    setTouched(true);
    if (!trimmed || tooLong || saving || !canSave) return;
    onSave(trimmed);
  }

  return (
    <GlassModal
      open={open}
      onClose={onCancel}
      busy={saving}
      title="Save snippet"
      description={canSave ? 'Give your snippet a name. It will be added to your snippets.' : undefined}
      actions={
        canSave ? (
          <>
            <button type="button" className="home-btn home-btn--ghost home-btn--sm" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="home-btn home-btn--primary home-btn--sm" onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : 'Save snippet'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="home-btn home-btn--ghost home-btn--sm" onClick={onCancel}>
              Keep editing
            </button>
            <button type="button" className="home-btn home-btn--primary home-btn--sm" onClick={onSignIn} data-autofocus>
              Log in to save
            </button>
          </>
        )
      }
    >
      {canSave ? (
        <div className="home-field">
          <label className="home-field__label" htmlFor="session-snippet-title">
            Snippet name
          </label>
          <input
            id="session-snippet-title"
            className="home-field__input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="My awesome snippet"
            maxLength={SNIPPET_TITLE_MAX + 20}
            autoComplete="off"
            aria-invalid={showError || undefined}
            aria-describedby={showError || error ? 'session-snippet-error' : undefined}
            data-autofocus
          />
          <p className="home-field__hint">Up to {SNIPPET_TITLE_MAX} characters. Duplicate names are numbered automatically.</p>
          {showError && (
            <p className="home-field__error" id="session-snippet-error" role="alert">
              {validationError}
            </p>
          )}
          {!showError && error && (
            <p className="home-field__error" id="session-snippet-error" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <p className="glass-modal__text">
          Your work stays in this browser session. Log in to save it as a snippet — you will come straight back here.
        </p>
      )}
    </GlassModal>
  );
}