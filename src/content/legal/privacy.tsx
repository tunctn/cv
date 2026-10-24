export const PrivacyBody = () => (
  <>
    <p>
      SmileCV (smilecv.com) is a CV builder run by Tunç Türkmen
      (support@smilecv.com). This page explains what data it keeps and why.
    </p>
    <h2>What we store</h2>
    <ul>
      <li>
        Your account: name, email address and, if you sign in with Google, your
        profile picture.
      </li>
      <li>
        The CVs you create, including any photo you upload, and your chat with
        the AI assistant.
      </li>
      <li>Session data (a cookie) to keep you signed in.</li>
    </ul>
    <h2>Cookies and local storage</h2>
    <p>
      We use no analytics, advertising or tracking cookies. Essential cookies
      are always on; functional cookies and analytics recordings are used only
      if you allow them in the cookie banner. You can change your choice at any
      time with &quot;Cookie settings&quot; in the footer.
    </p>
    <ul>
      <li>
        <strong>Essential</strong>: <code>better-auth.session_token</code> keeps
        you signed in (also as a guest); <code>cv_consent</code> stores your
        cookie choice (1 year); <code>PARAGLIDE_LOCALE</code> remembers the
        language you picked; <code>cv_dock</code> remembers where you placed the
        chat in the editor (1 year). Your theme and recently used colours are
        kept in your browser&apos;s local storage and never sent to us.
      </li>
      <li>
        <strong>Functional</strong> (with your consent): <code>cv_vid</code>, a
        browser identifier for guests (see Guest limits below, 1 year), and{" "}
        <code>better-auth.last_used_login_method</code>, which shows which
        sign-in method you used last time (30 days). Without consent, guest
        limits are counted per guest account only.
      </li>
      <li>
        <strong>Analytics</strong> (with your consent): session recordings,
        heatmaps and a pseudonymous visitor id, described under Analytics below.
        These set no cookies.
      </li>
    </ul>
    <h2>Analytics</h2>
    <p>
      We use Umami, a privacy-friendly analytics tool that we host ourselves on
      our server in the EU (analytics.wust.co). Nothing is shared with third
      parties.
    </p>
    <ul>
      <li>
        <strong>Visit and product statistics</strong> (always on): page views
        and events such as &quot;CV created&quot;, &quot;PDF exported&quot; or
        &quot;AI message sent&quot;, with your browser, device type, country and
        referring site. Umami sets no cookies, stores nothing in your browser
        and does not keep your IP address; visits are counted with a hash that
        changes daily, so they cannot be linked to you. Event data never
        contains your name, email, CV text or chat messages. If your browser
        sends Do Not Track, nothing is recorded.
      </li>
      <li>
        <strong>Session recordings and heatmaps</strong> (only with analytics
        consent): for a sample of visits, how pages are used (clicks, scrolling,
        mouse movement, which buttons were pressed) is recorded for up to 5
        minutes, so we can see where the site is confusing. Typed text is
        masked, and your CVs, the AI chat, the account settings and the sign-in
        forms are hidden from recordings entirely. Recordings are deleted after
        30 days.
      </li>
      <li>
        <strong>Pseudonymous id</strong> (only with analytics consent): when you
        are signed in, visits are tagged with a one-way hash of your account id
        (never your email or name), so we can see whether people come back.
      </li>
    </ul>
    <h2>How it is used</h2>
    <p>
      To run the service: saving your CVs, generating PDF and PNG files, and
      answering your chat messages; and to improve it, through the analytics
      described above. For each AI request we keep a record of its size
      (tokens), cost and time, linked to your account, to watch costs and stop
      abuse. The site owner can see accounts, CVs, chats and attached files to
      provide support and remove abuse, and can block accounts that misuse the
      service. We don&apos;t sell data or show ads.
    </p>
    <h2>AI processing</h2>
    <p>
      When you use the chat, your message and the CV content are sent to OpenAI
      to generate a reply. OpenAI does not use API data to train its models.
    </p>
    <h2>Google sign-in</h2>
    <p>
      If you sign in with Google we receive your name, email address and profile
      picture. We request no other Google data.
    </p>
    <h2>Guests and deletion</h2>
    <p>
      You can start without an account; that guest data is tied to a browser
      cookie. You can delete any CV at any time, and delete your account with
      all its CVs, history and files in Settings. You can also email{" "}
      <a className="underline" href="mailto:support@smilecv.com">
        support@smilecv.com
      </a>
      .
    </p>
    <h2>Guest limits</h2>
    <p>
      Guests can make one CV and send a few AI messages before signing up. To
      keep those limits fair, and only if you allow functional cookies, we
      compute a browser identifier (FingerprintJS) while you use the site as a
      guest and store it in a cookie. On our server we keep only a salted hash
      of it, with the number of CVs and AI messages used. It is used for nothing
      else and is not shared.
    </p>
    <h2>Where data lives</h2>
    <p>Data is stored on a Hetzner server in the EU.</p>
  </>
);
