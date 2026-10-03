import { useCallback, useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  actions: ReactNode;
  /** Set while a submission is in flight so Escape cannot close mid-save. */
  busy?: boolean;
  labelledById?: string;
  describedById?: string;
}

/**
 * Accessible glass dialog: focus trap, Escape handling, focus restoration and
 * an explicit action slot. Shared by the temporary-session modals.
 */
export default function GlassModal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  busy = false,
  labelledById,
  describedById,
}: GlassModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useRef(`session-modal-title-${Math.random().toString(36).slice(2, 8)}`);
  const descId = useRef(`session-modal-desc-${Math.random().toString(36).slice(2, 8)}`);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Never close while saving — that would orphan the request.
        if (!busy) onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (activeEl === first || !dialog.contains(activeEl))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [busy, onClose]
  );

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown, true);
    const focusTarget =
      dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]') || dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    focusTarget?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="glass-modal-root glass-scope">
      <div className="glass-modal__scrim" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div
        className="glass-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById || titleId.current}
        aria-describedby={description ? describedById || descId.current : undefined}
        ref={dialogRef}
      >
        <div className="glass-modal__body">
          <h2 className="glass-modal__title" id={titleId.current}>
            {title}
          </h2>
          {description && (
            <p className="glass-modal__text" id={descId.current}>
              {description}
            </p>
          )}
          {children}
        </div>
        <div className="glass-modal__actions">{actions}</div>
      </div>
    </div>
  );
}