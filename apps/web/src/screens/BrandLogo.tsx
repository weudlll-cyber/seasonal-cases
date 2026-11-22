/**
 * @file   apps/web/src/screens/BrandLogo.tsx
 * @brief  The Seasonal Entertainment logo, one picture per theme (DECISIONS D28).
 *
 * Responsibility: the full logo with its lettering in light theme, the round emblem without it
 *                 in dark theme (the dark lettering vanishes on night blue), as the website's
 *                 FormLogo (its client/src/brand/FormLogo.jsx). Which one shows is CSS on the
 *                 kit's `data-theme` (`.brand-logo` in ./screens.css); the hidden one is lazy, so
 *                 it is not loaded until the theme asks for it.
 * Depends on:     assets/brand/logo.webp, assets/brand/emblem.webp (assets/README.md)
 */
import emblem from '../../../../assets/brand/emblem.webp';
import logo from '../../../../assets/brand/logo.webp';

export function BrandLogo({ className }: { className?: string }) {
  const extra = className === undefined ? '' : ` ${className}`;
  return (
    <>
      <img
        className={`brand-logo brand-logo-light${extra}`}
        src={logo}
        alt=""
        width="320"
        height="337"
        loading="lazy"
      />
      <img
        className={`brand-logo brand-logo-dark${extra}`}
        src={emblem}
        alt=""
        width="420"
        height="374"
        loading="lazy"
      />
    </>
  );
}
