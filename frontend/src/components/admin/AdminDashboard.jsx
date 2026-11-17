import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import KnowledgeBase from "./KnowledgeBase";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STUDENTS_API = "/api/v1/admin/students";
const STAFF_API = "/api/v1/admin/support-staff";

const TABS = [
  { id: "overview", label: "Overview", icon: Users },
  { id: "students", label: "Students", icon: Users },
  { id: "staff", label: "Staff", icon: ShieldCheck },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
];

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  role: "support",
  password: "",
  confirmPassword: "",
};

const EMPTY_PASSWORD = {
  current_password: "",
  new_password: "",
  confirm_new_password: "",
};

function validPassword(password) {
  return (
    password.length >= 8 &&
    password.length <= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function SmallStat({ title, value }) {
  return (
    <Card className="rounded-lg">
      <CardContent className="p-3 sm:p-4">
        <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{title}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input {...props} className="h-9 text-base sm:h-8 sm:text-xs" />
    </div>
  );
}

function PasswordField({ label, value, onChange, autoComplete = "new-password" }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>

      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          maxLength={12}
          required
          className="h-9 pr-11 text-base sm:h-8 sm:text-xs"
        />

        <button
          type="button"
          onClick={() => setVisible((previous) => !previous)}
          className="absolute right-1 top-1/2 flex h-7 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function PersonCardActions({ children }) {
  return <div className="grid grid-cols-2 gap-2 border-t pt-2">{children}</div>;
}

export default function AdminDashboard({ user, token }) {
  const [tab, setTab] = useState("overview");
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [studentSearch, setStudentSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  const [dialog, setDialog] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [adminPassword, setAdminPassword] = useState({ ...EMPTY_PASSWORD });

  // ========================================
  // LOAD STUDENTS AND STAFF
  // ========================================

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      apiRequest(STUDENTS_API, undefined, token),
      apiRequest(STAFF_API, undefined, token),
    ]);

    const messages = [];

    if (results[0].status === "fulfilled") {
      setStudents(Array.isArray(results[0].value) ? results[0].value : []);
    } else {
      messages.push(`Students: ${results[0].reason.message}`);
    }

    if (results[1].status === "fulfilled") {
      setStaff(Array.isArray(results[1].value) ? results[1].value : []);
    } else {
      messages.push(`Staff: ${results[1].reason.message}`);
    }

    setError(messages.join(" | "));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.toLowerCase().trim();
    return students.filter((student) =>
      [student.name, student.email, student.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [students, studentSearch]);

  const filteredStaff = useMemo(() => {
    const query = staffSearch.toLowerCase().trim();
    return staff.filter((person) =>
      [person.name, person.email, person.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [staff, staffSearch]);

  function openDialog(type, person = null) {
    setDialog(type);
    setSelected(person);
    setAdminPassword({ ...EMPTY_PASSWORD });
    setForm({
      name: person?.name || "",
      email: person?.email || "",
      phone: person?.phone || "",
      role: person?.role || "support",
      password: "",
      confirmPassword: "",
    });
  }

  function closeDialog() {
    if (saving) return;
    setDialog(null);
    setSelected(null);
    setForm({ ...EMPTY_FORM });
    setAdminPassword({ ...EMPTY_PASSWORD });
  }

  function updateField(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  // ========================================
  // CREATE / EDIT STAFF AND STUDENTS
  // ========================================

  async function submitForm(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);

    try {
      const base = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
      };

      if (dialog === "edit-student") {
        await apiRequest(`${STUDENTS_API}/${selected.id}`, base, token, { method: "PATCH" });
      }

      if (dialog === "create-staff") {
        if (!validPassword(form.password)) {
          throw new Error(
            "Password must contain 8–12 characters, uppercase, lowercase, number and special character."
          );
        }
        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await apiRequest(
          STAFF_API,
          { ...base, temporary_password: form.password },
          token
        );
      }

      if (dialog === "edit-staff") {
        await apiRequest(
          `${STAFF_API}/${selected.id}`,
          { name: base.name, phone: base.phone, role: form.role },
          token,
          { method: "PATCH" }
        );
      }

      if (dialog === "reset-password") {
        if (!validPassword(form.password)) {
          throw new Error("Enter a strong password");
        }
        if (form.password !== form.confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await apiRequest(
          `${STAFF_API}/${selected.id}/reset-password`,
          { temporary_password: form.password },
          token
        );
      }

      toast.success("Changes saved successfully");
      closeDialogAfterSave();
      await refresh();
    } catch (err) {
      toast.error(err.message || "Unable to save changes");
    } finally {
      setSaving(false);
    }
  }

  function closeDialogAfterSave() {
    setDialog(null);
    setSelected(null);
    setForm({ ...EMPTY_FORM });
    setAdminPassword({ ...EMPTY_PASSWORD });
  }

  // ========================================
  // ADMIN CHANGE OWN PASSWORD
  // ========================================

  async function changeMyPassword(event) {
    event.preventDefault();
    if (saving) return;

    if (!validPassword(adminPassword.new_password)) {
      toast.error(
        "New password must contain uppercase, lowercase, number, special character and at least 8 characters."
      );
      return;
    }

    if (adminPassword.new_password !== adminPassword.confirm_new_password) {
      toast.error("New passwords do not match");
      return;
    }

    if (adminPassword.current_password === adminPassword.new_password) {
      toast.error("New password must differ from your current password");
      return;
    }

    setSaving(true);

    try {
      await apiRequest(
        "/api/v1/auth/change-password",
        {
          current_password: adminPassword.current_password,
          new_password: adminPassword.new_password,
          confirm_new_password: adminPassword.confirm_new_password,
        },
        token
      );

      toast.success("Password changed. Please sign out and sign in again.");
      closeDialogAfterSave();
    } catch (err) {
      toast.error(err.message || "Unable to change password");
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // ACTIVATE / DEACTIVATE ACCOUNTS
  // ========================================

  async function confirmAction() {
    if (!selected || saving) return;

    setSaving(true);

    try {
      if (dialog === "deactivate-student") {
        await apiRequest(`${STUDENTS_API}/${selected.id}`, undefined, token, { method: "DELETE" });
      }

      if (dialog === "reactivate-student") {
        await apiRequest(`${STUDENTS_API}/${selected.id}/reactivate`, undefined, token, { method: "PATCH" });
      }

      if (dialog === "deactivate-staff") {
        await apiRequest(`${STAFF_API}/${selected.id}/deactivate`, undefined, token, { method: "PATCH" });
      }

      toast.success("Account status updated");
      closeDialogAfterSave();
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  const actionDialog = [
    "deactivate-student",
    "reactivate-student",
    "deactivate-staff",
  ].includes(dialog);

  const formDialog = [
    "edit-student",
    "create-staff",
    "edit-staff",
    "reset-password",
  ].includes(dialog);

  // ========================================
  // RENDER
  // ========================================

  return (
    <main className="min-w-0 flex-1 overflow-x-hidden bg-background px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto w-full max-w-5xl space-y-3">

        {/* HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Badge variant="secondary" className="text-[10px]">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Administrator
            </Badge>

            <h1 className="mt-2 text-lg font-semibold sm:text-xl">Admin Dashboard</h1>
            <p className="truncate text-xs text-muted-foreground">
              Welcome, {user?.name || "Admin"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs sm:h-8"
              onClick={() => openDialog("change-my-password")}
            >
              <KeyRound className="mr-1 h-3.5 w-3.5" />
              <span className="sm:hidden">Password</span>
              <span className="hidden sm:inline">Change My Password</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs sm:h-8"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav
          aria-label="Admin sections"
          className="-mx-1 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={tab === id ? "default" : "ghost"}
              aria-current={tab === id ? "page" : undefined}
              className="h-9 shrink-0 gap-1.5 px-3 text-xs sm:h-8 sm:px-2.5"
              onClick={() => setTab(id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </nav>

        {loading && (
          <div className="flex items-center gap-2 py-4 text-xs" role="status">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            Loading accounts...
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md border p-3 text-xs text-destructive">
            {error}
          </p>
        )}

        {/* OVERVIEW */}
        {tab === "overview" && !loading && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <SmallStat title="Total Students" value={students.length} />
            <SmallStat title="Active Students" value={students.filter((p) => p.is_active).length} />
            <SmallStat title="Staff Accounts" value={staff.length} />
            <SmallStat title="Active Staff" value={staff.filter((p) => p.is_active).length} />
          </div>
        )}

        {/* STUDENTS */}
        {tab === "students" && !loading && (
          <Card>
            <CardHeader className="p-3 pb-2 sm:p-4">
              <CardTitle className="text-sm sm:text-base">Student Management</CardTitle>
              <p className="text-xs text-muted-foreground">
                View, edit and manage student accounts.
              </p>
            </CardHeader>

            <CardContent className="space-y-3 p-3 pt-2 sm:p-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Search students..."
                  aria-label="Search students"
                  className="h-9 pl-8 text-base sm:h-8 sm:text-xs"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredStudents.map((student) => (
                  <Card key={student.id}>
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold sm:text-xs">
                          {student.name}
                        </p>
                        <Badge
                          variant={student.is_active ? "default" : "outline"}
                          className="shrink-0 text-[10px]"
                        >
                          {student.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <p className="break-all text-xs text-muted-foreground">{student.email}</p>
                      <p className="text-xs text-muted-foreground">{student.phone || "No phone"}</p>

                      <Badge variant="secondary" className="text-[10px]">
                        {student.role}
                      </Badge>

                      <PersonCardActions>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs sm:h-7 sm:text-[11px]"
                          onClick={() => openDialog("edit-student", student)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>

                        {student.is_active ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 text-xs text-destructive sm:h-7 sm:text-[11px]"
                            onClick={() => openDialog("deactivate-student", student)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 text-xs sm:h-7 sm:text-[11px]"
                            onClick={() => openDialog("reactivate-student", student)}
                          >
                            <UserCheck className="mr-1 h-3 w-3" />
                            Activate
                          </Button>
                        )}
                      </PersonCardActions>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredStudents.length === 0 && (
                <p className="py-5 text-center text-xs text-muted-foreground">
                  No students found.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* STAFF */}
        {tab === "staff" && !loading && (
          <Card>
            <CardHeader className="flex flex-col gap-3 p-3 pb-2 sm:flex-row sm:items-start sm:justify-between sm:p-4">
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base">Staff Management</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create staff, change roles and reset passwords.
                </p>
              </div>

              <Button
                size="sm"
                className="h-9 w-full text-xs sm:h-8 sm:w-auto"
                onClick={() => openDialog("create-staff")}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Staff
              </Button>
            </CardHeader>

            <CardContent className="space-y-3 p-3 pt-2 sm:p-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={staffSearch}
                  onChange={(event) => setStaffSearch(event.target.value)}
                  placeholder="Search staff..."
                  aria-label="Search staff"
                  className="h-9 pl-8 text-base sm:h-8 sm:text-xs"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredStaff.map((person) => (
                  <Card key={person.id}>
                    <CardContent className="space-y-2 p-3">
                      <p className="truncate text-sm font-semibold sm:text-xs">{person.name}</p>
                      <p className="break-all text-xs text-muted-foreground">{person.email}</p>
                      <p className="text-xs text-muted-foreground">{person.phone || "No phone"}</p>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {person.role === "admin" ? "Administrator" : "Admission Support"}
                        </Badge>
                        <Badge
                          variant={person.is_active ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {person.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      <PersonCardActions>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs sm:h-7 sm:text-[11px]"
                          onClick={() => openDialog("edit-staff", person)}
                        >
                          Edit Role
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 text-xs sm:h-7 sm:text-[11px]"
                          onClick={() => openDialog("reset-password", person)}
                        >
                          <KeyRound className="mr-1 h-3 w-3" />
                          Password
                        </Button>
                      </PersonCardActions>

                      {person.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-full text-xs text-destructive sm:h-7 sm:text-[11px]"
                          onClick={() => openDialog("deactivate-staff", person)}
                        >
                          Deactivate Staff
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredStaff.length === 0 && (
                <p className="py-5 text-center text-xs text-muted-foreground">
                  No staff accounts found.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* KNOWLEDGE BASE */}
        {tab === "knowledge" && <KnowledgeBase token={token} />}

        {/* CREATE / EDIT / RESET PASSWORD */}
        <Dialog open={formDialog} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="max-h-[88dvh] w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">
                {dialog === "edit-student" && "Edit Student"}
                {dialog === "create-staff" && "Create Staff"}
                {dialog === "edit-staff" && "Edit Staff & Role"}
                {dialog === "reset-password" && "Reset Staff Password"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={submitForm} className="space-y-3">
              {dialog !== "reset-password" && (
                <>
                  <Field
                    label="Full Name"
                    value={form.name}
                    required
                    minLength={2}
                    maxLength={150}
                    onChange={(event) => updateField("name", event.target.value)}
                  />
                  <Field
                    label="Email"
                    type="email"
                    required
                    disabled={dialog === "edit-staff"}
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                  <Field
                    label="Phone"
                    type="tel"
                    inputMode="tel"
                    maxLength={20}
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />
                </>
              )}

              {dialog === "edit-staff" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Staff Role</Label>
                  <select
                    value={form.role}
                    onChange={(event) => updateField("role", event.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-2 text-base sm:h-8 sm:text-xs"
                  >
                    <option value="support">Admission Support</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              )}

              {(dialog === "create-staff" || dialog === "reset-password") && (
                <>
                  <PasswordField
                    key={`${dialog}-password`}
                    label="Temporary Password"
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                  />
                  <PasswordField
                    key={`${dialog}-confirm`}
                    label="Confirm Password"
                    value={form.confirmPassword}
                    onChange={(event) => updateField("confirmPassword", event.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Staff must change this temporary password when required at their next login.
                  </p>
                </>
              )}

              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={closeDialog}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* CHANGE ADMIN PASSWORD */}
        <Dialog
          open={dialog === "change-my-password"}
          onOpenChange={(open) => !open && closeDialog()}
        >
          <DialogContent className="max-h-[88dvh] w-[calc(100vw-1.5rem)] overflow-y-auto p-4 sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Change My Password</DialogTitle>
              <DialogDescription>
                Enter your current password and choose a new permanent password.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={changeMyPassword} className="space-y-3">
              <PasswordField
                key="admin-current"
                label="Current Password"
                value={adminPassword.current_password}
                autoComplete="current-password"
                onChange={(event) =>
                  setAdminPassword((previous) => ({
                    ...previous,
                    current_password: event.target.value,
                  }))
                }
              />
              <PasswordField
                key="admin-new"
                label="New Permanent Password"
                value={adminPassword.new_password}
                onChange={(event) =>
                  setAdminPassword((previous) => ({
                    ...previous,
                    new_password: event.target.value,
                  }))
                }
              />
              <PasswordField
                key="admin-confirm"
                label="Confirm New Password"
                value={adminPassword.confirm_new_password}
                onChange={(event) =>
                  setAdminPassword((previous) => ({
                    ...previous,
                    confirm_new_password: event.target.value,
                  }))
                }
              />

              <p className="text-[11px] text-muted-foreground">
                Use 8–12 characters with uppercase, lowercase, number and special character.
              </p>

              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={closeDialog}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                  {saving ? "Updating..." : "Update Password"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ACCOUNT STATUS CONFIRMATION */}
        <Dialog open={actionDialog} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirm Account Action</DialogTitle>
              <DialogDescription>
                {dialog === "reactivate-student"
                  ? `Reactivate ${selected?.name}?`
                  : `Deactivate ${selected?.name}? The account will lose access.`}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={closeDialog}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant={dialog === "reactivate-student" ? "default" : "destructive"}
                className="w-full sm:w-auto"
                onClick={confirmAction}
                disabled={saving}
              >
                {saving ? "Updating..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}