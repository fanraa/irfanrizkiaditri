import { SEO } from "@/components/SEO";
import { PageTransition } from "@/components/PageTransition";

export function Terms() {
  return (
    <>
      <SEO title="Terms of Service" description="Terms of Service for Irfan Rizki Aditri web applications." url={window.location.href} />
      <PageTransition>
      <div className="w-full max-w-3xl mx-auto py-16 px-4 sm:px-8">
        <div className="space-y-8 text-slate-800">
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight text-slate-900 mb-2">Terms of Service</h1>
            <p className="text-slate-500 text-xs">Last updated: July 2026</p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-justify">
            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">1. Agreement to Terms</h2>
              <p>
                By accessing or using our website, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark law.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">2. Use License</h2>
              <p>
                Permission is granted to temporarily download one copy of the materials (information or software) on Perspective of Fanra's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose, or for any public display (commercial or non-commercial); attempt to decompile or reverse engineer any software contained on the website; remove any copyright or other proprietary notations from the materials; or transfer the materials to another person or "mirror" the materials on any other server.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">3. Disclaimer</h2>
              <p>
                The materials on Perspective of Fanra's website are provided on an 'as is' basis. Perspective of Fanra makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">4. Limitations</h2>
              <p>
                In no event shall Perspective of Fanra or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Perspective of Fanra's website, even if Perspective of Fanra or a Perspective of Fanra authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">5. Accuracy of Materials</h2>
              <p>
                The materials appearing on Perspective of Fanra's website could include technical, typographical, or photographic errors. Perspective of Fanra does not warrant that any of the materials on its website are accurate, complete, or current. Perspective of Fanra may make changes to the materials contained on its website at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900 mb-2">6. Links</h2>
              <p>
                Perspective of Fanra has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Perspective of Fanra of the site. Use of any such linked website is at the user's own risk.
              </p>
            </section>
          </div>
        </div>
      </div>
    </PageTransition>
    </>
  );
}