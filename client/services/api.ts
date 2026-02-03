// client/services/api.ts

// ==========================================
// CONFIGURATION
// ==========================================
// ✅ POINT DIRECTLY TO THE LIVE BACKEND
const BASE_URL = "https://prod-ready-backend-fbd-1.onrender.com/api";

// ==========================================
// INTERFACES
// ==========================================
export interface APIStudent {
  id: string;
  name: string;
  admission_number: string;
  phone_number: string;
  remarks?: string;
}

export interface APIFaculty {
  id: string;
  name: string;
}

export interface APISkill {
  id: string;
  name: string;
}

export interface APIBatch {
  id: string;
  name: string;
  period?: string;
  timings?: string;
  students?: APIStudent[];
  faculty?: APIFaculty;
  skill?: APISkill;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
}

export interface APIAnnouncement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  scope: string;
  batch_id?: string;
  batch?: {
    name: string;
  };
}

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    role: string;
    admission_number: string;
    phone_number: string;
    location_id: string;
  };
}

// --- Tickets/Support ---
export type NewTicketPayload = {
  title: string;
  description: string;
  category: string;
  priority: string;
  student_id: string;
};

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  category: string;
  student_id: string;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  student?: { id: string; name: string };
}

export type PaginatedTickets = {
  items: any[];
  total: number;
};

export type Message = {
  id: string;
  message: string;
  sender_student_id?: string;
  sender_user_id?: string; // To handle identifying admin vs student messages
  created_at: string;
};

export type NewMessagePayload = {
  message: string;
  sender_student_id: string;
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getHeaders = (contentType = "application/json") => {
  const token = localStorage.getItem("token");
  const location = localStorage.getItem("auth_location") || "Faridabad";

  const headers: HeadersInit = {
    "x-location": location,
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

// ==========================================
// AUTH FUNCTIONS
// ==========================================

export const loginStudent = async (admission_number: string, phone_number: string) => {
  const location = localStorage.getItem("auth_location") || "Faridabad";
  
  const res = await fetch(`${BASE_URL}/users/auth/student/login`, { 
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-location": location
    },
    body: JSON.stringify({ admission_number, phone_number }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }

  return data as LoginResponse;
};

// ==========================================
// DATA FUNCTIONS
// ==========================================

export async function getBatches(signal?: AbortSignal): Promise<APIBatch[]> {
  const studentDataStr = localStorage.getItem("student_data");
  let studentId = "";

  if (studentDataStr) {
    try {
      const studentData = JSON.parse(studentDataStr);
      studentId = studentData.id;
    } catch (e) {
      console.error("Failed to parse student data", e);
    }
  }

  if (!studentId) {
    return []; 
  }

  const res = await fetch(`${BASE_URL}/students/${studentId}/batches`, { 
    signal,
    headers: getHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }

  const data = await res.json();
  const rawBatches = data.batches || [];

  return rawBatches.map((b: any) => {
    let period = "N/A";
    let timings = "N/A";

    if (b.start_date && b.end_date) {
      try {
        const start = new Date(b.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const end = new Date(b.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        period = `${start} to ${end}`;
      } catch (e) {}
    }

    if (b.start_time && b.end_time) {
      timings = `${b.start_time} - ${b.end_time}`;
    }

    return {
      ...b,
      period,
      timings,
      faculty: b.faculty || { name: "Assigned Faculty" },
      skill: b.skill || { name: b.name ? b.name.split('_')[0] : "Course" } 
    };
  });
}

export async function getAnnouncements(signal?: AbortSignal): Promise<APIAnnouncement[]> {
  const res = await fetch(`${BASE_URL}/announcements`, {
    signal,
    headers: getHeaders(),
  });

  if (!res.ok) {
    console.warn("Failed to fetch announcements");
    return [];
  }

  return res.json();
}

// ==========================================
// TICKET FUNCTIONS
// ==========================================

export const fetchTickets = async (status: string, search: string) => {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (search) params.append('search', search);

  const res = await fetch(`${BASE_URL}/tickets?${params.toString()}`, {
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
};

export const createTicket = async (payload: NewTicketPayload) => {
  const res = await fetch(`${BASE_URL}/tickets`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to create ticket");
  return res.json();
};

/**
 * NEW: Reopens a resolved ticket to allow new messages.
 */
export const reopenTicketApi = async (token: string | null, ticketId: string): Promise<Ticket> => {
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}/reopen`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to reopen ticket");
  }
  return res.json();
};

// ==========================================
// CHAT / MESSAGES FUNCTIONS
// ==========================================

export const getMessages = async (ticketId: string) => {
  // ✅ FIXED: Point to "/api/tickets/:id/chat" to match backend routes
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}/chat`, {
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error("Failed to load messages");
  
  const data = await res.json();
  
  // ✅ FIXED: Backend now returns a flat array for the chat route
  return Array.isArray(data) ? data : (data.messages || []); 
};

export const sendMessage = async (ticketId: string, payload: NewMessagePayload) => {
  // ✅ FIXED: Point to "/api/tickets/:id/chat" to match backend routes
  const res = await fetch(`${BASE_URL}/tickets/${ticketId}/chat`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    // Throws the specific "Resolved" guard error message from the backend if applicable
    throw new Error(errorData.error || "Failed to send message");
  }
  return res.json();
};