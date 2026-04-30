import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { UserProfile } from "@clerk/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  useGetMe, useGetVehicles, useGetSosProfile,
} from "@workspace/api-client-react";
import {
  Crown, Shield, User, Car, CreditCard, Bell, HeartPulse, LifeBuoy,
  Settings as SettingsIcon, ShoppingBag, ChevronRight, ExternalLink,
} from "lucide-react";
import NotificationsTab from "@/components/profile/notifications-tab";
import HelpTab from "@/components/profile/help-tab";
import DangerZone from "@/components/profile/danger-zone";

const TABS = [
  { value: "account", label: "Account", icon: User },
  { value: "vehicles", label: "Vehicles", icon: Car },
  { value: "subscription", label: "Subscription", icon: CreditCard },
  { value: "orders", label: "Orders", icon: ShoppingBag },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "emergency", label: "Emergency", icon: HeartPulse },
  { value: "help", label: "Help", icon: LifeBuoy },
  { value: "settings", label: "Settings", icon: SettingsIcon },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function isTab(v: string | null): v is TabValue {
  return !!v && TABS.some((t) => t.value === v);
}

function NavRow({ to, title, hint, testId }: { to: string; title: string; hint: string; testId: string }) {
  return (
    <Link href={to}>
      <div
        className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
        data-testid={testId}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{hint}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}

export default function Profile() {
  const { data: me } = useGetMe();
  const { data: vehicles = [] } = useGetVehicles();
  const { data: sos } = useGetSosProfile();
  const [location, navigate] = useLocation();

  const currentTab = useMemo<TabValue>(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(search);
    const t = params.get("tab");
    return isTab(t) ? t : "account";
  }, [location]);

  function setTab(value: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    navigate(`/profile?${params.toString()}`, { replace: true });
  }

  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.search) {
      const params = new URLSearchParams();
      params.set("tab", "account");
      navigate(`/profile?${params.toString()}`, { replace: true });
    }
  }, [navigate]);

  const isPremium = me?.plan === "premium";

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage your account, vehicles, billing and preferences in one place.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={setTab} className="space-y-5">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-muted/40 p-1">
          {TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 text-xs sm:text-sm"
              data-testid={`tab-${t.value}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="account" className="space-y-5 m-0">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {isPremium
                    ? <Crown className="w-5 h-5 text-amber-500" />
                    : <Shield className="w-5 h-5 text-muted-foreground" />
                  }
                  <div>
                    <p className="font-semibold">{isPremium ? "Premium Plan" : "Free Plan"}</p>
                    <p className="text-sm text-muted-foreground">
                      {isPremium ? "All premium features unlocked" : "Upgrade to unlock unlimited vehicles"}
                    </p>
                  </div>
                </div>
                <Badge
                  className={isPremium ? "bg-primary text-white" : "bg-muted text-muted-foreground"}
                  data-testid="badge-plan"
                >
                  {isPremium ? "Premium" : "Free"}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <div data-testid="clerk-user-profile">
            <UserProfile
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none border rounded-xl overflow-hidden",
                  card: "!shadow-none !border-0 !bg-transparent",
                  footer: "!shadow-none !border-0 !bg-transparent",
                },
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="vehicles" className="space-y-4 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your vehicles</CardTitle>
              <CardDescription>
                You have {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} registered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/vehicles">
                <Button className="w-full sm:w-auto" data-testid="button-go-vehicles">
                  Open vehicle manager <ExternalLink className="w-3.5 h-3.5 ml-2" />
                </Button>
              </Link>
              <NavRow to="/vehicles/add" title="Add a new vehicle" hint="Generate a QR code in seconds" testId="row-add-vehicle" />
              <NavRow to="/order-sticker" title="Order printed QR sticker" hint="Premium-quality vinyl, delivered" testId="row-order-sticker" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Subscription</CardTitle>
              <CardDescription>Manage your plan and payment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{isPremium ? "Premium" : "Free"} plan</p>
                  <p className="text-xs text-muted-foreground">
                    {isPremium ? "Thanks for supporting MyCarQR" : "Upgrade for unlimited vehicles & advanced features"}
                  </p>
                </div>
                {!isPremium && (
                  <Link href="/pricing">
                    <Button size="sm" data-testid="button-go-pricing">View plans</Button>
                  </Link>
                )}
              </div>
              <NavRow to="/payment" title="Payment & upgrade" hint="UPI, refunds and billing" testId="row-payment" />
              <NavRow to="/pricing" title="Compare plans" hint="See what Premium unlocks" testId="row-pricing" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sticker orders</CardTitle>
              <CardDescription>Track shipments and see past orders.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/my-orders">
                <Button className="w-full sm:w-auto" data-testid="button-go-orders">
                  Open order history <ExternalLink className="w-3.5 h-3.5 ml-2" />
                </Button>
              </Link>
              <NavRow to="/order-sticker" title="Order a new sticker" hint="Premium vinyl QR sticker for your car" testId="row-new-order" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="m-0">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-red-500" /> Emergency / SOS profile
              </CardTitle>
              <CardDescription>
                Information shown to first-responders if your QR is scanned during an emergency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sos && sos.isEnabled ? (
                <div className="rounded-lg border p-4 space-y-1">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Blood group:</span>{" "}
                    <strong>{sos.bloodGroup || "—"}</strong>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Emergency contact:</span>{" "}
                    <strong>{sos.emergencyContactName || "—"}</strong>{" "}
                    {sos.emergencyPhone && <span>· {sos.emergencyPhone}</span>}
                  </p>
                  {sos.medicalNotes && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Notes:</span> {sos.medicalNotes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No SOS profile set up yet. Adding one helps emergency responders reach the right people quickly.
                </p>
              )}
              <Link href="/sos-profile">
                <Button className="w-full sm:w-auto" data-testid="button-go-sos">
                  {sos ? "Edit SOS profile" : "Set up SOS profile"}
                  <ExternalLink className="w-3.5 h-3.5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="help" className="m-0">
          <HelpTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-5 m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account settings</CardTitle>
              <CardDescription>Quick links and account actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <NavRow to="/privacy" title="Privacy Policy" hint="How we handle your data" testId="row-privacy" />
              <NavRow to="/terms" title="Terms & Conditions" hint="Rules for using MyCarQR" testId="row-terms" />
              <NavRow to="/refund" title="Refund Policy" hint="Plan refunds and credits" testId="row-refund" />
              <NavRow to="/contact" title="Contact us" hint="Get in touch with the team" testId="row-contact" />
            </CardContent>
          </Card>
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}
