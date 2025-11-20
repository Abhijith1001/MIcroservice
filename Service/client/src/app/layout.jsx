"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import { Bell, House, Search, ShoppingCart, TicketPercent } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export default function RootLayout({ children }) {
  const queryClient = new QueryClient();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#fafafa] text-gray-900`}
      >
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-gradient-to-b from-white via-[#fafafa] to-[#f1f3f6]">
            <header className="border-b border-gray-100 bg-white/90 backdrop-blur">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
                <Link href="/" className="flex items-center gap-3">
                  <Image src="/logo.png" alt="logo" width={46} height={46} className="rounded-xl" />
                  <div>
                    <p className="text-lg font-semibold tracking-tight">Leo Shop</p>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">
                      curated fashion
                    </p>
                  </div>
                </Link>

                <div className="hidden flex-1 items-center rounded-full border border-gray-200 bg-gray-50 px-4 py-2 shadow-inner md:flex">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for sneakers, tees, caps..."
                    className="ml-3 flex-1 bg-transparent text-sm text-gray-600 outline-none"
                  />
                  <button className="rounded-full bg-gray-900 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    Search
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <button className="hidden items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-gray-300 lg:flex">
                    <TicketPercent className="h-4 w-4 text-red-400" />
                    Offers
                  </button>
                  <button className="rounded-full border border-gray-200 p-2 text-gray-500 hover:text-gray-700">
                    <House className="h-5 w-5" />
                  </button>
                  <button className="rounded-full border border-gray-200 p-2 text-gray-500 hover:text-gray-700">
                    <Bell className="h-5 w-5" />
                  </button>
                  <button className="rounded-full border border-gray-200 p-2 text-gray-500 hover:text-gray-700">
                    <ShoppingCart className="h-5 w-5" />
                  </button>
                  <Image
                    src="/avatar.png"
                    alt="avatar"
                    width={36}
                    height={36}
                    className="rounded-full border border-gray-200"
                  />
                </div>
              </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-10">{children}</main>

            <footer className="border-t border-gray-100 bg-white/80">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-gray-500 lg:px-10">
                <span>© {new Date().getFullYear()} Leo Shop. All rights reserved.</span>
                <div className="flex gap-6 text-xs uppercase tracking-widest">
                  <button className="hover:text-gray-800">Help</button>
                  <button className="hover:text-gray-800">Returns</button>
                  <button className="hover:text-gray-800">Terms</button>
                </div>
              </div>
            </footer>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
