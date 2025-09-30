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
import { Search, ArrowLeft, PlusCircle, MessageSquare, Ticket as TicketIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Chat } from "../components/ui/chat";
import {
  createTicket,
  fetchTickets,
  NewTicketPayload,
  PaginatedTickets,
  Message as ApiMessage,
  NewMessagePayload as ApiNewMessagePayload,
  getMessages,
  sendMessage,
} from "../services/api";
import { useToast } from "../hooks/use-toast";

// --- TYPE DEFINITIONS (assuming these are defined elsewhere but included for context) ---
type Student = {
  id: string;
  name: string;
};

type Assignee = {
  id: string;
  username: string;
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: 'Fee' | 'Placement' | 'Certificate' | 'Infrastructure' | 'Faculty' | 'Other';
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Resolved';
  created_at: string;
  updated_at: string;
  student: Student;
  assignee?: Assignee;
};


// --- ZOD SCHEMA FOR FORM VALIDATION ---
const CATEGORY_OPTIONS = ["Fee", "Placement", "Certificate", "Infrastructure", "Faculty", "Other"] as const;
const PRIORITY_OPTIONS = ["Low", "Medium", "High"] as const;

const TicketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long."),
  category: z.enum(CATEGORY_OPTIONS, { required_error: "Please select a category." }),
  priority: z.enum(PRIORITY_OPTIONS).default("Medium"),
  description: z.string().min(20, "Please provide a more detailed description (at least 20 characters)."),
});

type TicketValues = z.infer<typeof TicketSchema>;

// --- HELPER UI COMPONENTS ---
const StatusBadge = ({ status }: { status: Ticket['status'] }) => {
  const statusClasses: { [key: string]: string } = {
    Open: "bg-blue-100 text-blue-800 border-blue-300",
    "In Progress": "bg-yellow-100 text-yellow-800 border-yellow-300",
    Resolved: "bg-green-100 text-green-800 border-green-300",
  };
  return <Badge variant="outline" className={`whitespace-nowrap ${statusClasses[status]}`}>{status}</Badge>;
};

const EmptyState = ({ onRaiseTicketClick }: { onRaiseTicketClick: () => void }) => (
  <div className="text-center py-12 px-6">
    <TicketIcon className="mx-auto h-12 w-12 text-muted-foreground" />
    <h3 className="mt-4 text-lg font-semibold">No Tickets Found</h3>
    <p className="mt-2 text-sm text-muted-foreground">
      You haven't raised any support tickets yet.
    </p>
    <Button onClick={onRaiseTicketClick} className="mt-6">
      <PlusCircle className="mr-2 h-4 w-4" /> Raise Your First Ticket
    </Button>
  </div>
);


// --- VIEWS ---

// VIEW 1: List of all tickets
const TicketListView = ({
  tickets,
  isLoading,
  onTicketSelect,
  onRaiseTicketClick,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}: any) => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle>My Tickets</CardTitle>
        <Button onClick={onRaiseTicketClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Raise New Ticket
        </Button>
      </div>
      <CardDescription>View your ticket history and check their status.</CardDescription>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardHeader>
    <CardContent className="space-y-2">
      {isLoading ? (
        <p className="text-center text-muted-foreground py-4">Loading tickets...</p>
      ) : tickets.length > 0 ? (
        tickets.map((ticket: Ticket) => (
          <div
            key={ticket.id}
            onClick={() => onTicketSelect(ticket)}
            className="p-4 rounded-lg cursor-pointer hover:bg-muted/50 border transition-colors"
          >
            <div className="flex justify-between items-start">
              <p className="font-semibold text-sm pr-2">{ticket.title}</p>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span>{ticket.category}</span>
              <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))
      ) : (
        <EmptyState onRaiseTicketClick={onRaiseTicketClick} />
      )}
    </CardContent>
  </Card>
);

// VIEW 2: Form to create a new ticket
const CreateTicketView = ({
  form,
  onSubmit,
  isSubmitting,
  onBack,
}: any) => (
  <>
    <Button variant="ghost" onClick={onBack} className="mb-4">
      <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Tickets
    </Button>
    <Card>
      <CardHeader>
        <CardTitle>Describe Your Issue</CardTitle>
        <CardDescription>
          The more detail you provide, the faster we can help you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Unable to access course content" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{CATEGORY_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="priority" render={({ field }) => (<FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{PRIORITY_OPTIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Details</FormLabel><FormControl><Textarea rows={6} placeholder="Please describe the issue, including any steps to reproduce it..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  </>
);

// VIEW 3: Detailed view of a single ticket with chat
const TicketDetailView = ({
  ticket,
  messages,
  isLoadingMessages,
  onSendMessage,
  isSendingMessage,
  onBack,
}: any) => (
  <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
    <Card className="flex-shrink-0">
      <CardHeader className="flex flex-row items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-grow">
          <CardTitle className="text-base leading-tight">{ticket.title}</CardTitle>
          <CardDescription className="text-xs">{ticket.category} • Priority: {ticket.priority}</CardDescription>
        </div>
        <StatusBadge status={ticket.status} />
      </CardHeader>
      <Separator />
    </Card>
    <div className="flex-grow overflow-hidden mt-2">
      <Chat
        messages={messages || []}
        onSendMessage={onSendMessage}
        isSending={isSendingMessage}
        isLoading={isLoadingMessages}
      />
    </div>
  </div>
);


// --- MAIN STUDENT TICKET PAGE COMPONENT ---
export default function StudentTicketPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const studentData = localStorage.getItem("student_data");
    if (studentData) {
      setStudent(JSON.parse(studentData));
    }
  }, []);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- DATA FETCHING & MUTATIONS ---
  const { data: ticketsData, isLoading: isLoadingTickets } = useQuery<PaginatedTickets>({
      queryKey: ["tickets", statusFilter, searchTerm],
      queryFn: () => fetchTickets(statusFilter, searchTerm),
      enabled: view !== 'create', // Only fetch when not in the 'create' view
  });

  const { data: chatMessages, isLoading: isLoadingMessages } = useQuery<ApiMessage[]>({
    queryKey: ["chat", selectedTicket?.id],
    queryFn: () => getMessages(selectedTicket!.id),
    enabled: !!selectedTicket && view === 'detail',
  });

  const createTicketMutation = useMutation({
    mutationFn: (newTicket: NewTicketPayload) => createTicket(newTicket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({ title: "Ticket submitted successfully!" });
      setView('list');
      form.reset();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to create ticket", description: error.message });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (newMessageText: string) => {
      if (!selectedTicket || !student) throw new Error("Ticket or student not selected");
      const payload: ApiNewMessagePayload = { message: newMessageText, sender_student_id: student.id };
      return sendMessage(selectedTicket.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", selectedTicket?.id] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Failed to send message", description: error.message });
    },
  });

  const form = useForm<TicketValues>({
    resolver: zodResolver(TicketSchema),
    defaultValues: { title: "", priority: "Medium", description: "" },
  });

  const onSubmit = (values: TicketValues) => {
    if (!student?.id) {
      toast({ variant: "destructive", title: "You must be signed in to create a ticket." });
      return;
    }
    createTicketMutation.mutate({ ...values, student_id: student.id });
  };

  const tickets = useMemo(() => {
    if (!ticketsData?.items || !student?.id) return [];
    return ticketsData.items.filter((ticket) => ticket.student.id === student.id);
  }, [ticketsData, student]);
  
  const handleTicketSelect = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setView('detail');
  };

  const handleBackToList = () => {
    setSelectedTicket(null);
    setView('list');
  };

  const pageContent = () => {
    switch (view) {
      case 'create':
        return (
          <motion.div key="create" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <CreateTicketView 
              form={form}
              onSubmit={onSubmit}
              isSubmitting={createTicketMutation.isPending}
              onBack={() => { setView('list'); form.reset(); }}
            />
          </motion.div>
        );
      case 'detail':
        if (!selectedTicket) return null; // Should not happen, but for type safety
        return (
          <motion.div key="detail" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <TicketDetailView
              ticket={selectedTicket}
              messages={chatMessages}
              isLoadingMessages={isLoadingMessages}
              onSendMessage={sendMessageMutation.mutate}
              isSendingMessage={sendMessageMutation.isPending}
              onBack={handleBackToList}
            />
          </motion.div>
        );
      case 'list':
      default:
        return (
          <motion.div key="list" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}>
            <TicketListView
              tickets={tickets}
              isLoading={isLoadingTickets}
              onTicketSelect={handleTicketSelect}
              onRaiseTicketClick={() => setView('create')}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
          </motion.div>
        );
    }
  };

  return (
    <AppShell title="Support Center">
      <AnimatePresence mode="wait">
        {pageContent()}
      </AnimatePresence>
    </AppShell>
  );
}