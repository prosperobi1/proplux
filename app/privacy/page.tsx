import { LegalPage, Clause, getSiteName } from "../components/LegalShell";

export const metadata = {
  title: "Privacy Policy",
  description: "How this marketplace collects, uses and protects your information.",
};

export default async function PrivacyPage() {
  const siteName = await getSiteName();
  const year = new Date().getFullYear();

  return (
    <LegalPage siteName={siteName} title="Privacy Policy" updated="October 2, 2026">
      <p
        className="border-l-2 pl-4 font-mono text-sm text-zinc-300"
        style={{ borderColor: "var(--brand-color, #dc2626)" }}
      >
        This policy explains what information {siteName} collects, how it is used, and how
        it is protected. By using the service you agree to the practices described here.
      </p>

      <Clause n="01" title="Information We Collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-zinc-200">Account data:</strong> e-mail address,
            username and password (stored only as a salted hash — never in plain text).
          </li>
          <li>
            <strong className="text-zinc-200">Financial data:</strong> balance, deposits,
            withdrawals and full transaction history.
          </li>
          <li>
            <strong className="text-zinc-200">Activity data:</strong> orders, reports,
            tickets and messages you send through the platform.
          </li>
          <li>
            <strong className="text-zinc-200">Seller data:</strong> listing content and
            files uploaded by sellers for their own listings.
          </li>
          <li>
            <strong className="text-zinc-200">Technical data:</strong> IP address, browser
            type, access logs and session information used to keep the service secure.
          </li>
        </ul>
      </Clause>

      <Clause n="02" title="How We Use It">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To operate the marketplace and deliver purchases you make.</li>
          <li>To process deposits, withdrawals and payouts to sellers.</li>
          <li>To answer support tickets and resolve order reports.</li>
          <li>
            To detect and prevent fraud, ban evasion, automation and abuse of the platform.
          </li>
          <li>To comply with legal obligations and enforce these terms.</li>
        </ul>
      </Clause>

      <Clause n="03" title="Payments">
        <p>
          Deposits are processed by an independent third-party payment processor. We never
          see, receive or store card or bank details — only the confirmation needed to
          credit your balance. Cryptocurrency transfers are recorded on their respective
          networks and are irreversible under the processor&apos;s rules.
        </p>
      </Clause>

      <Clause n="04" title="Cookies">
        <p>
          The site uses a single essential session cookie to keep you signed in. There are
          no third-party advertising or tracking cookies. You can clear the cookie at any
          time by signing out.
        </p>
      </Clause>

      <Clause n="05" title="What We Share">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Sellers receive only what is needed to fulfil your order (order reference and
            your platform username).
          </li>
          <li>We never sell, rent or trade your personal data to anyone.</li>
          <li>
            Data is disclosed to authorities only when legally required, or to enforce the
            rules against ban evasion and fraud.
          </li>
        </ul>
      </Clause>

      <Clause n="06" title="How Data Is Protected">
        <p>
          Passwords are hashed with bcrypt. Listing secrets stored by sellers are encrypted
          at rest with AES-256-GCM. All traffic is served over HTTPS. While no system is
          one hundred percent secure, access to internal data is limited to platform
          administration only.
        </p>
      </Clause>

      <Clause n="07" title="Data Retention">
        <p>
          Account and transaction records are kept while your account is active, and
          afterwards for as long as needed to preserve order history, ticket records and
          comply with legal requirements. Records are deleted or anonymized when no longer
          required.
        </p>
      </Clause>

      <Clause n="08" title="Your Rights">
        <p>
          You may request a copy of your personal data, or ask for its deletion, by opening
          a ticket through the ticket system. Deletion may be refused where transaction
          records must be retained by law or for dispute resolution.
        </p>
      </Clause>

      <Clause n="09" title="Age Limit">
        <p>
          This service is intended for adults aged 18 or over. We do not knowingly collect
          data from minors.
        </p>
      </Clause>

      <Clause n="10" title="Changes to This Policy">
        <p>
          {siteName} may update this privacy policy at any time. Continued use of the
          service after changes are posted constitutes acceptance of the revised policy.
        </p>
      </Clause>

      <Clause n="11" title="Copyright">
        <p>
          &copy; {year} {siteName}. All rights reserved. The design, text, logo, graphics
          and code of this site are protected by copyright and may not be reproduced,
          duplicated, copied or resold without written permission. Product names, trademarks
          and third-party marks remain the property of their respective owners.
        </p>
        <p>
          Content purchased through the marketplace — including listings, files, tutorials
          and scripts — remains subject to the use limitations in our Terms of Service.
        </p>
      </Clause>

      <Clause n="12" title="Contact">
        <p>
          Questions about this policy can be sent through the ticket system inside your
          account — every request is reviewed by staff.
        </p>
      </Clause>
    </LegalPage>
  );
}
