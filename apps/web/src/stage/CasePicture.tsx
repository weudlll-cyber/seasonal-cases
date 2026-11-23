/**
 * @file   apps/web/src/stage/CasePicture.tsx
 * @brief  The case as a picture: a body seen a little from above and in front, a handle on its
 *         lid, a lid hinged at the body's back edge, two latches at the front (DECISIONS D49).
 *
 * Responsibility: one look for a case everywhere: the centre case, the cases on the stage and
 *                 the ceremony. Three states: closed; opening (the latches flip, the lid swings
 *                 open towards the viewer, the lining's glow grows, then the artifact rises, in
 *                 the phases of ./motion.ts); open (the end state, without motion). The walls,
 *                 the floor and the lid are faces in CSS 3D (./case.css, `perspective`); the
 *                 front's trim and the handle are SVG. The trim and the lining take the show's
 *                 season colour (`--season-tint`). The artifact is the caller's child: a caller
 *                 passes it only once the view carries it (CONCEPT §8), and the picture adds
 *                 nothing of its own about the content.
 * Depends on:     react (types)
 */
import type { ReactNode } from 'react';

export type CaseState = 'closed' | 'opening' | 'open';

export interface CasePictureProps {
  readonly state: CaseState;
  // The case's number on its front, in the stage font; none for a plain picture.
  readonly number?: number;
  // The artifact, only once the view carries it; risen above the rim, or sitting inside.
  readonly children?: ReactNode;
  readonly risen?: boolean;
}

/** The body's front: a rounded panel, its season trim and two corner guards. */
function FrontArt() {
  return (
    <svg className="cp-art" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true">
      <rect className="cp-panel" x="1" y="1" width="198" height="98" rx="10" />
      <rect className="cp-trim" x="1" y="6" width="198" height="7" />
      <rect className="cp-trim" x="1" y="86" width="198" height="5" />
      <path className="cp-guard" d="M1 70 V89 Q1 99 11 99 H30 V91 H14 Q9 91 9 86 V70 Z" />
      <path
        className="cp-guard"
        d="M199 70 V89 Q199 99 189 99 H170 V91 H186 Q191 91 191 86 V70 Z"
      />
    </svg>
  );
}

/** The handle standing on the lid: an arc with its two feet. */
function HandleArt() {
  return (
    <svg className="cp-handle-art" viewBox="0 0 100 40" aria-hidden="true">
      <path
        className="cp-handle-grip"
        d="M10 40 V22 Q10 6 26 6 H74 Q90 6 90 22 V40 H78 V24 Q78 18 72 18 H28 Q22 18 22 24 V40 Z"
      />
    </svg>
  );
}

export function CasePicture({ state, number, children, risen = false }: CasePictureProps) {
  const classes = ['case-picture', `is-${state}`, risen ? 'is-risen' : 'is-inside'];
  return (
    <span className={classes.join(' ')} data-state={state}>
      <span className="cp-scene">
        {/* The inside, seen through the opening: the walls' inner faces and the floor. */}
        <span className="cp-face cp-back" />
        <span className="cp-face cp-left" />
        <span className="cp-face cp-right" />
        <span className="cp-face cp-floor" />
        <span className="cp-glow" />
        {children !== undefined && <span className="cp-content">{children}</span>}
        <span className="cp-front">
          <FrontArt />
          {number !== undefined && <span className="cp-number show-font">{number}</span>}
          <span className="cp-latch cp-latch-left" />
          <span className="cp-latch cp-latch-right" />
        </span>
        {/* The lid: its outer face with the handle, its lined inner face, its front lip. */}
        <span className="cp-lid">
          <span className="cp-lid-outer">
            <span className="cp-handle">
              <HandleArt />
            </span>
          </span>
          <span className="cp-lid-inner" />
          <span className="cp-lid-lip" />
        </span>
      </span>
    </span>
  );
}
