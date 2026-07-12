import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";

export function Privacy() {
  return (
    <>
      <SEO title="Privacy Policy" description="Privacy Policy for Irfan Rizki Aditri web applications." url={window.location.href} />
      <PageTransition>
      <div className="w-full max-w-3xl mx-auto py-16 px-4 sm:px-8">
        <div className="space-y-8 text-slate-800">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight text-slate-900 mb-2">Privacy Policy</h1>
            <p className="text-slate-500 text-xs">Last updated: July 2026</p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-justify">
            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">1. Introduction</h2>
              <p>
                Welcome to Perspective of Fanra. We respect your privacy and are committed to protecting your personal data. This Privacy Policy will inform you about how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">2. The Data We Collect About You</h2>
              <p>
                Personal data, or personal information, means any information about an individual from which that person can be identified. It does not include data where the identity has been removed (anonymous data). We may collect, use, store, and transfer different kinds of personal data about you, including Identity Data, Contact Data, Technical Data, and Usage Data.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">3. How We Use Your Personal Data</h2>
              <p>
                We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances: where we need to perform the contract we are about to enter into or have entered into with you; where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests; and where we need to comply with a legal obligation.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">4. Data Security</h2>
              <p>
                We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">5. Data Retention</h2>
              <p>
                We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting, or reporting requirements. We may retain your personal data for a longer period in the event of a complaint or if we reasonably believe there is a prospect of litigation in respect to our relationship with you.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">6. Your Legal Rights</h2>
              <p>
                Under certain circumstances, you have rights under data protection laws in relation to your personal data. These include the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
              </p>
            </section>
          </div>
        </div>
      </div>
    </PageTransition>
    </>
  );
}