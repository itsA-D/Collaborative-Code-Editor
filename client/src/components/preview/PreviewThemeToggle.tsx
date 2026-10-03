import { MoonIcon, SunIcon } from '../Icons';

export type PreviewTheme = 'dark' | 'light';

interface PreviewThemeToggleProps {
  theme: PreviewTheme;
  onToggle: () => void;
}

/**
 * Segmented glass switch for the Live Preview theme: the state icon sits on the
 * track opposite the sliding bubble (moon on the right in dark, sun on the left
 * in light). Visual state is scoped to `data-preview-theme` on the button, so
 * the control is fully independent of the application theme.
 */
export default function PreviewThemeToggle({ theme, onToggle }: PreviewThemeToggleProps) {
  const isLight = theme === 'light';
  const label = isLight ? 'Switch preview to dark theme' : 'Switch preview to light theme';

  return (
    <button
      type="button"
      className="preview-theme-toggle"
      data-preview-theme={theme}
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      <span className="preview-toggle__opt preview-toggle__opt--moon" aria-hidden="true">
        <MoonIcon size={15} />
      </span>
      <span className="preview-toggle__opt preview-toggle__opt--sun" aria-hidden="true">
        <SunIcon size={15} />
      </span>
      <span className="preview-toggle__bubble" aria-hidden="true" />
    </button>
  );
}
