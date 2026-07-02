import SEO from '../../components/SEO';

export default function Terms() {
  return (
    <>
      <SEO 
        title="Terms & Conditions | Student Food Bundle System"
        description="Read our terms and conditions for using the Student Food Bundle System."
        canonical="https://www.food-bundle.com/terms"
      />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-20">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms & Conditions</h1>
          <p className="text-slate-600 mb-8">Last updated: April 2026</p>

          <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
              <p>By accessing and using this website and our services, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Use License</h2>
              <p>Permission is granted to temporarily download one copy of the materials (information or software) on our website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to decompile or reverse engineer any software on the website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Disclaimer</h2>
              <p>The materials on our website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Limitations</h2>
              <p>In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Accuracy of Materials</h2>
              <p>The materials appearing on our website could include technical, typographical, or photographic errors. We do not warrant that any of the materials on our website are accurate, complete, or current. We may make changes to the materials contained on our website at any time without notice.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Links</h2>
              <p>We have not reviewed all of the sites linked to our website and are not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by us of the site. Use of any such linked website is at the user's own risk.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Modifications</h2>
              <p>We may revise these terms of service for our website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Governing Law</h2>
              <p>These terms and conditions are governed by and construed in accordance with the laws of Ghana, and you irrevocably submit to the exclusive jurisdiction of the courts located in Ghana.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Contact Information</h2>
              <p>If you have any questions about these Terms and Conditions, please contact us at:</p>
              <p className="mt-4">Email: legal@studentmeals.com</p>
              <p>Phone: +233 XXX XXX XXXX</p>
            </section>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
