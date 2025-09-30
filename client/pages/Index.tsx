import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBatches, type APIBatch, type APIStudent, getAnnouncements, type APIAnnouncement } from "@/services/api";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronRight, Clock, Megaphone, User, Hash, Phone, AlertTriangle, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { timeAgo } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

export default function Index() {
  const [phone, setPhone] = useState<string>(() => localStorage.getItem("auth_phone") || "");
  const [admission, setAdmission] = useState<string>(() => localStorage.getItem("auth_admission") || "");
  
  const batchesQuery = useQuery({ 
    queryKey: ["batches"], 
    queryFn: ({ signal }) => getBatches(signal),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const announcementsQuery = useQuery<APIAnnouncement[], Error>({
    queryKey: ["announcements"],
    queryFn: ({ signal }) => getAnnouncements(signal),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  
  const matchedStudent = useMemo(() => {
    if (!batchesQuery.data || !admission) return undefined;
    for (const b of batchesQuery.data) {
        const matches = (s: APIStudent) => {
            const matchesAdmission = s.admission_number?.trim() === admission.trim();
            const matchesPhone = phone ? s.phone_number?.trim() === phone.trim() : true;
            return matchesAdmission && matchesPhone;
        };
        const m = b.students?.find(matches);
        if (m) return m;
    }
    return undefined;
  }, [batchesQuery.data, phone, admission]);

  return (
    <AppShell>
        <div className="space-y-8">
            <Hero greeting={greeting} studentName={matchedStudent?.name} />
            <Announcements query={announcementsQuery} />
            <BatchesSection
              query={batchesQuery}
              phone={phone}
              admission={admission}
              matchedStudent={matchedStudent}
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
                localStorage.removeItem("student_data");
              }}
            />
        </div>
    </AppShell>
  );
}

// --- Components ---

function Hero({ greeting, studentName }: { greeting: string, studentName?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand to-brand/80 p-6 text-primary-foreground shadow-lg">
        <div className="relative z-10">
          <p className="text-sm font-medium opacity-90">{greeting}{studentName ? `, ${studentName.split(' ')[0]}` : ''}!</p>
          <h2 className="text-2xl font-bold tracking-tight mt-1">Welcome to Your Dashboard</h2>
          <p className="mt-2 text-sm text-primary-foreground/80 max-w-prose">
            Track your batches, view announcements, and get support all in one place.
          </p>
          <Button size="sm" className="mt-4 bg-white text-brand hover:bg-white/90" asChild>
            <Link to="/tickets">
              Get Support / Raise a Ticket
            </Link>
          </Button>
        </div>
        <div className="absolute -right-12 -bottom-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute right-10 top-10 h-20 w-20 rounded-full bg-white/10" />
      </div>
    </motion.div>
  );
}

function Announcements({ query }: { query: ReturnType<typeof useQuery<APIAnnouncement[], Error>> }) {
  const { data, isLoading, isError, error } = query;

  return (
    <section>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold tracking-tight">Latest Announcements</h3>
            <Button asChild variant="ghost" size="sm" className="-mr-3">
                <Link to="/announcements">
                    View all <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
            </Button>
        </div>
        
        {isLoading ? (
            <div className="space-y-4">
                {[...Array(2)].map((_, i) => <div key={i} className="flex items-center space-x-4"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-[150px]" /><Skeleton className="h-3 w-[100px]" /></div></div>)}
            </div>
        ) : isError ? (
            <p className="text-sm text-destructive">{error.message}</p>
        ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-2">No new announcements right now.</p>
        ) : (
            <div className="relative pl-2 space-y-6">
                <div className="absolute left-4 top-2 h-[calc(100%-1rem)] w-0.5 bg-border -z-10" />
                {data.slice(0, 2).map((a) => (
                  <div key={a.id} className="relative pl-6">
                     <div className="absolute left-[9px] top-1 h-3 w-3 rounded-full bg-brand ring-4 ring-background" />
                     <p className="text-sm font-medium text-foreground">{a.title}</p>
                     <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                  </div>
                ))}
            </div>
        )}
    </section>
  );
}


function BatchesSection({ query, phone, admission, onAuth, onSignOut, matchedStudent }: {
  query: ReturnType<typeof useQuery<APIBatch[], Error>>;
  phone: string;
  admission: string;
  onAuth: (phone: string, admission: string) => void;
  onSignOut: () => void;
  matchedStudent?: APIStudent;
}) {
  const { data, isLoading, isError, error } = query;
  
  const enrolled = useMemo(() => {
    if (!data || !matchedStudent) return [];
    const matches = (s: APIStudent) => s.admission_number?.trim() === admission.trim();
    return data.filter((b) => b.students?.some(matches));
  }, [data, admission, matchedStudent]);
  
  useEffect(() => {
    if (matchedStudent) {
      localStorage.setItem("student_data", JSON.stringify(matchedStudent));
    }
  }, [matchedStudent]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold tracking-tight">Your Enrolled Batches</h3>
        {matchedStudent && (
          <Button variant="ghost" size="sm" onClick={onSignOut}>Sign Out</Button>
        )}
      </div>

      {!admission ? (
        <SignInForm onAuth={onAuth} phone={phone} admission={admission} />
      ) : isLoading ? (
        <div className="space-y-4">
            <BatchCardSkeleton />
            <BatchCardSkeleton />
        </div>
      ) : isError ? (
        <ErrorCard error={error} onSignOut={onSignOut} onRetry={() => query.refetch()} />
      ) : enrolled.length === 0 ? (
        <Card>
            <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No batches found for admission number <span className="font-semibold text-foreground">{admission}</span>.</p>
                <Button variant="link" className="text-brand h-auto p-0 mt-1" onClick={onSignOut}>Use a different admission number</Button>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {enrolled.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className="overflow-hidden transition-all hover:border-brand/50">
                    <CardHeader>
                        <div className="flex justify-between items-start gap-4">
                            <CardTitle className="text-base">{b.name}</CardTitle>
                            <Badge className="bg-brand text-brand-foreground hover:bg-brand/90 shrink-0">Enrolled</Badge>
                        </div>
                        <CardDescription>{b.skill?.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
                       <InfoPill icon={User} text={b.faculty?.name || "N/A"} label="Faculty" />
                       <InfoPill icon={CalendarDays} text={b.period || "N/A"} label="Duration" />
                       <InfoPill icon={Clock} text={b.timings || "N/A"} label="Timings" />
                       <InfoPill icon={BookOpen} text={`${b.students?.length || 0} Students`} label="Class Size" />
                    </CardContent>
                </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function SignInForm({ onAuth, phone, admission }: { onAuth: (p: string, a: string) => void, phone: string, admission: string }) {
    const [localPhone, setLocalPhone] = useState(phone);
    const [localAdmission, setLocalAdmission] = useState(admission);
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Sign In to View Your Batches</CardTitle>
                <CardDescription>Enter your admission number to see your enrolled batches.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="admission">Admission Number</Label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="admission" value={localAdmission} onChange={(e) => setLocalAdmission(e.target.value)} placeholder="e.g., 2593" className="pl-9" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" value={localPhone} onChange={(e) => setLocalPhone(e.target.value)} inputMode="tel" placeholder="e.g., 9876543210" className="pl-9" />
                    </div>
                </div>
                <Button onClick={() => onAuth(localPhone, localAdmission)} className="w-full">
                    View My Batches
                </Button>
            </CardContent>
        </Card>
    );
}

function ErrorCard({ error, onSignOut, onRetry }: { error: Error, onSignOut: () => void, onRetry: () => void }) {
    return (
        <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
                <CardTitle className="text-destructive mt-4">Could Not Load Batches</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm text-destructive/90">
                <p>{error.message}</p>
                <div className="flex gap-2 justify-center mt-4">
                    <Button size="sm" variant="destructive" onClick={onRetry}>Retry</Button>
                    <Button size="sm" variant="secondary" onClick={onSignOut}>Sign Out</Button>
                </div>
            </CardContent>
        </Card>
    );
}

const InfoPill = ({ icon: Icon, text, label }: { icon: React.ElementType, text: string, label: string }) => (
    <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
            <Icon className="h-4 w-4" />
        </div>
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium text-foreground">{text}</p>
        </div>
    </div>
);

const BatchCardSkeleton = () => (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-1/2 mt-1" />
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-1.5"><Skeleton className="h-3 w-12" /><Skeleton className="h-4 w-24" /></div></div>
            <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-1.5"><Skeleton className="h-3 w-12" /><Skeleton className="h-4 w-24" /></div></div>
        </CardContent>
    </Card>
);