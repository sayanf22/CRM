import { create } from "zustand";
import { format, addDays, subDays } from "date-fns";

// --- TYPES ---

export type Status = "Not Interested" | "Not Sure" | "Interested" | "Converted";
export type ClientStatus = "Onboarding" | "In Progress" | "Waiting on Client" | "Delivered" | "Closed";
export type TaskStatus = "Pending" | "In Progress" | "Completed";

export interface Note {
  id: string;
  content: string;
  timestamp: string;
  authorId: string;
  type: "call_summary" | "status_change" | "task_update" | "general";
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  businessName: string;
  assignedTo: string;
  status: Status;
  interestLevel: number; // 1-100
  lastContact: string;
  nextFollowUp: string | null;
  history: Note[];
}

export interface Client {
  id: string;
  leadId: string; // Linked from lead
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  services: string[];
  startDate: string;
  deliveryDate: string | null;
  status: ClientStatus;
  notes: Note[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  relatedTo?: { type: 'lead' | 'client', id: string, name: string };
  dueDate: string;
  status: TaskStatus;
}

export interface TeamMember {
  id: string;
  name: string;
  role: "Admin"; // All are admin
  active: boolean;
  avatar?: string;
  dailyCallTarget?: number;
  callsCompletedToday?: number;
}

// --- MOCK DATA ---

const MOCK_TEAM: TeamMember[] = [
  { id: "u1", name: "Alex Chen", role: "Admin", active: true, dailyCallTarget: 20, callsCompletedToday: 12 },
  { id: "u2", name: "Sarah Jones", role: "Admin", active: true, dailyCallTarget: 15, callsCompletedToday: 15 },
  { id: "u3", name: "Mike Ross", role: "Admin", active: true, dailyCallTarget: 20, callsCompletedToday: 5 },
];

const MOCK_LEADS: Lead[] = [
  {
    id: "l1",
    name: "John Smith",
    phone: "+1 (555) 123-4567",
    businessName: "Smith & Co",
    assignedTo: "u1",
    status: "Interested",
    interestLevel: 75,
    lastContact: format(subDays(new Date(), 1), "yyyy-MM-dd HH:mm"),
    nextFollowUp: format(addDays(new Date(), 1), "yyyy-MM-dd HH:mm"),
    history: [
      { id: "n1", content: "Initial call, very positive.", timestamp: format(subDays(new Date(), 2), "yyyy-MM-dd HH:mm"), authorId: "u1", type: "call_summary" }
    ]
  },
  {
    id: "l2",
    name: "Emma Wilson",
    phone: "+1 (555) 987-6543",
    businessName: "Wilson Design",
    assignedTo: "u2",
    status: "Not Sure",
    interestLevel: 40,
    lastContact: format(subDays(new Date(), 3), "yyyy-MM-dd HH:mm"),
    nextFollowUp: format(new Date(), "yyyy-MM-dd HH:mm"), // Due today
    history: []
  },
  {
    id: "l3",
    name: "David Brown",
    phone: "+1 (555) 456-7890",
    businessName: "Brown Logistics",
    assignedTo: "u1",
    status: "Not Interested",
    interestLevel: 10,
    lastContact: format(subDays(new Date(), 5), "yyyy-MM-dd HH:mm"),
    nextFollowUp: null,
    history: []
  },
];

const MOCK_CLIENTS: Client[] = [
  {
    id: "c1",
    leadId: "l_old_1",
    businessName: "TechFlow Inc",
    ownerName: "Lisa Taylor",
    phone: "+1 (555) 222-3333",
    address: "123 Tech Blvd, SF",
    services: ["Web Dev", "SEO"],
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    deliveryDate: format(addDays(new Date(), 15), "yyyy-MM-dd"),
    status: "In Progress",
    notes: []
  }
];

const MOCK_TASKS: Task[] = [
  {
    id: "t1",
    title: "Send Proposal",
    description: "Prepare and send the Q1 proposal.",
    assignedTo: "u1",
    assignedBy: "u2",
    relatedTo: { type: 'lead', id: 'l1', name: 'John Smith' },
    dueDate: format(new Date(), "yyyy-MM-dd HH:mm"),
    status: "Pending"
  },
  {
    id: "t2",
    title: "Onboarding Call",
    description: "Schedule kickoff with Lisa.",
    assignedTo: "u1",
    assignedBy: "u1",
    relatedTo: { type: 'client', id: 'c1', name: 'TechFlow Inc' },
    dueDate: format(addDays(new Date(), 2), "yyyy-MM-dd HH:mm"),
    status: "Completed"
  }
];

// --- STORE ---

interface AppState {
  currentUser: TeamMember;
  users: TeamMember[];
  leads: Lead[];
  clients: Client[];
  tasks: Task[];
  
  // Actions
  addLead: (lead: Omit<Lead, "id" | "history">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addHistoryToLead: (leadId: string, note: Omit<Note, "id" | "timestamp" | "authorId">) => void;
  
  convertToClient: (leadId: string, clientData: Omit<Client, "id" | "leadId" | "notes">) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: MOCK_TEAM[0], // Simulated logged-in user
  users: MOCK_TEAM,
  leads: MOCK_LEADS,
  clients: MOCK_CLIENTS,
  tasks: MOCK_TASKS,

  addLead: (lead) => set((state) => ({
    leads: [...state.leads, { ...lead, id: Math.random().toString(36).substr(2, 9), history: [] }]
  })),

  updateLead: (id, updates) => set((state) => ({
    leads: state.leads.map(l => l.id === id ? { ...l, ...updates } : l)
  })),

  addHistoryToLead: (leadId, note) => set((state) => ({
    leads: state.leads.map(l => {
      if (l.id !== leadId) return l;
      const newNote: Note = {
        ...note,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        authorId: state.currentUser.id
      };
      return { ...l, history: [newNote, ...l.history] };
    })
  })),

  convertToClient: (leadId, clientData) => set((state) => {
    // 1. Update Lead Status
    const updatedLeads = state.leads.map(l => l.id === leadId ? { ...l, status: "Converted" as Status } : l);
    
    // 2. Create Client
    const newClient: Client = {
      ...clientData,
      id: Math.random().toString(36).substr(2, 9),
      leadId,
      notes: []
    };

    return { leads: updatedLeads, clients: [...state.clients, newClient] };
  }),

  updateClient: (id, updates) => set((state) => ({
    clients: state.clients.map(c => c.id === id ? { ...c, ...updates } : c)
  })),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, { ...task, id: Math.random().toString(36).substr(2, 9) }]
  })),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
}));
