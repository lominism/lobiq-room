"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const details = searchParams.get("details");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Initialize LIFF
    const initLiff = async () => {
      try {
        // @ts-ignore
        if (window.liff) {
          // @ts-ignore
          await window.liff.init({ liffId: "2010105878-XWk39R8l" });
        }
      } catch (e) {
        console.error("LIFF init failed", e);
      }
    };
    initLiff();

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // @ts-ignore
          if (window.liff && window.liff.isInClient()) {
            // @ts-ignore
            window.liff.closeWindow();
          } else {
            window.close();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-sm border border-border text-center">
      <div className="mx-auto w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-3" style={{ color: "#6366F1" }}>
        LobiQ Room
      </h1>
      <p className="text-muted-foreground mb-6">
        You have successfully booked your room. We look forward to hosting you!
      </p>
      
      <div className="bg-secondary rounded-xl p-4 text-left text-sm text-foreground whitespace-pre-line mb-8">
        {details || "Booking confirmed! See you soon."}
      </div>

      <p className="text-sm text-muted-foreground">
        Window will close automatically in {countdown} seconds...
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Suspense fallback={<div className="flex flex-col items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Loading your booking details...</p></div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
