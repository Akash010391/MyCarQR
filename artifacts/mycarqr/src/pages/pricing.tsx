import { Link } from "wouter";
import { Check, Lock, QrCode, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetMe } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const freeFeatures = [
  { feature: "1 vehicle", included: true },
  { feature: "Basic QR code generation", included: true },
  { feature: "Basic vehicle contact page", included: true },
  { feature: "5 scan alerts / month", included: true },
  { feature: "Scan history (limited)", included: true },
  { feature: "Multiple vehicles", included: false },
  { feature: "Custom QR sticker designs", included: false },
  { feature: "Accident Witness Mode", included: false },
  { feature: "SOS Emergency Profile", included: false },
  { feature: "Lost Key / Found Item Mode", included: false },
  { feature: "Full scan history", included: false },
  { feature: "Priority alerts", included: false },
  { feature: "Privacy mode", included: false },
  { feature: "Document expiry reminders", included: false },
];

const premiumFeatures = [
  { feature: "Everything in Free", included: true },
  { feature: "Unlimited vehicles", included: true },
  { feature: "Custom QR sticker designs", included: true },
  { feature: "Accident Witness Mode", included: true },
  { feature: "SOS Emergency Profile", included: true },
  { feature: "Lost Key / Found Item Mode", included: true },
  { feature: "Full scan history", included: true },
  { feature: "Priority alerts", included: true },
  { feature: "Privacy mode", included: true },
  { feature: "Document expiry reminders", included: true },
  { feature: "Premium dashboard", included: true },
];

export default function Pricing() {
  const { data: me } = useGetMe();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <QrCode className="w-5 h-5 text-primary" />
                <span className="font-bold text-foreground">MyCarQR</span>
              </div>
            </Link>
          </div>
          <Badge className="mb-4">Simple Pricing</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Choose your plan</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start free. Upgrade when you need more vehicles or advanced features.
          </p>
          {me && (
            <Badge className={cn("mt-4", me.plan === "premium" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
              Current plan: {me.plan === "premium" ? "Premium ✓" : "Free"}
            </Badge>
          )}
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div className={cn("border rounded-2xl p-7 space-y-6", me?.plan === "free" && "border-primary/30 bg-primary/5")}>
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Free</h2>
                {me?.plan === "free" && <Badge variant="outline">Current Plan</Badge>}
              </div>
              <div className="mt-3">
                <span className="text-4xl font-extrabold">₹0</span>
                <span className="text-muted-foreground text-sm ml-1">/ forever</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Perfect for getting started with one vehicle</p>
            </div>
            <div className="space-y-2.5">
              {freeFeatures.map(({ feature, included }) => (
                <div key={feature} className={cn("flex items-center gap-3 text-sm", !included && "text-muted-foreground/50")}>
                  {included
                    ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <Lock className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                  }
                  {feature}
                </div>
              ))}
            </div>
            {me ? (
              <Button variant="outline" className="w-full" disabled={me.plan === "free"} data-testid="button-free-plan">
                {me.plan === "free" ? "Your current plan" : "Downgrade (contact support)"}
              </Button>
            ) : (
              <Link href="/sign-up">
                <Button variant="outline" className="w-full" data-testid="button-free-plan">Get Started Free</Button>
              </Link>
            )}
          </div>

          {/* Premium */}
          <div className={cn("border-2 rounded-2xl p-7 space-y-6 relative", me?.plan === "premium" ? "border-primary bg-primary/5" : "border-primary")}>
            <div className="absolute top-5 right-5">
              <Badge className="bg-primary text-white">Most Popular</Badge>
            </div>
            <div>
              <h2 className="text-xl font-bold">Premium</h2>
              <div className="mt-3">
                <span className="text-4xl font-extrabold">₹99</span>
                <span className="text-muted-foreground text-sm ml-1">/ month</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                or <strong className="text-foreground">₹599/year</strong>
                <Badge variant="secondary" className="text-xs">Save ₹589</Badge>
              </div>
            </div>
            <div className="space-y-2.5">
              {premiumFeatures.map(({ feature }) => (
                <div key={feature} className="flex items-center gap-3 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
            {me?.plan === "premium" ? (
              <Button className="w-full" disabled data-testid="button-premium-active">
                ✓ Premium Active
              </Button>
            ) : (
              <Link href={me ? "/payment" : "/sign-up"}>
                <Button className="w-full gap-2" data-testid="button-premium-plan">
                  <Zap className="w-4 h-4" />
                  {me ? "Upgrade to Premium" : "Start Premium"}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* FAQ note */}
        <div className="mt-10 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Payment is manual via UPI. After paying, submit your screenshot and admin will activate your plan within 24 hours.
          </p>
          {me && me.plan === "free" && (
            <Link href="/payment">
              <Button variant="link" className="text-primary">View payment instructions →</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
