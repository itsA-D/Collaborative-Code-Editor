import GlassModal from './GlassModal';

interface LeaveSessionModalProps {
  open: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

/** Category A: leaving the app with unsaved temporary work. */
export default function LeaveSessionModal({ open, onKeepEditing, onDiscard, onSave }: LeaveSessionModalProps) {
  return (
    <GlassModal
      open={open}
      onClose={onKeepEditing}
      title="Leave temporary session?"
      description="Your current work hasn't been saved. If you leave, this temporary session will be lost."
      actions={
        <>
          <button type="button" className="home-btn home-btn--ghost home-btn--sm" onClick={onKeepEditing}>
            Keep editing
          </button>
          <button type="button" className="home-btn home-btn--danger home-btn--sm" onClick={onDiscard}>
            Discard
          </button>
          <button type="button" className="home-btn home-btn--primary home-btn--sm" onClick={onSave} data-autofocus>
            Save
          </button>
        </>
      }
    />
  );
}