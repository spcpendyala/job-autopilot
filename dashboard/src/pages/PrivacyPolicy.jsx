export default function PrivacyPolicy() {
  const s = {
    page: { background: '#080808', minHeight: '100vh', color: '#f0f0f0', fontFamily: 'system-ui, sans-serif' },
    inner: { maxWidth: 720, margin: '0 auto', padding: '60px 24px' },
    h1: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
    h2: { fontSize: 18, fontWeight: 600, marginTop: 36, marginBottom: 10, color: '#e0e0e0' },
    p: { lineHeight: 1.7, color: '#c0c0c0', marginBottom: 12 },
    ul: { paddingLeft: 20, color: '#c0c0c0', lineHeight: 1.8 },
    updated: { fontSize: 13, color: '#888', marginBottom: 32 },
    footer: { marginTop: 60, paddingTop: 20, borderTop: '1px solid #222', fontSize: 13, color: '#666', textAlign: 'center' },
    a: { color: '#6366f1', textDecoration: 'none' },
  }
  return (
    <div style={s.page}>
      <div style={s.inner}>
        <h1 style={s.h1}>Privacy Policy</h1>
        <p style={s.updated}>Last Updated: May 27, 2026</p>

        <h2 style={s.h2}>What We Collect</h2>
        <p style={s.p}>Job AutoPilot collects the following information to provide the job search service:</p>
        <ul style={s.ul}>
          <li>Name, email address, and Google profile photo (via Google OAuth)</li>
          <li>Career information you provide: work experience, skills, education, job preferences</li>
          <li>Résumé files you upload (PDF, DOCX, TXT)</li>
          <li>Job applications you track, including company names, roles, and application status</li>
          <li>Usage data: pages visited, features used, feedback submitted</li>
        </ul>

        <h2 style={s.h2}>How We Use It</h2>
        <p style={s.p}>Your data is used exclusively to power your job search:</p>
        <ul style={s.ul}>
          <li>Synthesize your career profile from uploaded résumés</li>
          <li>Discover and score job listings from public job boards</li>
          <li>Generate tailored résumés and cover letters for specific roles</li>
          <li>Track your applications and automate follow-up drafts</li>
          <li>Improve AI output quality by learning from your feedback signals</li>
        </ul>
        <p style={s.p}>We do not sell your data. We do not use your data for advertising.</p>

        <h2 style={s.h2}>Google OAuth & Gmail</h2>
        <p style={s.p}>
          When you sign in with Google, we receive your name, email address, and profile picture.
          If you grant Gmail access, we read email headers and snippets to classify job responses
          (interview requests, rejections, offers). We do not store email body content beyond
          short snippets used for classification. Gmail access is optional and can be revoked
          at any time from your Google Account settings.
        </p>

        <h2 style={s.h2}>Anthropic API</h2>
        <p style={s.p}>
          Job AutoPilot uses the Anthropic Claude API to generate AI content. Your profile data,
          résumé, and job descriptions are sent to Anthropic's API for processing. Anthropic's
          data handling is governed by their{' '}
          <a style={s.a} href="https://www.anthropic.com/privacy" target="_blank" rel="noreferrer">privacy policy</a>.
          We use prompt caching which may retain prompt data briefly on Anthropic's servers.
        </p>

        <h2 style={s.h2}>Data Storage</h2>
        <p style={s.p}>
          All your data is stored on a dedicated server (GCP e2-micro) accessible only to the
          service. Data is stored in a SQLite database and local file system. We do not use
          shared cloud databases. Your uploaded résumé files and generated documents are
          stored only on this server.
        </p>

        <h2 style={s.h2}>Data Retention</h2>
        <p style={s.p}>
          Your data is retained for as long as you maintain an account. You can delete your
          account and all associated data at any time from Settings → Delete Account.
          Deletion is permanent and cannot be undone.
        </p>

        <h2 style={s.h2}>Third-Party Services</h2>
        <ul style={s.ul}>
          <li><b>Google</b> — Authentication and optional Gmail/Drive access</li>
          <li><b>Anthropic</b> — AI text generation (Claude API)</li>
          <li><b>Jina Reader</b> — Web scraping of public job posting URLs</li>
          <li>Public job boards (Remotive, Himalayas, Jobicy, etc.) — No personal data is sent</li>
        </ul>

        <h2 style={s.h2}>Your Rights</h2>
        <p style={s.p}>You have the right to:</p>
        <ul style={s.ul}>
          <li>Access all data we hold about you (export via Settings → Export CSV)</li>
          <li>Correct inaccurate profile data (edit via the Profile page)</li>
          <li>Delete your account and all data (Settings → Delete Account)</li>
          <li>Revoke Google access at any time via your Google Account settings</li>
        </ul>

        <h2 style={s.h2}>Contact</h2>
        <p style={s.p}>
          For privacy questions or data requests, contact us at{' '}
          <a style={s.a} href="mailto:privacy@jobautopilot.app">privacy@jobautopilot.app</a>.
        </p>

        <div style={s.footer}>
          <a href="/" style={s.a}>← Back to App</a>
          {' · '}
          <a href="/terms" style={s.a}>Terms of Service</a>
        </div>
      </div>
    </div>
  )
}
