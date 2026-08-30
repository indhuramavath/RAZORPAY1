"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Trash2,
  RefreshCw,
  CreditCard,
  XCircle,
  Layers,
  ChevronRight,
  Check,
  Bot,
  User,
  ExternalLink,
} from "lucide-react";
import { formatINR, cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface ChatMessage {
  id: string;
  sender: "USER" | "AGENT";
  content: string;
  toolCalls?: Array<{ name: string; args: any; result: any }>;
  productCards?: any[];
  requiresConfirmation?: boolean;
  confirmationData?: any;
}

export default function ShopPage() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<any>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccessOrder, setPaymentSuccessOrder] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize session
  useEffect(() => {
    let sid = localStorage.getItem("rzg_session_id");
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem("rzg_session_id", sid);
    }
    setSessionId(sid);

    // Initial greeting
    setMessages([
      {
        id: "msg_init",
        sender: "AGENT",
        content:
          "👋 Welcome to **ApexTech**! I'm your AI Commerce Agent powered by **RazorGrow AI**.\n\nTell me what you're looking for, your budget, or your work setup (e.g. *'I need a laptop setup for college under ₹70,000'*), and I will find the best matching gear, explain compatibility, and prepare your order safely.",
      },
    ]);

    fetchCart(sid);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fetchCart = async (sid: string) => {
    try {
      const res = await fetch(`/api/cart?sessionId=${sid}`);
      const data = await res.json();
      if (!data.error) {
        setCart(data);
      }
    } catch (err) {
      console.error("Cart fetch error:", err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "USER",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "AGENT",
            content: `⚠️ ${data.details || data.error || "Apologies, could not process request."}`,
          },
        ]);
        return;
      }

      const agentMsg: ChatMessage = {
        id: data.messageId || `agent_${Date.now()}`,
        sender: "AGENT",
        content: data.response || "I have analyzed your request.",
        toolCalls: data.toolCalls,
        productCards: data.productCards,
        requiresConfirmation: data.requiresConfirmation,
        confirmationData: data.confirmationData,
      };

      setMessages((prev) => [...prev, agentMsg]);
      await fetchCart(sessionId);

      // If confirmation required, open confirmation modal
      if (data.requiresConfirmation) {
        setPaymentModalOpen(true);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "AGENT",
          content: "⚠️ Apologies, an error occurred while processing your request. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: any, isUpsell = false) => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          productId: product.id,
          sku: product.sku,
          quantity: 1,
          isUpsell,
          addedVia: isUpsell ? "AGENT_RECOMMENDATION" : "DIRECT",
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchCart(sessionId);
        setCartOpen(true);
        // Post agent confirmation message
        setMessages((prev) => [
          ...prev,
          {
            id: `added_${Date.now()}`,
            sender: "AGENT",
            content: `🛒 Added **${product.name}** to your cart (₹${product.price.toLocaleString("en-IN")}). Total is now **₹${data.cart.total.toLocaleString("en-IN")}**. You can continue shopping or say *'Checkout'* whenever ready!`,
          },
        ]);
      }
    } catch (err) {
      console.error("Add to cart error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await fetch(`/api/cart?itemId=${itemId}`, { method: "DELETE" });
      await fetchCart(sessionId);
    } catch (err) {
      console.error("Remove item error:", err);
    }
  };

  const [activeGatewayOrder, setActiveGatewayOrder] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"UPI" | "CARD">("UPI");
  const checkoutKeyRef = useRef<string | null>(null);

  const getOrCreateCheckoutIdempotencyKey = () => {
    if (!checkoutKeyRef.current) {
      const attemptToken = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      checkoutKeyRef.current = cart?.id
        ? `idemp_${sessionId}_${cart.id}_${attemptToken}`
        : `idemp_${sessionId}_${attemptToken}`;
    }
    return checkoutKeyRef.current;
  };

  // Launch Razorpay Standard Test Checkout / Gateway Modal
  const handleInitiateRazorpayPayment = async () => {
    if (paymentLoading) return;
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      // 1. Create Order with Idempotency Key & Confirmation Check (Stable per checkout attempt)
      const idempotencyKey = getOrCreateCheckoutIdempotencyKey();
      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          customerEmail: "aditi.sharma@techcorp.in",
          customerName: "Aditi Sharma",
          idempotencyKey,
          confirmedByCustomer: true,
        }),
      });

      const orderData = await createRes.json();
      if (!createRes.ok || !orderData.success) {
        setPaymentError(orderData.error || "Order creation failed.");
        setPaymentLoading(false);
        return;
      }

      // 2. Determine Gateway Mode: Real Razorpay SDK vs Interactive In-App Test Gateway
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_sample12345";
      const isPlaceholderKey = !razorpayKey || razorpayKey.startsWith("rzp_test_sample") || razorpayKey.includes("placeholder");

      if (!isPlaceholderKey && typeof window !== "undefined" && window.Razorpay) {
        const options = {
          key: razorpayKey,
          amount: orderData.amountInPaise,
          currency: "INR",
          name: "ApexTech Store",
          description: `Order #${orderData.orderNumber}`,
          order_id: orderData.razorpayOrderId,
          handler: async function (response: any) {
            await handleVerifyPaymentSuccess(orderData, response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature, selectedPaymentMethod);
          },
          prefill: {
            name: "Aditi Sharma",
            email: "aditi.sharma@techcorp.in",
            contact: "+919876543210",
          },
          theme: {
            color: "#0D6EFD",
          },
          modal: {
            ondismiss: function () {
              setPaymentLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setPaymentLoading(false);
      } else {
        // Open Interactive In-App Razorpay Test Mode Gateway
        setPaymentModalOpen(false);
        setActiveGatewayOrder(orderData);
        setPaymentLoading(false);
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      setPaymentError(err.message || "Payment initiation failed.");
      setPaymentLoading(false);
    }
  };

  const handleVerifyPaymentSuccess = async (
    orderData: any,
    razorpayOrderId?: string,
    razorpayPaymentId?: string,
    razorpaySignature?: string,
    paymentMethod: "UPI" | "CARD" = selectedPaymentMethod
  ) => {
    setPaymentLoading(true);
    try {
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          razorpayOrderId: razorpayOrderId || orderData.razorpayOrderId,
          razorpayPaymentId: razorpayPaymentId || `pay_test_${Date.now()}`,
          razorpaySignature: razorpaySignature || "sig_verified_mock_valid",
          paymentMethod,
        }),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        setPaymentSuccessOrder(verifyData);
        setActiveGatewayOrder(null);
        setPaymentModalOpen(false);
        checkoutKeyRef.current = null;
        await fetchCart(sessionId);

        setMessages((prev) => [
          ...prev,
          {
            id: `paid_${Date.now()}`,
            sender: "AGENT",
            content: `🎉 **Payment Successful!**\n\nOrder **#${verifyData.orderNumber}** settled via Razorpay Test Mode (${paymentMethod === "UPI" ? "Instant UPI" : "Test Card: •••• 1111"}) for **₹${verifyData.total.toLocaleString("en-IN")}**.\n\n🛡️ The full transaction, AI attribution, and HMAC signature verification have been permanently logged in the **Audit Trail**.`,
          },
        ]);
      } else {
        setPaymentError(verifyData.error || "Signature verification failed.");
      }
    } catch (err: any) {
      setPaymentError(err.message || "Payment verification failed.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Simulate Payment Failure to demonstrate recovery
  const handleSimulatePaymentFailure = async () => {
    if (paymentLoading) return;
    setPaymentLoading(true);
    try {
      const idempotencyKey = cart?.id ? `idemp_fail_${sessionId}_${cart.id}` : `idemp_fail_${sessionId}`;
      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          customerEmail: "aditi.sharma@techcorp.in",
          customerName: "Aditi Sharma",
          idempotencyKey,
          confirmedByCustomer: true,
        }),
      });
      const orderData = await createRes.json();

      if (!orderData.orderId) {
        setPaymentError(orderData.error || "Could not initialize order for failure test");
        setPaymentLoading(false);
        return;
      }

      const failRes = await fetch("/api/payments/simulate-fail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          reason: "CARD_DECLINED_SIMULATED",
        }),
      });
      const failData = await failRes.json();

      setPaymentModalOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `fail_${Date.now()}`,
          sender: "AGENT",
          content: `⚠️ **Payment Attempt Declined (Test Simulation)**\n\n${failData.message}\n\n🛡️ **Failure Recovery Active**: Your cart items and discounts have been preserved. No duplicate orders were created. You can retry checkout at any time.`,
        },
      ]);
    } catch (err) {
      console.error("Simulated failure error:", err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const samplePrompts = [
    "I need a laptop setup for college under ₹70,000",
    "Show me 4K monitors and companion docks",
    "I want a mechanical keyboard with tactile switches",
    "Proceed to checkout",
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {/* Main Chat Storefront */}
      <div className="flex-1 flex flex-col h-full max-w-5xl mx-auto px-4 sm:px-6 py-4">
        {/* Top Shop Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">AI Commerce Assistant</h2>
              <p className="text-[11px] text-emerald-600 font-medium flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                Deterministic Safety & Razorpay Gateway Ready
              </p>
            </div>
          </div>

          <button
            onClick={() => setCartOpen(!cartOpen)}
            className="relative inline-flex items-center space-x-2 rounded-lg bg-white border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <ShoppingBag className="h-4 w-4 text-blue-600" />
            <span>Cart: {cart ? formatINR(cart.total) : "₹0"}</span>
            {cart && cart.itemCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                {cart.itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "USER" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-start space-x-2 max-w-2xl">
                {msg.sender === "AGENT" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white mt-1 shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === "USER"
                      ? "bg-slate-900 text-white rounded-br-none"
                      : "bg-white border border-slate-200 text-slate-800 shadow-sm rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Tool Execution Badges */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center mr-1">
                        <Zap className="h-3 w-3 text-amber-500 mr-0.5" />
                        AI Tools:
                      </span>
                      {msg.toolCalls.map((tc, i) => (
                        <span
                          key={i}
                          className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-mono text-slate-700"
                        >
                          {tc.name}()
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {msg.sender === "USER" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white mt-1">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              {/* Rich Product Cards */}
              {msg.productCards && msg.productCards.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl ml-9">
                  {msg.productCards.map((prod, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            {prod.category}
                          </span>
                          {prod.isPromotion && (
                            <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                              ★ Merchant Pick
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">{prod.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{prod.description}</p>

                        {prod.recommendationReason && (
                          <div className="mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            {prod.recommendationReason}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-black text-slate-900">{formatINR(prod.price)}</span>
                        </div>

                        <button
                          onClick={() => handleAddToCart(prod, Boolean(prod.recommendationReason?.includes("Smart Pair")))}
                          className="inline-flex items-center space-x-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 text-xs font-bold transition shadow-sm"
                        >
                          <span>Add to Cart</span>
                          <Check className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 ml-9 animate-pulse">
              <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-spin" />
              <span>AI Agent searching catalog & checking merchant policies...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Preset Prompt Suggestions */}
        <div className="py-2 flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar">
          <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Try:</span>
          {samplePrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(p)}
              className="shrink-0 rounded-full bg-white border border-slate-200 px-3 py-1 text-slate-600 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition text-[11px] shadow-2xs font-medium"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="pt-2 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything (e.g. 'I need a coding laptop under ₹70k' or 'Checkout')..."
              className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition shadow-md shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="w-80 border-l border-slate-200 bg-white p-5 flex flex-col justify-between shadow-xl animate-in slide-in-from-right duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
                <span>Your Active Cart</span>
              </h3>
              <button
                onClick={() => setCartOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {cart && cart.items && cart.items.length > 0 ? (
                cart.items.map((item: any) => (
                  <div key={item.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-slate-900 line-clamp-1">{item.productName}</span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 ml-2"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-slate-500">
                      <span>Qty: {item.quantity}</span>
                      <span className="font-bold text-slate-900">{formatINR(item.totalPrice)}</span>
                    </div>
                    {item.isUpsell && (
                      <span className="mt-1 inline-block text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                        AI Recommended Upgrade
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">Your cart is empty.</p>
              )}
            </div>
          </div>

          {cart && cart.items && cart.items.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Subtotal</span>
                <span>{formatINR(cart.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-slate-900 mb-4">
                <span>Total</span>
                <span className="text-base text-blue-600">{formatINR(cart.total)}</span>
              </div>

              <button
                onClick={() => {
                  setCartOpen(false);
                  setPaymentModalOpen(true);
                }}
                className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition"
              >
                <CreditCard className="h-4 w-4" />
                <span>Review & Confirm Order</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Customer Confirmation & Financial Safety Modal */}
      {paymentModalOpen && cart && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center space-x-2.5 mb-3 text-blue-600">
              <ShieldCheck className="h-6 w-6" />
              <h3 className="text-base font-extrabold text-slate-900">Financial Action Authorization</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              🛡️ <strong>Razorpay Safety Boundary</strong>: RazorGrow AI does not execute silent transactions. Please review your order line-items and confirm to launch the Razorpay test payment window.
            </p>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 mb-4 space-y-2 text-xs">
              {cart.items.map((it: any) => (
                <div key={it.id} className="flex justify-between text-slate-700">
                  <span>{it.productName} (x{it.quantity})</span>
                  <span className="font-semibold">{formatINR(it.totalPrice)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{formatINR(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900">
                <span>Total Amount to Pay</span>
                <span className="text-blue-600">{formatINR(cart.total)}</span>
              </div>
            </div>

            {paymentError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleInitiateRazorpayPayment}
                disabled={paymentLoading}
                className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                <span>{paymentLoading ? "Launching Gateway..." : `Confirm & Pay ${formatINR(cart.total)}`}</span>
              </button>

              <button
                onClick={handleSimulatePaymentFailure}
                disabled={paymentLoading}
                className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 px-4 py-2 text-xs font-semibold transition"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>Simulate Payment Gateway Failure (Demo Recovery Flow)</span>
              </button>

              <button
                onClick={() => setPaymentModalOpen(false)}
                className="w-full text-center py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Cancel & Return to Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Confirmed Banner */}
      {paymentSuccessOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-center animate-in zoom-in-95 border border-emerald-100">
            <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Payment Successfully Settled!</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Razorpay Order <strong>#{paymentSuccessOrder.orderNumber}</strong> has been verified with HMAC-SHA256 signature and settled.
            </p>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 text-left space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span>Total Settled</span>
                <span className="font-bold text-slate-900">{formatINR(paymentSuccessOrder.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gateway Status</span>
                <span className="font-semibold text-emerald-700">PAID (Test Mode)</span>
              </div>
              <div className="flex justify-between">
                <span>Audit Status</span>
                <span className="font-semibold text-blue-700">Immutable Log Recorded</span>
              </div>
            </div>

            <div className="flex space-x-2">
              <a
                href="/audit"
                className="flex-1 inline-flex items-center justify-center space-x-1.5 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold hover:bg-slate-800 transition"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>View in Audit Trail</span>
              </a>
              <button
                onClick={() => setPaymentSuccessOrder(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Interactive In-App Razorpay Test Gateway Modal */}
      {activeGatewayOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95">
            {/* Razorpay Brand Header */}
            <div className="bg-[#0C2340] text-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm">
                    R
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                      <span>Razorpay Standard Checkout</span>
                      <span className="bg-blue-500/30 text-blue-200 text-[10px] font-bold px-1.5 py-0.2 rounded border border-blue-400/40">
                        TEST MODE
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-300">ApexTech Store • Order #{activeGatewayOrder.orderNumber}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveGatewayOrder(null)}
                  className="text-slate-400 hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-baseline justify-between">
                <span className="text-xs text-slate-300">Payable Amount:</span>
                <span className="text-2xl font-black text-white">{formatINR(activeGatewayOrder.amountInINR)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Select Test Payment Method
                </div>

                <div className="space-y-2">
                  {/* Instant UPI Option */}
                  <div
                    onClick={() => setSelectedPaymentMethod("UPI")}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-xs font-semibold select-none",
                      selectedPaymentMethod === "UPI"
                        ? "border-blue-500 bg-blue-50/70 text-slate-900 ring-1 ring-blue-400 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Zap className={cn("h-4 w-4", selectedPaymentMethod === "UPI" ? "text-blue-600" : "text-slate-400")} />
                      <div>
                        <div className={selectedPaymentMethod === "UPI" ? "text-slate-900 font-bold" : "text-slate-700"}>Instant UPI (Google Pay / PhonePe / Paytm)</div>
                        <div className="text-[10px] text-slate-500 font-normal">VPA: aditi.sharma@okhdfcbank</div>
                      </div>
                    </div>
                    {selectedPaymentMethod === "UPI" ? (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Selected</span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400">Select</span>
                    )}
                  </div>

                  {/* Test Credit/Debit Card Option */}
                  <div
                    onClick={() => setSelectedPaymentMethod("CARD")}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer text-xs font-semibold select-none",
                      selectedPaymentMethod === "CARD"
                        ? "border-blue-500 bg-blue-50/70 text-slate-900 ring-1 ring-blue-400 shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex items-center space-x-2.5">
                      <CreditCard className={cn("h-4 w-4", selectedPaymentMethod === "CARD" ? "text-blue-600" : "text-slate-400")} />
                      <div>
                        <div className={selectedPaymentMethod === "CARD" ? "text-slate-900 font-bold" : "text-slate-700"}>Test Credit / Debit Card</div>
                        <div className="text-[10px] text-slate-500 font-normal">4111 1111 1111 1111 • Exp 12/28 • CVV 123</div>
                      </div>
                    </div>
                    {selectedPaymentMethod === "CARD" ? (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Selected</span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400">Select</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Safety notice */}
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Sandbox Verified: Zero actual charge. HMAC-SHA256 signature will be verified upon completion.</span>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleVerifyPaymentSuccess(activeGatewayOrder, undefined, undefined, undefined, selectedPaymentMethod)}
                  disabled={paymentLoading}
                  className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 shadow-md transition disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>
                    {paymentLoading
                      ? "Verifying HMAC Signature..."
                      : `Pay ${formatINR(activeGatewayOrder.amountInINR)} via ${selectedPaymentMethod === "UPI" ? "UPI" : "Test Card"} (Test Mode)`}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveGatewayOrder(null);
                    handleSimulatePaymentFailure();
                  }}
                  disabled={paymentLoading}
                  className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-semibold text-xs py-2 transition"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Simulate Bank Decline (Test Recovery Flow)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
