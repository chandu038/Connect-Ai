import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  Headset,
  Users,
  MessageSquare,
  RefreshCw,
  Search,
  Loader2,
  Copy,
  UserRound,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BASE = "/api/v1/support";

const TABS = [
  { id: "overview", label: "Overview", icon: Headset },
  { id: "students", label: "Student Questions", icon: Users },
  { id: "popular", label: "Most Asked", icon: MessageSquare },
];

// ==========================================
// HELPERS
// ==========================================

function dateLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function Empty({ message }) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground sm:p-5">
      {message}
    </div>
  );
}

function SmallStat({ label, value, Icon }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</p>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="mt-2 text-lg font-semibold tabular-nums sm:text-xl">{value ?? 0}</p>
      </CardContent>
    </Card>
  );
}

// ==========================================
// STUDENT DETAILS DIALOG
// ==========================================

function StudentDetailsDialog({ student, open, onOpenChange }) {
  async function copyValue(value, label) {
    if (!hasValue(value)) {
      toast.error(`${label} is not available`);
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Unable to copy ${label}`);
    }
  }

  const details = student
    ? [
        { label: "Student ID", value: student.id, Icon: UserRound },
        { label: "Phone Number", value: student.phone, Icon: Phone },
        { label: "Email Address", value: student.email, Icon: Mail },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-xl p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-5 w-5" aria-hidden="true" />
            Student Details
          </DialogTitle>
          <DialogDescription className="text-xs">
            View and copy student information.
          </DialogDescription>
        </DialogHeader>

        {student && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
              <div className="shrink-0 rounded-full bg-background p-2.5">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {student.name || "Unknown Student"}
                </p>
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  {student.role === "parent" ? "Parent" : "Student / Applicant"}
                </Badge>
              </div>

              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0"
                onClick={() => copyValue(student.name, "Student name")}
                aria-label="Copy student name"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-2">
              {details.map(({ label, value, Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="break-all text-sm font-medium">
                      {hasValue(value) ? value : "Not provided"}
                    </p>
                  </div>

                  {hasValue(value) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => copyValue(value, label)}
                      aria-label={`Copy ${label}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Student information is available to authorized admission support staff.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// MAIN DASHBOARD
// ==========================================

export default function SupportDashboard({ user, token }) {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [popular, setPopular] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [history, setHistory] = useState(null);
  const [detailsStudent, setDetailsStudent] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const [studentSearch, setStudentSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  // Mobile: show either the student list or the history pane.
  const [mobilePane, setMobilePane] = useState("list");

  // ========================================
  // LOAD TAB DATA
  // ========================================

  const loadTab = useCallback(
    async (selectedTab) => {
      setLoading(true);
      setError("");

      try {
        if (selectedTab === "overview") {
          setOverview(await apiRequest(`${BASE}/overview`, undefined, token));
        }

        if (selectedTab === "students") {
          const result = await apiRequest(`${BASE}/students`, undefined, token);
          setStudents(Array.isArray(result) ? result : []);
        }

        if (selectedTab === "popular") {
          const result = await apiRequest(
            `${BASE}/most-asked-questions`,
            undefined,
            token
          );
          setPopular(Array.isArray(result) ? result : []);
        }
      } catch (err) {
        setError(err.message || "Unable to load support dashboard");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadTab(tab);
  }, [tab, loadTab]);

  // ========================================
  // STUDENT QUESTIONS
  // ========================================

  async function openStudent(student) {
    setSelectedStudent(student);
    setHistory(null);
    setDetailLoading(true);
    setMobilePane("history");

    try {
      const result = await apiRequest(
        `${BASE}/students/${student.id}/questions`,
        undefined,
        token
      );
      setHistory(result);
    } catch (err) {
      toast.error(err.message || "Unable to load student questions");
    } finally {
      setDetailLoading(false);
    }
  }

  // ========================================
  // STUDENT DETAILS POPUP
  // ========================================

  async function showStudentDetails(student) {
    if (!student?.id) return;

    const existing = students.find((item) => item.id === student.id);
    setDetailsStudent(existing || student);

    try {
      const result = await apiRequest(
        `${BASE}/students/${student.id}/questions`,
        undefined,
        token
      );

      if (result?.student) {
        setDetailsStudent((current) =>
          !current || current.id !== student.id
            ? current
            : { ...current, ...result.student }
        );
      }
    } catch (err) {
      toast.error(err.message || "Unable to load complete student details");
    }
  }

  // ========================================
  // FILTERS
  // ========================================

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();

    return students.filter((student) =>
      [student.name, student.email, student.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [students, studentSearch]);

  const filteredQuestions = useMemo(() => {
    const query = questionSearch.trim().toLowerCase();

    return popular.filter((item) =>
      String(item.question || "").toLowerCase().includes(query)
    );
  }, [popular, questionSearch]);

  function changeTab(nextTab) {
    setTab(nextTab);
    setError("");
    if (nextTab !== "students") setMobilePane("list");
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <main className="min-w-0 flex-1 overflow-x-hidden bg-background px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto w-full max-w-5xl space-y-3">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="secondary" className="text-[10px]">
              <Headset className="mr-1 h-3 w-3" aria-hidden="true" />
              Admission Support
            </Badge>

            <h1 className="mt-2 text-lg font-semibold sm:text-xl">Support Dashboard</h1>
            <p className="truncate text-xs text-muted-foreground">
              Welcome, {user?.name || "Support Staff"}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-9 shrink-0 text-xs sm:h-8"
            disabled={loading}
            onClick={() => loadTab(tab)}
          >
            <RefreshCw
              className={cn(
                "mr-1.5 h-3.5 w-3.5",
                loading && "animate-spin motion-reduce:animate-none"
              )}
            />
            Refresh
          </Button>
        </div>

        {/* NAVIGATION */}
        <nav
          aria-label="Support sections"
          className="-mx-1 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={tab === id ? "default" : "ghost"}
              aria-current={tab === id ? "page" : undefined}
              className="h-9 shrink-0 gap-1.5 px-3 text-xs sm:h-8 sm:px-2.5"
              onClick={() => changeTab(id)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </Button>
          ))}
        </nav>

        {/* LOADING */}
        {loading && (
          <div role="status" className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Loading...
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div role="alert" className="rounded-lg border p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* OVERVIEW */}
        {tab === "overview" && !loading && !error && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <SmallStat
                label="Total Questions"
                value={overview?.total_questions}
                Icon={MessageSquare}
              />
              <SmallStat
                label="Students Asked"
                value={overview?.students_who_asked}
                Icon={Users}
              />
            </div>

            <Card>
              <CardHeader className="p-3 pb-2 sm:p-4">
                <CardTitle className="text-sm">Quick Access</CardTitle>
              </CardHeader>

              <CardContent className="grid grid-cols-1 gap-2 p-3 pt-1 sm:flex sm:flex-wrap sm:p-4 sm:pt-2">
                <Button className="h-9 sm:h-8" size="sm" onClick={() => changeTab("students")}>
                  Student Questions
                </Button>
                <Button
                  className="h-9 sm:h-8"
                  size="sm"
                  variant="outline"
                  onClick={() => changeTab("popular")}
                >
                  Most Asked Questions
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STUDENT QUESTIONS */}
        {tab === "students" && !loading && !error && (
          <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">

            {/* STUDENT LIST: hidden on mobile while viewing history */}
            <Card
              className={cn(
                "min-w-0",
                mobilePane === "history" && "hidden lg:block"
              )}
            >
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">Students</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2 p-3 pt-1">
                <div className="relative">
                  <Search
                    className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    placeholder="Search students..."
                    aria-label="Search students"
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    className="h-9 pl-8 text-base sm:h-8 sm:text-xs"
                  />
                </div>

                <div className="max-h-[60dvh] space-y-2 overflow-y-auto pr-0.5 lg:max-h-[550px]">
                  {filteredStudents.length === 0 && (
                    <Empty message="No students found." />
                  )}

                  {filteredStudents.map((student) => {
                    const selected = selectedStudent?.id === student.id;

                    return (
                      <button
                        type="button"
                        key={student.id}
                        onClick={() => openStudent(student)}
                        aria-pressed={selected}
                        className={cn(
                          "w-full min-h-14 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected && "border-primary bg-muted/30"
                        )}
                      >
                        <p className="truncate text-sm font-semibold sm:text-xs">
                          {student.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground sm:text-[11px]">
                          {student.email}
                        </p>
                        <Badge variant="outline" className="mt-2 text-[10px]">
                          {student.question_count ?? 0} questions
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* AI QUESTION HISTORY */}
            <Card
              className={cn(
                "min-w-0",
                mobilePane === "list" && "hidden lg:block"
              )}
            >
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 lg:hidden"
                    onClick={() => setMobilePane("list")}
                    aria-label="Back to student list"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>

                  <CardTitle className="min-w-0 truncate text-sm">
                    {selectedStudent ? selectedStudent.name : "AI Chat Question History"}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-3 pt-1">
                {!selectedStudent && (
                  <Empty message="Select a student to view their question history." />
                )}

                {selectedStudent && detailLoading && (
                  <p role="status" className="flex items-center gap-2 text-xs">
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                    Loading questions...
                  </p>
                )}

                {selectedStudent && !detailLoading && !history && (
                  <Empty message="Unable to load question history." />
                )}

                {selectedStudent && !detailLoading && history && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">AI Chat Question History</h3>
                        <Badge variant="secondary">{history.total_questions ?? 0}</Badge>
                      </div>

                      <button
                        type="button"
                        className="min-h-9 text-xs font-medium text-primary underline underline-offset-4 hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        onClick={() =>
                          showStudentDetails(history.student || selectedStudent)
                        }
                      >
                        Show Student Details
                      </button>
                    </div>

                    {!history.questions?.length && (
                      <Empty message="This student has not asked any recorded questions." />
                    )}

                    {history.questions?.map((item) => (
                      <div key={item.id} className="space-y-2 rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            Student Question
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {dateLabel(item.created_at)}
                          </span>
                        </div>

                        <p className="whitespace-pre-wrap break-words text-sm font-semibold sm:text-xs">
                          {item.question}
                        </p>

                        <div className="rounded-md bg-muted/40 p-3">
                          <p className="mb-1 text-[10px] text-muted-foreground">AI Response</p>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6 sm:text-xs sm:leading-5">
                            {item.answer || "No answer recorded"}
                          </p>
                        </div>

                        {item.needs_support && (
                          <Badge variant="outline" className="text-[10px]">
                            Needs Review
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* MOST ASKED */}
        {tab === "popular" && !loading && !error && (
          <Card>
            <CardHeader className="p-3 pb-2 sm:p-4">
              <CardTitle className="text-sm sm:text-base">Most Asked Questions</CardTitle>
              <p className="text-xs text-muted-foreground">
                Questions ranked by the number of unique students who asked them.
              </p>
            </CardHeader>

            <CardContent className="space-y-3 p-3 pt-2 sm:p-4">
              <div className="relative w-full sm:max-w-sm">
                <Search
                  className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={questionSearch}
                  onChange={(event) => setQuestionSearch(event.target.value)}
                  placeholder="Search questions..."
                  aria-label="Search questions"
                  className="h-9 pl-8 text-base sm:h-8 sm:text-xs"
                />
              </div>

              {filteredQuestions.length === 0 && (
                <Empty message="No questions recorded yet." />
              )}

              {filteredQuestions.map((item, index) => {
                const expanded = expandedQuestion === item.question_key;

                return (
                  <div
                    key={item.question_key || index}
                    className="rounded-lg border p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold sm:text-xs">
                          {item.question}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground sm:text-[11px]">
                          {item.unique_students ?? 0} unique students
                          {" · "}
                          {item.times_asked ?? 0} times asked
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 shrink-0 text-xs sm:h-8"
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedQuestion(expanded ? null : item.question_key)
                        }
                      >
                        {expanded ? "Hide" : "Students"}
                        {expanded ? (
                          <ChevronUp className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </Button>
                    </div>

                    {expanded && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <p className="text-xs font-medium">Students Who Asked</p>

                        {!item.students?.length && (
                          <Empty message="No students available." />
                        )}

                        {item.students?.map((student) => (
                          <div
                            key={student.id}
                            className="flex flex-col gap-2 rounded-md bg-muted/30 p-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">{student.name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {student.email}
                              </p>
                            </div>

                            <div className="flex shrink-0 gap-3 sm:flex-col sm:items-end sm:gap-1">
                              <button
                                type="button"
                                className="min-h-9 text-xs text-primary underline underline-offset-2 hover:opacity-75 sm:min-h-0 sm:text-[11px]"
                                onClick={() => {
                                  changeTab("students");
                                  openStudent(student);
                                }}
                              >
                                View Questions
                              </button>

                              <button
                                type="button"
                                className="min-h-9 text-xs text-primary underline underline-offset-2 hover:opacity-75 sm:min-h-0 sm:text-[11px]"
                                onClick={() => showStudentDetails(student)}
                              >
                                Student Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <StudentDetailsDialog
        student={detailsStudent}
        open={Boolean(detailsStudent)}
        onOpenChange={(open) => {
          if (!open) setDetailsStudent(null);
        }}
      />
    </main>
  );
}