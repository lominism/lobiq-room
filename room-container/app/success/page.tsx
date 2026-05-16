"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export default function SuccessPage() {
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
          await window.liff.init({ liffId: "YOUR_ROOM_LIFF_ID_HERE" });
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
    </div>
  );
}
