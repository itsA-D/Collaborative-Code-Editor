import {
  captureEvent,
  createThrottledCapture,
  identifyUser,
  resetAnalyticsIdentity,
  type SafeProperties,
} from './posthog';

const LANGUAGE_LABELS: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  js: 'JavaScript',
};

export function languageLabel(raw?: string): string | undefined {
  if (!raw) return undefined;
  return LANGUAGE_LABELS[raw.toLowerCase()] || raw.slice(0, 32);
}

export type StartCodingSource = 'homepage' | 'how_it_works' | 'explore';
export type DeleteSource = 'explore' | 'ide';
export type ThemeName = 'dark' | 'light';

export const CODE_EDIT_THROTTLE_MS = 15000;
export const RUN_THROTTLE_MS = 30000;

export const analytics = {
  startCodingClicked(source: StartCodingSource): void {
    captureEvent('start_coding_clicked', { source });
  },

  ideOpened(properties: { authenticated: boolean; language?: string }): void {
    captureEvent('ide_opened', {
      authenticated: properties.authenticated,
      language: languageLabel(properties.language),
    });
  },

  /** Never called per keystroke: use `codeEditedThrottled` from the editor. */
  codeEdited(properties: { language?: string; editor: string; collaborative: boolean }): void {
    captureEvent('code_edited', {
      language: languageLabel(properties.language),
      editor: properties.editor,
      file_type: languageLabel(properties.language),
      collaborative: properties.collaborative,
    });
  },

  codeEditedThrottled(
    getProperties: () => { language?: string; editor: string; collaborative: boolean }
  ): () => void {
    return createThrottledCapture('code_edited', () => {
      const properties = getProperties();
      const label = languageLabel(properties.language);
      return {
        language: label,
        editor: properties.editor,
        file_type: label,
        collaborative: properties.collaborative,
      };
    }, CODE_EDIT_THROTTLE_MS);
  },

  /**
   * The IDE has no Run button: the live preview is what actually executes the
   * user's code, so that execution is the run milestone. `trigger` keeps the
   * distinction queryable.
   */
  runExecutedThrottled(getProperties: () => { language?: string }): () => void {
    return createThrottledCapture(
      'run_clicked',
      () => ({ language: languageLabel(getProperties().language), trigger: 'live_preview' }),
      RUN_THROTTLE_MS
    );
  },

  collaborationStarted(properties: { language?: string }): void {
    captureEvent('collaboration_started', { language: languageLabel(properties.language) });
  },

  collaborationJoined(properties: { language?: string }): void {
    captureEvent('collaboration_joined', { language: languageLabel(properties.language) });
  },

  snippetCreated(properties: { authenticated: boolean; source?: string }): void {
    captureEvent('snippet_created', {
      authenticated: properties.authenticated,
      source: properties.source || 'temporary_session',
    });
  },

  snippetSaved(properties: { authenticated: boolean; source?: string }): void {
    captureEvent('snippet_saved', {
      authenticated: properties.authenticated,
      source: properties.source || 'ide',
    });
  },

  snippetOpened(properties: { authenticated: boolean; language?: string }): void {
    captureEvent('snippet_opened', {
      authenticated: properties.authenticated,
      language: languageLabel(properties.language),
    });
  },

  snippetDeleted(properties: { authenticated: boolean; source: DeleteSource }): void {
    captureEvent('snippet_deleted', {
      authenticated: properties.authenticated,
      source: properties.source,
    });
  },

  loginCompleted(): void {
    captureEvent('login_completed');
  },

  logout(): void {
    captureEvent('logout');
  },

  themeChanged(theme: ThemeName): void {
    captureEvent('theme_changed', { theme });
  },

  howItWorksViewed(): void {
    captureEvent('how_it_works_viewed');
  },
};

export { identifyUser, resetAnalyticsIdentity };
export type { SafeProperties };
