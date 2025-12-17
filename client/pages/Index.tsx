import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  getBatches, 
  type APIBatch, 
  type APIStudent, 
  getAnnouncements, 
  type APIAnnouncement,
  loginStudent 
} from "@/services/api";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// ✅ FIXED: Added "User" to imports
import { CalendarDays, ChevronRight, Clock, Hash, Phone, AlertTriangle, BookOpen, MapPin, Loader2, User } from "lucide-react"; 
import { motion } from "framer-motion";
import { timeAgo } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const [phone, setPhone] = useState<string>(() => localStorage.getItem("auth_phone") || "");
  const [admission, setAdmission] = useState<string>(() => localStorage.getItem("auth_admission") || "");
  const [location, setLocation] = useState<string>(() => localStorage.getItem("auth_location") || "Faridabad");
  
  const hasToken = !!localStorage.getItem("token");
  const queryClient = useQueryClient();

  const batchesQuery = useQuery({ 
    queryKey: ["batches", location], // Refresh when location changes
    queryFn: ({ signal }) => getBatches(signal),
    enabled: hasToken && !!admission, 
    retry: false
  });

  const announcementsQuery = useQuery<APIAnnouncement[], Error>({
    queryKey: ["announcements"],
    queryFn: ({ signal }) => getAnnouncements(signal),
    staleTime: 1000 * 60 * 5 
  });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  
  // Parse student data directly from storage since we don't need to hunt for it in the batches anymore
  const matchedStudent = useMemo(() => {
    const savedData = localStorage.getItem("student_data");
    if (savedData) {
        try { return JSON.parse(savedData); } catch(e) { return undefined; }
    }
    return undefined;
  }, []);

  return (
    <AppShell>
        <div className="space-y-8">
            <Hero greeting={greeting} studentName={matchedStudent?.name} location={location} />
            <Announcements query={announcementsQuery} />
            <BatchesSection
              query={batchesQuery}
              phone={phone}
              admission={admission}
              location={location}
              matchedStudent={matchedStudent}
              onAuthSuccess={(p, a, l) => {
                setPhone(p);
                setAdmission(a);
                setLocation(l);
                queryClient.invalidateQueries({ queryKey: ["batches"] });
              }}
              onSignOut={() => {
                setPhone("");
                setAdmission("");
                localStorage.removeItem("auth_phone");
                localStorage.removeItem("auth_admission");
                localStorage.removeItem("student_data");
                localStorage.removeItem("token");
                queryClient.resetQueries({ queryKey: ["batches"] });
              }}
            />
        </div>
    </AppShell>
  );
}

// ... Hero and Announcements components remain the same ...
function Hero({ greeting, studentName, location }: { greeting: string, studentName?: string, location: string }) {
    // ... same as before
    return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand to-brand/80 p-6 text-primary-foreground shadow-lg">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium opacity-90">{greeting}{studentName ? `, ${studentName.split(' ')[0]}` : ''}!</p>
                <h2 className="text-2xl font-bold tracking-tight mt-1">Welcome to Your Dashboard</h2>
            </div>
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none gap-1">
                <MapPin className="h-3 w-3" /> {location}
            </Badge>
          </div>
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
    // ... same as before
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


function BatchesSection({ query, phone, admission, location, onAuthSuccess, onSignOut, matchedStudent }: {
  query: ReturnType<typeof useQuery<APIBatch[], Error>>;
  phone: string;
  admission: string;
  location: string;
  onAuthSuccess: (phone: string, admission: string, location: string) => void;
  onSignOut: () => void;
  matchedStudent?: APIStudent;
}) {
  const { data, isLoading, isError, error } = query;
  
  const isLoggedIn = !!admission && !!localStorage.getItem("token");

  // ✅ SIMPLIFIED: No need to filter "enrolled" manually.
  // The API now returns ONLY the batches this student is in.
  const enrolledBatches = data || [];

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold tracking-tight">Your Enrolled Batches</h3>
        {isLoggedIn && (
          <Button variant="ghost" size="sm" onClick={onSignOut}>Sign Out</Button>
        )}
      </div>

      {!isLoggedIn ? (
        <SignInForm onAuthSuccess={onAuthSuccess} initialLocation={location} />
      ) : isLoading ? (
        <div className="space-y-4">
            <BatchCardSkeleton />
            <BatchCardSkeleton />
        </div>
      ) : isError ? (
        <ErrorCard error={error} onSignOut={onSignOut} onRetry={() => query.refetch()} />
      ) : enrolledBatches.length === 0 ? (
        <Card>
            <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                    You are not currently enrolled in any active batches.
                </p>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {enrolledBatches.map((b, i) => (
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
                       {/* Note: The new API output doesn't seem to include the students list count, so we might hide this or use max_students */}
                       <InfoPill icon={BookOpen} text={`${b.max_students || "N/A"} Max`} label="Class Capacity" />
                    </CardContent>
                </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

// ... SignInForm, InfoPill, etc. remain the same ...
function SignInForm({ onAuthSuccess, initialLocation }: { onAuthSuccess: (p: string, a: string, l: string) => void, initialLocation: string }) {
    const [localPhone, setLocalPhone] = useState("");
    const [localAdmission, setLocalAdmission] = useState("");
    const [localLocation, setLocalLocation] = useState(initialLocation || "Faridabad");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleLogin = async () => {
        if (!localAdmission || !localPhone) {
            toast({ variant: "destructive", title: "Missing details", description: "Please enter both admission number and phone number." });
            return;
        }

        setIsLoading(true);
        try {
            // 1. Set location temporarily so api uses it for the request
            localStorage.setItem("auth_location", localLocation);

            // 2. Call the API
            const response = await loginStudent(localAdmission, localPhone);

            // 3. Store the Token (CRITICAL STEP)
            localStorage.setItem("token", response.token);
            localStorage.setItem("auth_admission", response.user.admission_number);
            localStorage.setItem("auth_phone", response.user.phone_number);
            localStorage.setItem("student_data", JSON.stringify(response.user));

            toast({ title: "Welcome back!", description: `Logged in as ${response.user.name}` });

            // 4. Update parent state
            onAuthSuccess(response.user.phone_number, response.user.admission_number, localLocation);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Login Failed", description: error.message });
            // Clean up if failed
            localStorage.removeItem("token");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Sign In to View Your Batches</CardTitle>
                <CardDescription>Enter your details to verify your identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                
                <div className="space-y-2">
                    <Label htmlFor="location">Center Location</Label>
                    <div className="relative">
                         {/* Use standard HTML select for simplicity as per your example */}
                        <select 
                            id="location"
                            value={localLocation}
                            onChange={(e) => setLocalLocation(e.target.value)}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="Faridabad">Faridabad</option>
                            <option value="Pune">Pune</option>
                            <option value="Ahmedabad">Ahmedabad</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="admission">Admission Number</Label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="admission" value={localAdmission} onChange={(e) => setLocalAdmission(e.target.value)} placeholder="e.g., 2593" className="pl-9" />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" value={localPhone} onChange={(e) => setLocalPhone(e.target.value)} inputMode="tel" placeholder="e.g., 9876543210" className="pl-9" />
                    </div>
                </div>
                
                <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "View My Batches"}
                </Button>
            </CardContent>
        </Card>
    );
}
// ... ErrorCard, InfoPill, BatchCardSkeleton same as before ...
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