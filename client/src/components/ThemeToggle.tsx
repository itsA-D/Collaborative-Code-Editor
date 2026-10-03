import { useTheme } from '../state/ThemeContext';
import { MoonIcon, SunIcon } from './Icons';

/**
 * Neumorphic day/night switch: a gradient track (deep indigo night fading into
 * a warm desert-sunrise day) with a raised glossy orb that slides between the
 * two ends. State is driven by the app theme, so it stays in sync everywhere.
 */
export default function ThemeToggle() {
  const { isLight, toggleTheme } = useTheme();
  const label = isLight ? 'Switch to dark theme' : 'Switch to light theme';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isLight}
      aria-label={label}
      title={label}
      className={`theme-toggle ${isLight ? 'is-light' : 'is-dark'}`}
    >
      <span className="theme-toggle__track">
        <span className="theme-toggle__bg theme-toggle__bg--dark" aria-hidden="true" />
        <span className="theme-toggle__bg theme-toggle__bg--light" aria-hidden="true" />
        <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
          <SunIcon size={13} />
        </span>
        <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
          <MoonIcon size={13} />
        </span>
        <span className="theme-toggle__thumb" aria-hidden="true" />
      </span>
    </button>
  );
}
