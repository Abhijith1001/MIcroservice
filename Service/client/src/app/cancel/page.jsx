"use client";

import { useRouter } from "next/navigation";

const CancelPage = () => {
  const router = useRouter();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-3xl font-bold">Payment cancelled</h1>
      <p className="text-lg text-gray-600">
        Your payment was cancelled. You can return to your cart and try again.
      </p>
      <button
        className="px-6 py-3 bg-black text-white rounded-full"
        onClick={() => router.push("/")}
      >
        Back to Cart
      </button>
    </div>
  );
};

export default CancelPage;