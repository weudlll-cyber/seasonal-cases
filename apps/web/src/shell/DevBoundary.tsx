/**
 * @file   apps/web/src/shell/DevBoundary.tsx
 * @brief  An error boundary for the development-only parts of the header.
 *
 * Responsibility: the quick tools (./DevTools.tsx) load lazily in a development build, and a
 *                 failure in one of them must not take the game down: React unmounts a whole tree
 *                 that throws without a boundary. On the first browser-test run in CI the kit's
 *                 dev module ran on a second copy of React (Vite had discovered it late, in a
 *                 second optimisation), its hook threw, and no page rendered at all. The boundary
 *                 renders nothing for a tool that throws and leaves the page as it is. A class,
 *                 because React has no hook for it.
 * Depends on:     react
 */
import { Component, type ReactNode } from 'react';

interface State {
  readonly failed: boolean;
}

export class DevBoundary extends Component<{ readonly children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
