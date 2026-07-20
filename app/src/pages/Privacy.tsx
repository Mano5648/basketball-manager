import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'

export default function Privacy() {
  return (
    <Layout>
      <div className="bg-deep-navy min-h-[70vh] py-16 px-4 md:px-8">
        <div className="max-w-3xl mx-auto mgr-panel p-8 md:p-10">
          <p className="font-inter text-xs uppercase tracking-[0.18em] text-slate-500">Legal</p>
          <h1 className="font-oswald font-bold text-3xl md:text-4xl text-white mt-2">Privacy Policy</h1>
          <p className="font-inter text-sm text-slate-400 mt-3">Last updated: 20 July 2026</p>

          <div className="mt-8 space-y-6 font-inter text-sm text-slate-300 leading-relaxed">
            <section>
              <h2 className="font-inter font-semibold text-white text-lg mb-2">Who we are</h2>
              <p>
                Dublin Lions Basketball Club (&quot;Dublin Lions BC&quot;, &quot;we&quot;, &quot;us&quot;) is the data controller for personal
                data collected through this website and club portals. Contact:{' '}
                <a href="mailto:secretary@dublinlions.ie" className="text-lions-300 hover:text-white">secretary@dublinlions.ie</a>.
              </p>
            </section>

            <section>
              <h2 className="font-inter font-semibold text-white text-lg mb-2">Irish and EU law</h2>
              <p>
                We process personal data in line with the General Data Protection Regulation (EU) 2016/679 (GDPR) as
                applied in Ireland, the Data Protection Act 2018, and guidance from the Data Protection Commission (DPC).
                You may lodge a complaint with the DPC at{' '}
                <a href="https://www.dataprotection.ie" className="text-lions-300 hover:text-white" target="_blank" rel="noopener noreferrer">
                  dataprotection.ie
                </a>.
              </p>
            </section>

            <section>
              <h2 className="font-inter font-semibold text-white text-lg mb-2">What we collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Account details: name, email, password (stored securely by our auth provider).</li>
                <li>Membership and roster information managed by club officials.</li>
                <li>Payment records: purchase history, amounts, and Stripe transaction references (we do not store full card numbers).</li>
                <li>Communications you send via contact forms or club chat.</li>
                <li>Technical data: IP address and security logs when needed to prevent fraud or abuse.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-inter font-semibold text-white text-lg mb-2">Why we use your data</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Contract</strong> — running memberships, registrations, ticket sales, and store orders.</li>
                <li><strong>Legitimate interests</strong> — club administration, security, and preventing spam or fraud.</li>
                <li><strong>Consent</strong> — where you opt in on forms (you may withdraw consent at any time).</li>
                <li><strong>Legal obligation</strong> — where required for tax, safeguarding, or regulatory purposes.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-inter font-semibold text-white text-lg mb-2">Processors and international transfers</h2>
              <p>
                We use trusted processors including Supabase (hosting and authentication), Stripe (payments), Resend (transactional
                emails), and Cloudflare Turnstile (bot protection). These providers may process data outside Ireland/EEA under
                appropriate safeguards such as Standard Contractual Clauses.
              </p>
            </section>

            <section>
              <h2 className="font-inter font-semibold text-white text-lg mb-2">Retention</h2>
              <p>
                We keep data only as long as needed for the purposes above — typically for the active membership season plus a
                reasonable period for financial and safeguarding records. Purchase records are retained as required for accounting.
              </p>
            </section>

            <section>
              <h2 className="font-inter font-semibold text-white text-lg mb-2">Your rights</h2>
              <p>Under GDPR you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Access a copy of your personal data</li>
                <li>Rectify inaccurate data</li>
                <li>Erase data where applicable (&quot;right to be forgotten&quot;)</li>
                <li>Restrict or object to certain processing</li>
                <li>Data portability where technically feasible</li>
                <li>Withdraw consent without affecting prior lawful processing</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, email{' '}
                <a href="mailto:secretary@dublinlions.ie" className="text-lions-300 hover:text-white">secretary@dublinlions.ie</a>.
              </p>
            </section>

            <section>
              <h2 className="font-inter font-semibold text-white text-lg mb-2">Security</h2>
              <p>
                We use HTTPS, access controls, bot protection, rate limiting, and payment processing through PCI-compliant
                providers. No system is 100% secure; please use a strong unique password and report suspected misuse promptly.
              </p>
            </section>

            <section>
              <h2 className="font-inter font-semibold text-white text-lg mb-2">Children</h2>
              <p>
                Where members are under 18, a parent or guardian should provide consent and manage account details as appropriate
                for youth membership.
              </p>
            </section>
          </div>

          <Link to="/" className="inline-block mt-8 font-inter text-sm text-lions-300 hover:text-white">
            ← Back to home
          </Link>
        </div>
      </div>
    </Layout>
  )
}
