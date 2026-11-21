/**
 * @file   apps/web/src/stage/Badges.tsx
 * @brief  A player's website step icons next to their name (website mode, AUTH.md: "a member's
 *         Discord steps show in the game as on this site").
 *
 * Responsibility: only icons in the contract's exact form (`/media/step-icons/<32 hex>.webp`,
 *                 BadgeSchema) become images: the server checked them, and the client checks
 *                 again before it renders any address. Decorative: the name carries the meaning.
 * Depends on:     @sc/contracts
 */
import { BadgeSchema } from '@sc/contracts';

export function Badges({ badges }: { badges: readonly string[] }) {
  const shown = badges.filter((b) => BadgeSchema.safeParse(b).success);
  if (shown.length === 0) return null;
  return (
    <span className="badges" aria-hidden="true">
      {shown.map((b) => (
        <img key={b} src={b} alt="" className="badge-icon" width={16} height={16} />
      ))}
    </span>
  );
}
