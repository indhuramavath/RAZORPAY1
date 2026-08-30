import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "RazorGrow AI — Autonomous Agentic Commerce Engine (Razorpay Buildathon)",
  description:
    "Autonomous AI commerce agent connecting merchant revenue intelligence with conversational shopping and bounded Razorpay test checkout.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased text-slate-900 flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
