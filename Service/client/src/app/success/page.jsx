"use client";

import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const STATUS = {
  verifying: "Verifying payment...",
  success: "Payment confirmed! Check your email for a receipt.",
  failed: "We could not verify the payment. Please try again or contact support.",
  missing: "Invalid session. Please start checkout again.",
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const router = useRouter();
  const [state, setState] = useState("verifying");

  useEffect(() => {
    if (!sessionId) {
      setState("missing");
      return;
    }

    const verify = async () => {
      try {
        await axios.post("http://localhost:7000/payment/verify", { //ec2-3-7-59-155.ap-south-1.compute.amazonaws.com
          sessionId,
        });
        setState("success");
      } catch (err) {
        console.error(err);
        setState("failed");
      }
    };

    verify();
  }, [sessionId]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-3xl font-bold">Thank you for your purchase</h1>
      <p className="text-lg text-gray-600">{STATUS[state]}</p>
      {state === "failed" && (
        <button
          className="px-6 py-3 bg-black text-white rounded-full"
          onClick={() => router.push("/")}
        >
          Retry Checkout
        </button>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><p>Loading...</p></div>}>
      <SuccessContent />
    </Suspense>
  );
}
