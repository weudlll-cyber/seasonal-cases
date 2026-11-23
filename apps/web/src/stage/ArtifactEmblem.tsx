/**
 * @file   apps/web/src/stage/ArtifactEmblem.tsx
 * @brief  An artifact as the stage shows it: a glowing emblem in its season colour and its name.
 *
 * Responsibility: one look for an artifact everywhere (stage, top bar, table, result). The
 *                 colour comes from the season (`season-<name>` in ./stage.css, the kit's season
 *                 tokens; the main prize's 'all' rotates through the four); the blank is muted.
 *                 The name is in the stage font (CONCEPT §7).
 * Depends on:     @sc/contracts (types)
 */
import type { Artifact } from '@sc/contracts';

export function ArtifactEmblem({
  artifact,
  size = 'small',
}: {
  artifact: Artifact;
  size?: 'small' | 'large';
}) {
  const blank = artifact.prizeSlot === null;
  return (
    <span
      className={`artifact artifact-${size} season-${artifact.season}${blank ? ' artifact-blank' : ''}`}
      data-artifact={artifact.name}
      title={artifact.name}
    >
      <span className="artifact-gem" aria-hidden="true" />
      <span className="artifact-name show-font">{artifact.name}</span>
    </span>
  );
}
