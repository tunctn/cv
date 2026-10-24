/**
 * English-only legal text, by design (the page notes this in other
 * languages). Excluded from the i18n lint rule in biome.json.
 */
export function TermsBody() {
  return (
    <>
      <p>By using SmileCV (smilecv.com) you agree to these terms.</p>
      <h2>The service</h2>
      <p>
        SmileCV helps you write and format a CV. You can use it without paying.
        Some features may become paid later; if that happens, we will say so on
        the site first. The service is provided as is, without guarantees of
        availability or fitness for a particular purpose.
      </p>
      <h2>Your content</h2>
      <p>
        You own what you write. You are responsible for making sure your CV is
        accurate. The AI assistant can make mistakes, so check its suggestions
        before you send your CV anywhere.
      </p>
      <h2>Fair use</h2>
      <p>
        Don't use the service to break the law, to impersonate others, or to
        overload it. We may suspend accounts that do.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms or the service. Questions:{" "}
        <a className="underline" href="mailto:support@smilecv.com">
          support@smilecv.com
        </a>
        .
      </p>
    </>
  );
}
