import { LegalPage, Clause, getSiteName } from "../components/LegalShell";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of use, warranty and liability waiver for this marketplace.",
};

export default async function TermsPage() {
  const siteName = await getSiteName();

  return (
    <LegalPage siteName={siteName} title="Terms of Service" updated="October 2, 2026">
      <p
        className="border-l-2 pl-4 font-mono text-sm text-zinc-300"
        style={{ borderColor: "var(--brand-color, #dc2626)" }}
      >
        You agree to all of the rules and terms below prior to using our service. If you do
        not accept them, do not use this platform.
      </p>

      <Clause n="01" title="Terms of Use">
        <p>
          All items are sold to you conditioned upon your acceptance, without modification,
          of the terms, conditions and notices contained on this page. These terms apply to
          every purchase, sale and use of the service.
        </p>
      </Clause>

      <Clause n="02" title="Exclusive Obligation">
        <p>
          Items are sold for use in specific, permitted applications only. Using any item
          obtained from {siteName} for unlawful purposes is expressly prohibited under
          these terms and conditions.
        </p>
      </Clause>

      <Clause n="03" title="Use Limitation">
        <p>
          You may not copy, distribute, transmit, display, perform, reproduce, publish,
          license, create derivative works from, transfer or sell any information, content
          or item obtained from {siteName} or its listings.
        </p>
      </Clause>

      <Clause n="04" title="No Warranty">
        <p>
          Items are provided on an &ldquo;as is&rdquo; basis. We do not make guarantees as
          to the provenance, condition or fitness for a particular purpose of any item sold
          on the platform.
        </p>
      </Clause>

      <Clause n="05" title="Limitation of Liability">
        <p>
          In no event shall {siteName} be liable for any direct, indirect, punitive,
          incidental or special consequential damages whatsoever — whether arising out of or
          connected with the use or misuse of items bought by a buyer or sold by a seller
          through this service.
        </p>
      </Clause>

      <Clause n="06" title="Modification of Terms">
        <p>
          {siteName} reserves the right to change the terms, conditions and notices under
          which items are offered. Continued use of the service after changes are posted
          constitutes acceptance of the revised terms.
        </p>
      </Clause>

      <Clause n="07" title="Your Features">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            You have about <strong className="text-zinc-200">16 hours</strong> to open a
            report on an order for any problem — replacement or refund.
          </li>
          <li>All tools you buy are fresh and have not been used or sold before.</li>
          <li>You can buy any tool you need, with no limit.</li>
          <li>
            Every tools / tutorials / scripts company is scanned and checked before it is
            approved for sale.
          </li>
        </ul>
      </Clause>

      <Clause n="08" title="Our Rules">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Our service does not provide money-back from account balance.</li>
          <li>
            Do not try XSS, SQL injection, adding or subtracting from a price to buy it —
            it will not work, and attempts are treated as an exploit attempt.
          </li>
          <li>
            Do not put links to other stores, e-mail addresses or any form of advertising —
            you will be banned automatically.
          </li>
          <li>
            Do not try to contact sellers directly — if this happens, you will be banned
            automatically.
          </li>
          <li>
            Using automation scripts or tools on {siteName} (buy / deposit / open tickets
            and reports) is not allowed.
          </li>
          <li>
            It is extremely necessary to explain your problem in the ticket system with
            maximum detail — tickets without details cannot be investigated.
          </li>
        </ul>
      </Clause>

      <Clause n="09" title="BAN Rules">
        <p className="text-zinc-300">You will be banned for:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Cheating, rude ticket requests, potential hacking, ticket flooding and any
            other suspicious activity.
          </li>
          <li>
            Trying XSS, SQL injection, or adding / subtracting from a price to buy it —
            such attempts will not work.
          </li>
          <li>Trying to contact sellers outside the platform — ban is automatic.</li>
          <li>
            Any attempt to circumvent a ban, restrict another user, or abuse the report
            system.
          </li>
        </ul>
      </Clause>
    </LegalPage>
  );
}
