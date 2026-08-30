"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, BarChart3, ShoppingBag, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Overview & Demo",
      href: "/",
      icon: Sparkles,
    },
    {
      label: "Merchant Copilot",
      href: "/merchant",
      icon: BarChart3,
      badge: "Revenue AI",
    },
    {
      label: "AI Buyer Storefront",
      href: "/shop",
      icon: ShoppingBag,
      badge: "Agentic Shop",
    },
    {
      label: "Audit & Safety Trail",
      href: "/audit",
      icon: ShieldCheck,
      badge: "Compliance",
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <Link href="/" className="flex items-center space-x-3 group py-1 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-sm">
            <Zap className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-normal">RazorGrow AI</span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 shrink-0">
                TRACK 1 BUILDATHON
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">Autonomous Agentic Commerce for Razorpay</p>
          </div>
        </Link>

        <nav className="flex items-center space-x-1 sm:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-slate-500")} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      "hidden sm:inline-block rounded-full px-1.5 py-0.2 text-[10px] font-medium",
                      isActive
                        ? "bg-blue-200/60 text-blue-800"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Razorpay Test Mode Active
          </span>
        </div>
      </div>
    </header>
  );
}
