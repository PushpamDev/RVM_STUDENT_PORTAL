import { useState, useMemo, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Search, MessageSquareText, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Chat } from "../components/ui/chat";
import {
  createTicket,
  fetchTickets,
  NewTicketPayload,
  PaginatedTickets,
  Student,
  getMessages,
  sendMessage,
  Message as ApiMessage,
  NewMessagePayload as ApiNewMessagePayload,
} from "../services/api";
import { useToast } from "../hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";

// --- MOCK DATA & TYPES ---
type ConversationMessage = {
  author: 'Student' | 'Support';
  text: string;
  timestamp: string;
  avatar: string;
};

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
  conversation: ConversationMessage[];
};


// --- ZOD SCHEMA FOR FORM VALIDATION ---
const CATEGORY_OPTIONS = ["Fee", "Placement", "Certificate", "Infrastructure", "Faculty", "Other"] as const;
const PRIORITY_OPTIONS = ["Low", "Medium", "High"] as const;

const TicketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long"),
  category: z.enum(CATEGORY_OPTIONS, { required_error: "Please select a category." }),
  priority: z.enum(PRIORITY_OPTIONS).default("Medium"),
  description: z.string().min(20, "Please provide a more detailed description (at least 20 characters)"),
  assignee: z.string().optional(),
});

type TicketValues = z.infer<typeof TicketSchema>;

// --- HELPER UI COMPONENTS ---
const StatusBadge = ({ status }: { status: Ticket['status'] }) => {
  const statusClasses = {
    Open: "bg-blue-100 text-blue-800 border-blue-300",
    "In Progress": "bg-yellow-100 text-yellow-800 border-yellow-300",
    Resolved: "bg-green-100 text-green-800 border-green-300",
  };
  return <Badge variant="outline" className={`${statusClasses[status]}`}>{status}</Badge>;
};

// --- MAIN STUDENT TICKET PAGE COMPONENT ---
export default function StudentTicketPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("my-tickets");

  useEffect(() => {
    const studentData = localStorage.getItem("student_data");
    if (studentData) {
      setStudent(JSON.parse(studentData));
    }
  }, []);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- DATA FETCHING & MUTATIONS ---
  const { data: ticketsData, isLoading: isLoadingTickets } =
    useQuery<PaginatedTickets>({
      queryKey: ["tickets", statusFilter, searchTerm],
      queryFn: () => fetchTickets(statusFilter, searchTerm),
      enabled: activeTab === "my-tickets",
    });

  const { data: chatMessages, isLoading: isLoadingMessages } = useQuery<ApiMessage[]>({
    queryKey: ["chat", selectedTicket?.id],
    queryFn: () => getMessages(selectedTicket!.id),
    enabled: !!selectedTicket,
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to fetch messages",
        description: error.message,
      });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: (newTicket: NewTicketPayload) => createTicket(newTicket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({ title: "Ticket submitted successfully!" });
      setActiveTab("my-tickets");
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create ticket",
        description: error.message,
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (newMessageText: string) => {
      if (!selectedTicket || !student) {
        throw new Error("Cannot send message: ticket or student not selected");
      }
      const payload: ApiNewMessagePayload = {
        message: newMessageText,
        sender_student_id: student.id,
      };
      return sendMessage(selectedTicket.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", selectedTicket?.id] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message,
      });
    },
  });

  const form = useForm<TicketValues>({
    resolver: zodResolver(TicketSchema),
    defaultValues: { title: "", priority: "Medium", description: "" },
  });

  const onSubmit = (values: TicketValues) => {
    if (!student?.id) {
      toast({
        variant: "destructive",
        title: "You must be signed in to create a ticket.",
      });
      return;
    }
    createTicketMutation.mutate({ ...values, student_id: student.id });
  };

  const tickets = useMemo(() => {
    if (!ticketsData?.items || !student?.id) {
      return [];
    }
    return ticketsData.items.filter(
      (ticket) => ticket.student.id === student.id
    );
  }, [ticketsData, student]);

  return (
    <AppShell title="Support Tickets">
      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab);
          setSelectedTicket(null);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="raise-ticket">Raise a New Ticket</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: VIEW MY TICKETS (Mobile-First View) */}
        <TabsContent value="my-tickets">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Conditional rendering: Show list or detail view */}
            {!selectedTicket ? (
              // TICKET LIST VIEW
              <Card>
                <CardHeader>
                  <CardTitle>My Ticket History</CardTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by title or description..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
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
                  {isLoadingTickets ? (
                    <p>Loading tickets...</p>
                  ) : tickets.length > 0 ? (
                    tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="p-3 rounded-lg cursor-pointer hover:bg-muted/50 border-b"
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-sm pr-2">
                            {ticket.title}
                          </p>
                          <StatusBadge status={ticket.status} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                          <span>{ticket.id}</span>
                          <span>
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No tickets found.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              // TICKET DETAIL VIEW
              <div className="flex flex-col h-[calc(100vh-140px)]">
              <Card className="flex-shrink-0">
                <CardHeader className="flex flex-row items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedTicket(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-grow">
                    <CardTitle className="text-base">{selectedTicket.title}</CardTitle>
                    <CardDescription className="text-xs">{selectedTicket.category} • {selectedTicket.priority}</CardDescription>
                  </div>
                  <StatusBadge status={selectedTicket.status} />
                </CardHeader>
                <Separator/>
                </Card>
                <div className="flex-grow overflow-hidden">
                  <Chat
                      messages={chatMessages || []}
                      onSendMessage={sendMessageMutation.mutate}
                      isSending={sendMessageMutation.isPending}
                      isLoading={isLoadingMessages}
                    />
                </div>
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* TAB 2: RAISE A NEW TICKET (Already mobile-friendly) */}
        <TabsContent value="raise-ticket">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
             <Card className="border-none shadow-brand">
              <CardHeader>
                <CardTitle className="text-lg">Describe Your Issue</CardTitle>
                <CardDescription>Fill out the form below. The more detail you provide, the faster we can help you.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Unable to access course content" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{CATEGORY_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="priority" render={({ field }) => (<FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{PRIORITY_OPTIONS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Details</FormLabel><FormControl><Textarea rows={6} placeholder="Please describe the issue, including any steps to reproduce it..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <Button className="w-full" type="submit" disabled={createTicketMutation.isPending}>
                      {createTicketMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}