/**
 * @file   apps/web/src/screens/PrivacyPage.tsx
 * @brief  `/privacy`: what the game stores about a person, why, for how long, and how to have it
 *         deleted or exported (DECISIONS D61).
 *
 * Responsibility: one plain-English page, no login needed. The facts are the ones the server
 *                 keeps (its auth stores, the export in ../account/AccountPage.tsx): a standalone
 *                 account's name, e-mail, password hash, sessions and, for an admin, the second
 *                 factor; a show keeps the name beside the case. In website mode the account
 *                 belongs to the website, which deletes and exports it; the page says so. The
 *                 contact comes from the server's config (`SC_PRIVACY_CONTACT`); until the
 *                 operator sets one, the page names "the operator of this site".
 * Depends on:     ../lib/router.js, ../account/account.css
 */
import '../account/account.css';
import { Link } from '../lib/router.js';

const FALLBACK_CONTACT = 'the operator of this site';

interface PrivacyPageProps {
  readonly website: boolean;
  readonly contact: string;
}

function Standalone() {
  return (
    <>
      <h2>What is stored, and why</h2>
      <ul>
        <li>Your name and e-mail address, to sign you in and to send you the mails you ask for.</li>
        <li>A hash of your password (never the password), to check it when you sign in.</li>
        <li>
          If you are an admin: the secret and the recovery codes of your second factor, to check
          your sign-in code.
        </li>
        <li>Your rank and role, which decide what you may pick and do.</li>
        <li>
          A session, so you stay signed in: it ends after seven days or when you sign out. A
          registration waiting for its e-mail link is dropped after one day, a reset link after one
          hour.
        </li>
        <li>
          Every show you play in: your name beside your case, the picks and the result, as part of
          the show&apos;s record and the chronicle.
        </li>
        <li>
          The server&apos;s logs, which hold the addresses and times of requests, are kept for 14
          days.
        </li>
      </ul>
      <h2>Delete or download</h2>
      <p>
        Your account stays until you delete it. On your <Link to="/account">account page</Link> you
        can download your data as a file, and delete your account with your password. The deletion
        removes your name, e-mail, password hash, second factor, sessions and any registration
        waiting for its e-mail. The shows keep your case, but name you &quot;deleted player&quot;:
        the sealed distribution of a show and its commitment do not change.
      </p>
    </>
  );
}

function Website() {
  return (
    <>
      <h2>Your account</h2>
      <p>
        Here you play with your account on the website. The website stores your name and sign-in
        data and decides how long; you delete or download them there, and its own privacy page
        applies to them.
      </p>
      <h2>In this game</h2>
      <p>
        Every show you play in keeps your name beside your case, as part of the show&apos;s record
        and the chronicle. When you delete your account on the website, the game is told and shows
        &quot;deleted player&quot; from then on; the sealed distribution of a show and its
        commitment do not change. The server&apos;s logs, which hold the addresses and times of
        requests, are kept for 14 days.
      </p>
    </>
  );
}

export function PrivacyPage({ website, contact }: PrivacyPageProps) {
  const who = contact.trim() === '' ? FALLBACK_CONTACT : contact.trim();
  return (
    <main className="page">
      <section className="card privacy-page" aria-label="Privacy">
        <h1>Privacy</h1>
        {website ? <Website /> : <Standalone />}
        <h2>Contact</h2>
        <p>For questions about your data, contact: {who}.</p>
      </section>
    </main>
  );
}
