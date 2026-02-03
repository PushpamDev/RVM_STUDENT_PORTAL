import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, PlusCircle, Ticket as TicketIcon, Lock, RotateCcw, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Chat } from "../components/ui/chat";
import {
  createTicket,
  fetchTickets,
  NewTicketPayload,
  PaginatedTickets,
  Message as ApiMessage,
  getMessages,
  sendMessage,
  reopenTicketApi,
} from "../services/api";
import { useToast } from "../hooks/use-toast";

// --- TYPE DEFINITIONS ---
type Student = { id: string; name: string; };
type Assignee = { id: string; username: string; };

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: 'Fee' | 'Placement' | 'Certificate' | 'Infrastructure' | 'Faculty' | 'Other';
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved';
  created_at: string;
  updated_at: string;
  student_id: string;
  student?: Student | null;
  assignee?: Assignee;
};

// --- ZOD SCHEMA ---
const CATEGORY_OPTIONS = ["Fee", "Placement", "Certificate", "Infrastructure", "Faculty", "Other"] as const;
const PRIORITY_OPTIONS = ["Low", "Medium", "High"] as const;

const TicketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  category: z.enum(CATEGORY_OPTIONS, { required_error: "Please select a category." }),
  priority: z.enum(PRIORITY_OPTIONS),
  description: z.string().min(20, "Please provide a more detailed description (at least 20 characters)."),
});

type TicketValues = z.infer<typeof TicketSchema>;

const StatusBadge = ({ status }: { status: string }) => {
  const statusClasses: Record<string, string> = {
    Open: "bg-blue-100 text-blue-800 border-blue-300",
    "In Progress": "bg-yellow-100 text-yellow-800 border-yellow-300",
    Resolved: "bg-green-100 text-green-800 border-green-300",
  };
  return <Badge variant="outline" className={`whitespace-nowrap ${statusClasses[status] || ""}`}>{status}</Badge>;
};

// --- VIEWS ---

const TicketListView = ({ tickets, isLoading, onTicketSelect, onRaiseTicketClick, searchTerm, setSearchTerm, statusFilter, setStatusFilter }: any) => (
  <Card className="shadow-md border-none">
    <CardHeader>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle className="text-2xl font-bold">Support History</CardTitle>
          <CardDescription>Track and manage your submitted requests.</CardDescription>
        </div>
        <Button onClick={onRaiseTicketClick} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Raise New Ticket
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardHeader>
    <CardContent className="space-y-3 pt-4">
      {isLoading ? (
        <div className="flex flex-col items-center py-20 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Fetching your tickets...</p>
        </div>
      ) : tickets.length > 0 ? (
        tickets.map((ticket: Ticket) => (
          <div key={ticket.id} onClick={() => onTicketSelect(ticket)} className="p-5 rounded-xl cursor-pointer hover:bg-slate-50 border border-slate-100 transition-all flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-slate-900 leading-tight">{ticket.title}</h4>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="bg-slate-100 px-2 py-0.5 rounded">{ticket.category}</span>
              <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <TicketIcon className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-bold text-slate-900">No tickets found</h3>
            <p className="text-sm text-slate-500">You haven't raised any tickets yet.</p>
        </div>
      )}
    </CardContent>
  </Card>
);

const CreateTicketView = ({ form, onSubmit, isSubmitting, onBack }: any) => (
  <>
    <Button variant="ghost" onClick={onBack} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
    <Card className="shadow-lg border-none">
      <CardHeader><CardTitle className="text-2xl font-bold">New Support Request</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel className="font-bold">Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                  <SelectContent>{CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel className="font-bold">Full Details</FormLabel><FormControl><Textarea rows={6} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button className="w-full h-12 font-bold" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Ticket'}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  </>
);

const TicketDetailView = ({ ticket, messages, isLoadingMessages, onSendMessage, isSendingMessage, onBack, onReopen, isReopening }: any) => {
  const isResolved = ticket.status === 'Resolved';

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
      <Card className="flex-shrink-0 shadow-sm border-none bg-slate-50/50">
        <CardHeader className="flex flex-row items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 bg-white shadow-sm rounded-full" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-grow">
            <CardTitle className="text-xl font-bold leading-tight">{ticket.title}</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{ticket.category}</CardDescription>
          </div>
          <StatusBadge status={ticket.status} />
        </CardHeader>
        <Separator />
      </Card>
      
      <div className="flex-grow overflow-hidden mt-2 relative bg-white rounded-2xl border border-slate-100">
        <Chat
          messages={messages || []}
          onSendMessage={onSendMessage}
          isSending={isSendingMessage}
          isLoading={isLoadingMessages}
          disabled={isResolved}
        />
        
        {isResolved && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t p-6 flex flex-col items-center justify-center gap-3 z-10">
            <div className="flex items-center gap-2 text-slate-400">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-widest">Conversation Closed</span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="rounded-full border-primary text-primary font-bold px-6"
              onClick={onReopen}
              disabled={isReopening}
            >
              {isReopening ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-3.5 w-3.5 mr-2" />}
              Reopen Ticket to Message
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function StudentTicketPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const studentData = localStorage.getItem("student_data");
    if (studentData) setStudent(JSON.parse(studentData));
  }, []);

  const token = localStorage.getItem("token");

  const { data: ticketsData, isLoading: isLoadingTickets } = useQuery<PaginatedTickets>({
    queryKey: ["tickets", statusFilter, searchTerm],
    queryFn: () => fetchTickets(statusFilter, searchTerm),
    enabled: !!token,
  });

  // ✅ FIX 1: Simplify filtering logic
  const filteredTickets = useMemo(() => {
    if (!ticketsData?.items) return [];
    // Since backend already filters by location/student via token, we show all returned items
    // but keep a safety check if student.id is available.
    if (!student?.id) return ticketsData.items;

    return ticketsData.items.filter((ticket: any) => {
      // Check direct student_id or nested student.id
      const ticketStudentId = ticket.student_id || ticket.student?.id;
      return ticketStudentId === student.id;
    });
  }, [ticketsData, student]);

  // ✅ FIX 2: Ensure selectedTicket detail view remains visible and up to date
  useEffect(() => {
    if (selectedTicket && ticketsData?.items) {
      const fresh = ticketsData.items.find(t => t.id === selectedTicket.id);
      if (fresh) setSelectedTicket(fresh);
    }
  }, [ticketsData, selectedTicket]);

  const { data: chatMessages, isLoading: isLoadingMessages } = useQuery<ApiMessage[]>({
    queryKey: ["chat", selectedTicket?.id],
    queryFn: () => getMessages(selectedTicket!.id),
    enabled: !!selectedTicket && view === 'detail',
  });

  const createTicketMutation = useMutation({
    mutationFn: (newTicket: NewTicketPayload) => createTicket(newTicket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({ title: "Success", description: "Ticket raised successfully." });
      setView('list');
      form.reset();
    },
    onError: (error: any) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (msg: string) => sendMessage(selectedTicket!.id, { message: msg, sender_student_id: student!.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat", selectedTicket?.id] }),
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenTicketApi(token, selectedTicket!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({ title: "Ticket Reopened" });
    },
  });

  const form = useForm<TicketValues>({
    resolver: zodResolver(TicketSchema),
    defaultValues: { title: "", category: "" as any, priority: "Medium", description: "" },
  });

  const onSubmit = (values: TicketValues) => {
    if (!student?.id) return toast({ variant: "destructive", title: "Auth Error" });
    createTicketMutation.mutate({ ...values, student_id: student.id });
  };

  const handleTicketSelect = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setView('detail');
  };

  const pageContent = () => {
    switch (view) {
      case 'create':
        return (
          <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <CreateTicketView form={form} onSubmit={onSubmit} isSubmitting={createTicketMutation.isPending} onBack={() => setView('list')} />
          </motion.div>
        );
      case 'detail':
        if (!selectedTicket) return null;
        return (
          <motion.div key="detail" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
            <TicketDetailView
              ticket={selectedTicket}
              messages={chatMessages}
              isLoadingMessages={isLoadingMessages}
              onSendMessage={sendMessageMutation.mutate}
              isSendingMessage={sendMessageMutation.isPending}
              onBack={() => { setSelectedTicket(null); setView('list'); }}
              onReopen={() => reopenMutation.mutate()}
              isReopening={reopenMutation.isPending}
            />
          </motion.div>
        );
      default:
        return (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <TicketListView tickets={filteredTickets} isLoading={isLoadingTickets} onTicketSelect={handleTicketSelect} onRaiseTicketClick={() => setView('create')} searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
          </motion.div>
        );
    }
  };

  return (
    <AppShell title="Student Support Center">
      <AnimatePresence mode="wait">
        {pageContent()}
      </AnimatePresence>
    </AppShell>
  );
}