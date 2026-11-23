/**
 * @file   packages/ui/src/pending/BarPress.tsx
 * @brief  A press button for the kit's game bar: here "Applaud".
 *
 * Responsibility: kit adoption item "kit: a press action in the game bar"
 *                 (docs/BACKLOG.md 41): the kit's `GameBar` actions open panels and its
 *                 `toggles` switch a setting (v0.11.0); a press that only sends has neither. A
 *                 game puts this button into the bar's `lead` (its `sc-bar-press` classes: icon
 *                 and words on a desktop, the icon alone on a phone, the 44 px target). A line icon of two clapping hands. Delete it once the
 *                 kit has the action.
 * Depends on:     react (types)
 */
import type { ReactElement } from 'react';

// Two palms meeting, and three lines of the clap.
const HANDS = 'M9 21l-3-6 4-8 2 1-2 5 4-7 2 1-3 6 3-4 2 1-4 7-2 4z';
const CLAP = 'M14 2v2M18 3l-1 2M20 7h-2';

export interface BarPressProps {
  readonly label: string;
  readonly tip: string;
  readonly onPress: () => void;
  readonly className?: string;
}

export function BarPress({
  label,
  tip,
  onPress,
  className = 'button',
}: BarPressProps): ReactElement {
  return (
    <button type="button" className={`${className} sc-bar-press`} title={tip} onClick={onPress}>
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d={HANDS} />
        <path d={CLAP} />
      </svg>
      <span className="sc-bar-press-label">{label}</span>
    </button>
  );
}
