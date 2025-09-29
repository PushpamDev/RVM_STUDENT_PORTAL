export interface APIFaculty { id: string; name: string }
export interface APISkill { id: string; name: string }
export interface APIStudent { id: string; name: string; phone_number: string; admission_number: string }
export interface APIBatch { id: string; name: string; faculty: APIFaculty; skill: APISkill; students: APIStudent[]; timings?: string; period?: string }
export interface APIAnnouncement {
    id: string;
    title: string;
    message: string;
    scope: "all" | "batch";
    batch_id: string | null;
    created_at: string;
    batch: any | null;
}

export async function getBatches(signal?: AbortSignal): Promise<APIBatch[]> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("api_token") : null;
  const headers: Record<string, string> = { accept: "application/json" };
  if (token && token.trim()) headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

  const res = await fetch("/api/batches", {
    method: "GET",
    headers,
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch batches: ${res.status} ${text}`);
  }
  const data = (await res.json()) as APIBatch[];
  return Array.isArray(data) ? data : [];
}

export async function getAnnouncements(signal?: AbortSignal): Promise<APIAnnouncement[]> {
  const res = await fetch("https://prod-ready-backend-fbd-1.onrender.com/api/announcements", {
    method: "GET",
    headers: { accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch announcements: ${res.status} ${text}`);
  }
  const data = (await res.json()) as APIAnnouncement[];
  return Array.isArray(data) ? data : [];
}

const API_BASE_URL = 'https://prod-ready-backend-fbd-1.onrender.com/api';

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem("api_token");

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.details || errorData.error || 'Failed to fetch');
  }

  if (response.status === 204) {
    return;
  }

  return response.json();
}

// --- Ticket Types ---
export type NewTicketPayload = {
  title: string;
  description: string;
  category: string;
  priority: string;
  student_id: string;
};

export type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  student: { id: string; name: string };
  assignee?: { id: string; username: string };
};

export interface PaginatedTickets {
  tickets: Ticket[];
  nextPage: number | null;
}

export type Student = {
  _id: string;
  name: string;
  email: string;
};

export type PaginatedTickets = {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
  nextPage?: number | null;
};

export const fetchTickets = async (
  status: string,
  search?: string
): Promise<PaginatedTickets> => {
  const params = new URLSearchParams();
  if (status !== "all") {
    params.append("status", status);
  }
  if (search) {
    params.append("search", search);
  }
  return request(`/tickets?${params.toString()}`);
};

export const createTicket = async (ticket: NewTicketPayload): Promise<Ticket> => {
  return request("/tickets", {
    method: "POST",
    body: JSON.stringify(ticket),
  });
};

export const getTicketById = (id: string): Promise<Ticket> => {
  return request(`/tickets/${id}`);
};

// --- Chat Types ---
export type Message = {
  id: string;
  ticket_id: string;
  sender_user_id?: string;
  sender_student_id?: string;
  message: string;
  created_at: string;
  sender_name: string;
};

export type NewMessagePayload = {
  message: string;
  sender_user_id?: string;
  sender_student_id?: string;
};

// --- Chat API --- 
export const getMessages = (ticketId: string): Promise<Message[]> => {
  return request(`/chat/${ticketId}`);
};

export const sendMessage = (ticketId: string, payload: NewMessagePayload): Promise<Message> => {
  return request(`/chat/${ticketId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};