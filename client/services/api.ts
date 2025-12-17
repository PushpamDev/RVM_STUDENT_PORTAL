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

export type PaginatedTickets = {
  items: any[];
  total: number;
};

export type Message = {
  id: string;
  message: string;
  sender_student_id?: string;
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
  
  // ✅ UPDATED: Uses BASE_URL + correct route
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
  // 1. Get the logged-in student's ID from local storage
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

  // If no student ID is found, we can't fetch their specific batches
  if (!studentId) {
    return []; 
  }

  // 2. Call the NEW Endpoint: /api/students/:id/batches
  const res = await fetch(`${BASE_URL}/students/${studentId}/batches`, { 
    signal,
    headers: getHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }

  const data = await res.json();

  // 3. Extract the 'batches' array from the response object
  const rawBatches = data.batches || [];

  // 4. Format the data to match what the UI expects (adding 'period' and 'timings')
  return rawBatches.map((b: any) => {
    let period = "N/A";
    let timings = "N/A";

    // Format Dates
    if (b.start_date && b.end_date) {
      try {
        const start = new Date(b.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const end = new Date(b.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        period = `${start} to ${end}`;
      } catch (e) {}
    }

    // Format Times
    if (b.start_time && b.end_time) {
      timings = `${b.start_time} - ${b.end_time}`;
    }

    return {
      ...b,
      period,
      timings,
      // Handle missing nested objects safely
      faculty: b.faculty || { name: "Assigned Faculty" },
      // Your new API returns skill_id but not the skill name object. 
      // We can fallback to using the Batch Name prefix or "General" to prevent crashes.
      skill: b.skill || { name: b.name ? b.name.split('_')[0] : "Course" } 
    };
  });
}

export async function getAnnouncements(signal?: AbortSignal): Promise<APIAnnouncement[]> {
  // ✅ UPDATED: Uses BASE_URL
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

  // ✅ UPDATED: Uses BASE_URL
  const res = await fetch(`${BASE_URL}/tickets?${params.toString()}`, {
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
};

export const createTicket = async (payload: NewTicketPayload) => {
  // ✅ UPDATED: Uses BASE_URL
  const res = await fetch(`${BASE_URL}/tickets`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to create ticket");
  return res.json();
};

// client/services/api.ts

// ... (keep existing imports)

// ==========================================
// CHAT / MESSAGES FUNCTIONS
// ==========================================

export const getMessages = async (ticketId: string) => {
  // ✅ FIX 1: Point to "/api/chat", not "/api/tickets"
  const res = await fetch(`${BASE_URL}/chat/${ticketId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) throw new Error("Failed to load messages");
  
  const data = await res.json();
  
  // ✅ FIX 2: Extract the array from the paginated response
  // Your controller returns { messages: [], totalPages: ... }
  return data.messages || []; 
};

export const sendMessage = async (ticketId: string, payload: NewMessagePayload) => {
  // ✅ FIX 1: Point to "/api/chat", not "/api/tickets"
  const res = await fetch(`${BASE_URL}/chat/${ticketId}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
};

// ... (keep other functions like loginStudent, getBatches, etc.)