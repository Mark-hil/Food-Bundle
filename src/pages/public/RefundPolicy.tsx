export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-20">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-8">Refund Policy</h1>
          <p className="text-slate-600 mb-8">Last updated: April 2026</p>

          <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Order Cancellation</h2>
              <p>Customers may cancel orders and receive a full refund if:</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>The cancellation request is made at least 2 hours before the scheduled delivery time</li>
                <li>The order has not yet entered the preparation phase</li>
                <li>The refund will be processed within 3-5 business days</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Quality Issues</h2>
              <p>If you receive a meal that does not meet our quality standards, we will:</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>Arrange a replacement meal at no additional cost</li>
                <li>Provide a full refund if you prefer not to receive a replacement</li>
                <li>Process the refund or replacement within 24 hours of receiving your complaint</li>
                <li>Require photographic evidence of the quality issue</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Late Delivery</h2>
              <p>If your order arrives more than 30 minutes past the scheduled delivery time:</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>You may request a partial refund of delivery fees</li>
                <li>For delays exceeding 1 hour, you may request a full refund</li>
                <li>Provide evidence of the late delivery (timestamps, screenshots)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Missing Items</h2>
              <p>If items are missing from your order:</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>Report the issue within 24 hours of delivery</li>
                <li>We will replace the missing items or refund their value</li>
                <li>Proof of purchase (order receipt) is required</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Subscription Refunds</h2>
              <p>For subscription plans:</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>You may cancel anytime without penalty</li>
                <li>Refunds are processed proportionally for the remaining subscription period</li>
                <li>Unused credits in your account can be refunded at cancellation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Non-Refundable Items</h2>
              <p>The following are non-refundable:</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>Orders consumed entirely or partially</li>
                <li>Orders cancelled less than 2 hours before delivery</li>
                <li>Orders where the customer was unavailable at delivery</li>
                <li>Promotional discounts or gift cards</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Refund Processing</h2>
              <p>Refunds are processed as follows:</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>Original payment method: 5-7 business days</li>
                <li>Mobile money: 2-3 business days</li>
                <li>Bank transfers: 3-5 business days</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Refund Requests</h2>
              <p>To request a refund:</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>Contact our support team within 24 hours of delivery</li>
                <li>Provide your order number and details of the issue</li>
                <li>Include relevant photographic evidence if applicable</li>
                <li>Our team will review and respond within 24 hours</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Dispute Resolution</h2>
              <p>If you disagree with a refund decision:</p>
              <ul className="list-disc list-inside mt-4 space-y-2">
                <li>Contact our support manager at support@food-bundle.com</li>
                <li>Provide comprehensive documentation of your claim</li>
                <li>We will investigate and respond within 48 hours</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Contact Us</h2>
              <p>For refund-related inquiries:</p>
              <p className="mt-4">Email: refunds@food-bundle.com</p>
              <p>Phone: +233 241 626 072</p>
              <p>Available: Monday - Friday, 8am - 6pm</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
