import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBatches, type APIBatch, type APIStudent, getAnnouncements, type APIAnnouncement } from "@/services/api";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, ChevronRight, Clock, Megaphone, PlayCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Index() {
  const [phone, setPhone] = useState<string>(() => localStorage.getItem("auth_phone") || "");
  const [admission, setAdmission] = useState<string>(() => localStorage.getItem("auth_admission") || "");
  const batchesQuery = useQuery({ queryKey: ["batches"], queryFn: ({ signal }) => getBatches(signal) });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <AppShell title="Dashboard">
      <div className="space-y-5">
        <Hero greeting={greeting} />
        <QuickActions />
        <Announcements />
        <BatchesSection
          query={batchesQuery}
          phone={phone}
          admission={admission}
          onAuth={(p, a) => {
            setPhone(p);
            setAdmission(a);
            localStorage.setItem("auth_phone", p);
            localStorage.setItem("auth_admission", a);
          }}
          onSignOut={() => {
            setPhone("");
            setAdmission("");
            localStorage.removeItem("auth_phone");
            localStorage.removeItem("auth_admission");
          }}
        />
      </div>
    </AppShell>
  );
}

function Hero({ greeting }: { greeting: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-brand/90 via-brand to-brand-foreground/10 text-primary-foreground shadow-brand">
        <div className="relative z-10">
          <p className="text-xs/5 opacity-90">{greeting}</p>
          <h2 className="text-xl font-extrabold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-xs text-primary-foreground/80 max-w-[24ch]">Track batches, read announcements, and get support.</p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" className="shadow-sm" asChild>
              <a href="/tickets">Raise a ticket</a>
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              <PlayCircle className="h-4 w-4" />
              Resume
            </Button>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
      </div>
    </motion.div>
  );
}

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.a href="/announcements" whileTap={{ scale: 0.98 }} className="rounded-xl border bg-card p-3 text-left shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand/15 text-brand inline-flex items-center justify-center">
            <Megaphone className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium">Announcements</div>
            <div className="text-xs text-muted-foreground">See updates</div>
          </div>
        </div>
      </motion.a>
      <motion.a href="/tickets" whileTap={{ scale: 0.98 }} className="rounded-xl border bg-card p-3 text-left shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand/15 text-brand inline-flex items-center justify-center">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium">Raise Ticket</div>
            <div className="text-xs text-muted-foreground">Get help</div>
          </div>
        </div>
      </motion.a>
    </div>
  );
}

function Announcements() {
  const { data, isLoading, isError, error } = useQuery<APIAnnouncement[], Error>({
    queryKey: ["announcements"],
    queryFn: ({ signal }) => getAnnouncements(signal),
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Announcements</h3>
        <span className="text-xs text-muted-foreground">Recent</span>
      </div>
      <Card className="border-none shadow-sm">
        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading announcements...</p>
          ) : isError ? (
            <p className="p-4 text-sm text-destructive">{error.message}</p>
          ) : (
            data?.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-8 w-8 rounded-lg bg-brand/15 text-brand inline-flex items-center justify-center">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{a.title}</p>
                      <Badge variant="secondary" className="shrink-0">{timeAgo(a.created_at)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function BatchesSection({ query, phone, admission, onAuth, onSignOut }: {
  query: ReturnType<typeof useQuery<APIBatch[], Error>>;
  phone: string;
  admission: string;
  onAuth: (phone: string, admission: string) => void;
  onSignOut: () => void;
}) {
  const { data, isLoading, isError, error } = query as unknown as { data?: APIBatch[]; isLoading: boolean; isError: boolean; error: Error };
  const [localPhone, setLocalPhone] = useState(phone);
  const [localAdmission, setLocalAdmission] = useState(admission);

  const matches = (s: APIStudent) => {
    const matchesAdmission = !!admission && s.admission_number?.trim() === admission.trim();
    const matchesPhone = phone ? s.phone_number?.trim() === phone.trim() : true;
    return matchesAdmission && matchesPhone;
  };

  const enrolled = (data || []).filter((b) => b.students?.some(matches));
  const matchedStudent = (() => {
    for (const b of data || []) {
      const m = b.students?.find(matches);
      if (m) return m;
    }
    return undefined;
  })();

  useEffect(() => {
    if (matchedStudent) {
      localStorage.setItem("student_data", JSON.stringify(matchedStudent));
    } else {
      // On sign out, matchedStudent will be undefined, so we clear the stored data
      localStorage.removeItem("student_data");
    }
  }, [matchedStudent]);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Your Batches</h3>
        {matchedStudent && (
          <span className="text-xs text-muted-foreground">Signed in as {matchedStudent.name}</span>
        )}
      </div>

      {!admission ? (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sign in to view your batches</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm">Phone number (optional)</label>
              <input value={localPhone} onChange={(e) => setLocalPhone(e.target.value)} inputMode="tel" placeholder="e.g. 9876543210" className="h-10 rounded-md border bg-background px-3 text-sm" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Admission number</label>
              <input value={localAdmission} onChange={(e) => setLocalAdmission(e.target.value)} placeholder="e.g. 2593" className="h-10 rounded-md border bg-background px-3 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => onAuth(localPhone, localAdmission)} className="col-span-2">Continue</Button>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-sm text-muted-foreground">Loading your batches…</CardContent>
        </Card>
      ) : isError ? (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 grid gap-3">
            <div className="text-sm text-destructive">{error.message}</div>
            <div className="grid gap-2">
              <label className="text-sm">API Token (JWT)</label>
              <input
                defaultValue={typeof localStorage !== "undefined" ? localStorage.getItem("api_token") || "" : ""}
                onChange={(e) => {
                  localStorage.setItem("api_token", e.target.value.trim());
                }}
                placeholder="Paste your JWT"
                className="h-10 rounded-md border bg-background px-3 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => (query as any).refetch?.()}>Retry</Button>
                <Button size="sm" variant="secondary" onClick={onSignOut}>Change admission</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : enrolled.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 text-sm text-muted-foreground">
            No batches found for admission {admission}. <button className="text-brand underline ml-1" onClick={onSignOut}>Change</button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrolled.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="overflow-hidden border-none shadow-sm">
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate mr-2">{b.name}</span>
                    <Badge className="bg-brand text-white">Enrolled</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {b.period ? (
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {b.period}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Date not provided
                      </span>
                    )}
                    {b.timings && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {b.timings}
                        </span>
                      </>
                    )}
                    <Separator orientation="vertical" className="h-4" />
                    <span>{b.skill?.name}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Faculty: {b.faculty?.name}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}