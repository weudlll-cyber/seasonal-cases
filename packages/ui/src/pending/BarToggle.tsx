/**
 * @file   packages/ui/src/pending/BarToggle.tsx
 * @brief  A toggle button for the kit's game bar: here the stage's sound, on or off.
 *
 * Responsibility: kit adoption item "kit: a toggle action in the game bar" (docs/BACKLOG.md 36):
 *                 the kit's `GameBar` actions open panels and its icons are chat, players, host
 *                 and full screen; a game puts this button into the bar's `lead`. A line icon
 *                 (a speaker, crossed out when off) beside its words, `aria-pressed`, the 44 px
 *                 target of the kit's buttons. Delete it once the kit has the action.
 * Depends on:     react (types)
 */
import type { ReactElement } from 'react';

const SPEAKER = 'M4 9h4l5-4v14l-5-4H4z';
const WAVES = 'M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11';
const CROSS = 'M16 9l5 6M21 9l-5 6';

export interface BarToggleProps {
  readonly on: boolean;
  readonly label: string;
  readonly onToggle: () => void;
  readonly className?: string;
}

export function BarToggle({
  on,
  label,
  onToggle,
  className = 'button',
}: BarToggleProps): ReactElement {
  return (
    <button
      type="button"
      className={`${className} sc-bar-toggle`}
      aria-pressed={on}
      title={`${label}: ${on ? 'on' : 'off'}`}
      onClick={onToggle}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d={SPEAKER} />
        <path d={on ? WAVES : CROSS} />
      </svg>
      <span className="sc-bar-toggle-label">{label}</span>
    </button>
  );
}
