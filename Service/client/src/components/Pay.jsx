"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, ShoppingCart } from "lucide-react";
import Image from "next/image";

const Pay = ({ cart }) => {
  const total = cart.reduce((acc, item) => acc + item.price, 0).toFixed(2);
  const itemCount = cart.length;

  const { isPending, isError, mutate } = useMutation({
    mutationFn: async (cart) => {
      const response = await axios.post("http://localhost:7000/payment", {
        cart,
      });
      return response.data;
    },
  });

  const handleCheckout = () => {
    mutate(cart, {
      onSuccess: (data) => {
        if (data?.url) {
          window.location.href = data.url;
        }
      },
    });
  };

  return (
    <div className="w-full max-w-md bg-white border border-red-100 rounded-2xl shadow-sm p-6 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-red-400">
            CART SUMMARY
          </p>
          <p className="mt-2 text-xs text-gray-500">
            {itemCount} item{itemCount !== 1 ? "s" : ""} in your bag
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
            Total
          </p>
          <p className="text-2xl font-semibold tracking-tight text-gray-900">
            ${total}
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span className="font-medium">${total}</span>
        </div>
        <div className="flex items-center justify-between text-gray-400">
          <span>Shipping</span>
          <span className="text-xs uppercase tracking-wide">Calculated at checkout</span>
        </div>
        <div className="flex items-center justify-between text-gray-400">
          <span>Taxes</span>
          <span className="text-xs uppercase tracking-wide">Calculated at checkout</span>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-500">
        <input
          type="checkbox"
          id="terms"
          className="mt-[2px] h-3.5 w-3.5 rounded border-gray-300 text-red-400 focus:ring-red-300"
          defaultChecked={true}
        />
        <label htmlFor="terms" className="leading-snug">
          I agree to the{" "}
          <span className="text-red-400 font-medium">Terms and Conditions</span>
        </label>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Saved card
          </span>
          <Image src="/visa.png" alt="card" width={30} height={20} />
          <span className="text-xs font-medium">**** 3567</span>
        </div>
        <button className="text-[11px] font-medium text-red-400 hover:text-red-500">
          Change
        </button>
      </div>

      <button
        disabled={isPending}
        className="mt-1 inline-flex w-full items-center justify-center gap-3 rounded-full bg-black px-6 py-3 text-sm font-medium tracking-wide text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        onClick={handleCheckout}
      >
        <span>{isPending ? "Processing" : "Pay securely"}</span>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShoppingCart className="h-4 w-4" />
        )}
      </button>
      {isError && <span className="text-xs text-red-500">Something went wrong!</span>}
    </div>
  );
};

export default Pay;
