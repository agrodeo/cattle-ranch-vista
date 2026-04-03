import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function RefundPolicy() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Refund Policy | agrodeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "agrodeo refund policy – 14-day money-back guarantee");
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-3 sm:px-4 py-8 overflow-x-hidden">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h1>Refund Policy</h1>
        <p className="text-muted-foreground">Last updated: March 11, 2026</p>

        <h2>14-Day Money-Back Guarantee</h2>
        <p>
          If you are not satisfied with your agrodeo subscription for any reason, you may request a full refund within <strong>14 days</strong> of your purchase date. No questions asked.
        </p>

        <h2>How to Request a Refund</h2>
        <p>
          To request a refund, contact us at <strong>fausto@agrodeo.farm</strong> within 14 days of your purchase. Please include the email address associated with your account.
        </p>

        <h2>Refund Processing</h2>
        <p>
          Once we receive your refund request, we will process it within 5–10 business days. The refund will be issued to the original payment method used for the purchase.
        </p>

        <h2>After the 14-Day Window</h2>
        <p>
          Refund requests received after the 14-day window will not be eligible for a refund. You may cancel your subscription at any time to prevent future charges, and you will retain access until the end of your current billing period.
        </p>

        <h2>App Store & Google Play Purchases</h2>
        <p>
          Subscriptions purchased through the Apple App Store or Google Play Store are subject to the refund policies of the respective platform. To request a refund for these purchases, please contact Apple or Google directly.
        </p>

        <h2>Contact</h2>
        <p>
          For refund requests or questions about this policy, email us at: <strong>fausto@agrodeo.farm</strong>
        </p>
      </div>
    </div>
  );
}
