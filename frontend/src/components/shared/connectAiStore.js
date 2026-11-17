
const KEY = "connectai_ui_demo_v1";

const initialData = {
  tickets: [
    {
      id: "T1001",
      student: "Rahul Kumar",
      email: "rahul@example.com",
      topic: "CSE admission eligibility",
      status: "pending",
      createdAt: "2026-11-10T09:30:00",
      messages: [
        {
          id: "m1",
          sender: "student",
          text: "What are the eligibility requirements for CSE?",
          time: "2026-11-10T09:30:00",
        },
      ],
    },
    {
      id: "T1002",
      student: "Priya",
      email: "priya@example.com",
      topic: "Hostel facilities",
      status: "open",
      createdAt: "2026-11-10T10:15:00",
      messages: [
        {
          id: "m2",
          sender: "student",
          text: "Is hostel accommodation available?",
          time: "2026-11-10T10:15:00",
        },
      ],
    },
  ],
  documents: [
    {
      id: "D1001",
      name: "Admission Guidelines",
      category: "Admissions",
      status: "draft",
      updatedAt: "2026-11-09T10:00:00",
    },
  ],
  users: [
    {
      id: "U1001",
      name: "Rahul Kumar",
      email: "rahul@example.com",
      role: "student",
      active: true,
    },
    {
      id: "U1002",
      name: "Priya",
      email: "priya@example.com",
      role: "student",
      active: true,
    },
  ],
};

export function readStore() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Fall back to demo data.
  }
  return structuredClone(initialData);
}

export function writeStore(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("connectai-store-updated"));
}

export function updateStore(updater) {
  const current = readStore();
  const next = updater(current);
  writeStore(next);
  return next;
}

export function makeId(prefix = "ID") {
  return `${prefix}${Date.now()}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
