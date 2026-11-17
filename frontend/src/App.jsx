
import { useEffect, useState } from "react";

import AdminDashboard from "./components/admin/AdminDashboard";
import SupportDashboard from "./components/support/SupportDashboard";

import {
  Bot,
  GraduationCap,
  BookOpen,
  MessageCircle,
  Headset,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";

import { apiRequest } from "@/lib/api";

import {
  PasswordStrength,
  isValidPassword,
} from "@/components/auth/PasswordStrength";

import StudentDashboard from "@/components/student/StudentDashboard";
import { Toaster } from "./components/ui/sonner";

const COLLEGE_CODE =
  import.meta.env.VITE_COLLEGE_CODE || "DEMO";

const ROLE_NAMES = {
  applicant: "Student",
  parent: "Parent",
  support: "Admission Support",
  admin: "Administrator",
};

const STUDENT_ROLES = ["applicant", "parent", "student"];

const FEATURES = [
  {
    title: "Courses & Fees",
    description:
      "Find course information, tuition fees, and admission details.",
    icon: GraduationCap,
  },
  {
    title: "Admission Policies",
    description:
      "Get information about eligibility and college policies.",
    icon: BookOpen,
  },
  {
    title: "AI Assistant",
    description:
      "Ask questions and receive answers from published college documents.",
    icon: MessageCircle,
  },
  {
    title: "Human Support",
    description:
      "Get help from the admission support team when needed.",
    icon: Headset,
  },
];

const STEPS = [
  "Create your student or parent account.",
  "Sign in to your college dashboard.",
  "Ask the AI assistant admission-related questions.",
  "Read answers with citations from college documents.",
];

const EMPTY_SIGNUP = {
  name: "",
  email: "",
  phone: "",
  role: "applicant",
  password: "",
  confirm_password: "",
};

function Logo() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
      <Bot className="h-4 w-4" />
    </span>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "Enter password",
  autoComplete,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="pr-11"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => setVisible(v => !v)}
        aria-label={
          visible ? "Hide password" : "Show password"
        }
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

function Header({
  user,
  onLogin,
  onSignup,
  onLogout,
}) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a
          href="/"
          className="flex items-center gap-2.5 font-semibold"
        >
          <Logo />
          <span className="text-lg">Connect-Ai</span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <span className="hidden max-w-40 truncate text-sm text-muted-foreground md:block">
                {user.name}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Logout
                </span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogin}
              >
                Login
              </Button>

              <Button
                size="sm"
                onClick={onSignup}
              >
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function ChatPreview() {
  return (
    <Card className="w-full animate-in fade-in slide-in-from-right-4 gap-4 py-5 shadow-xl duration-700">
      <CardHeader className="flex-row items-center gap-3 border-b pb-4">
        <Logo />

        <div className="min-w-0">
          <CardTitle className="text-base">
            Connect-Ai Assistant
          </CardTitle>

          <CardDescription>
            Answers from college documents
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          What is the hostel fee?
        </div>

        <div className="mr-auto max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">
          I can help with hostel fees, admission eligibility,
          courses, and scholarships. Ask me anything from
          the college documents.
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline">
            Admission eligibility
          </Badge>

          <Badge variant="outline">
            Scholarships
          </Badge>

          <Badge variant="outline">
            Hostel
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function Hero({ onSignup, onLogin }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-32 left-1/4 h-80 w-80 animate-pulse rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 right-1/5 h-80 w-80 animate-pulse rounded-full bg-primary/10 blur-3xl [animation-delay:1.5s]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 text-center duration-700 lg:text-left">
          <Badge
            variant="secondary"
            className="gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered College Admissions
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Your admission journey,
            <span className="block text-muted-foreground">
              made simple
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
            Find admission requirements, courses, fees,
            scholarships, and college information
            through one AI-powered assistant.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              size="lg"
              onClick={onSignup}
            >
              Get started
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={onLogin}
            >
              I already have an account
            </Button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md lg:max-w-none">
          <ChatPreview />
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section
      id="features"
      className="border-t bg-muted/40 px-4 py-16 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 space-y-3 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Everything you need
          </h2>

          <p className="text-muted-foreground">
            College admission information in one place.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(feature => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className="transition-shadow duration-300 hover:shadow-lg"
              >
                <CardHeader className="space-y-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>

                  <CardTitle className="text-lg">
                    {feature.title}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
          How Connect-Ai works
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <Card
              key={step}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                  {index + 1}
                </span>

                <p className="pt-1.5 text-sm">
                  {step}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Connect-Ai — College Admission Assistant
        </span>
        <span>Powered by AI</span>
      </div>
    </footer>
  );
}

function AuthDialog({
  mode,
  onModeChange,
  onClose,
  onLoginSuccess,
}) {
  const [login, setLogin] = useState({
    email: "",
    password: "",
  });

  const [signup, setSignup] = useState(
    EMPTY_SIGNUP
  );

  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  function updateSignup(field, value) {
    setSignup(previous => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const data = await apiRequest(
        "/api/v1/auth/login",
        {
          college_code: COLLEGE_CODE,
          email: login.email.trim(),
          password: login.password,
        }
      );

      if (!data.access_token || !data.user) {
        throw new Error("Invalid login response.");
      }

      toast.success("Login successful");
      onLoginSuccess(data);
    } catch (error) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    if (loading) return;

    if (!isValidPassword(signup.password)) {
      toast.error(
        "Please meet all password requirements."
      );
      return;
    }

    if (
      signup.password !== signup.confirm_password
    ) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest(
        "/api/v1/auth/student/register",
        {
          college_code: COLLEGE_CODE,
          name: signup.name.trim(),
          email: signup.email.trim(),
          phone: signup.phone.trim(),
          role: signup.role,
          password: signup.password,
          confirm_password: signup.confirm_password,
        }
      );

      toast.success(
        "Registration successful. Please log in."
      );

      setLogin({
        email: signup.email.trim(),
        password: "",
      });

      setSignup(EMPTY_SIGNUP);
      onModeChange("login");
    } catch (error) {
      toast.error(
        error.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={Boolean(mode)}
      onOpenChange={open => {
        if (!open && !loading) onClose();
      }}
    >
      <DialogContent
        showCloseButton
        className="max-h-[90dvh] overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>
            {isSignup
              ? "Create an account"
              : "Welcome back"}
          </DialogTitle>

          <DialogDescription>
            {isSignup
              ? "Register as a student or parent."
              : "Sign in to access your Connect-Ai dashboard."}
          </DialogDescription>
        </DialogHeader>

        {isSignup ? (
          <form
            onSubmit={handleSignup}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="signup-name">
                Full name
              </Label>

              <Input
                id="signup-name"
                value={signup.name}
                onChange={event =>
                  updateSignup(
                    "name",
                    event.target.value
                  )
                }
                required
                maxLength={150}
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">
                Email
              </Label>

              <Input
                id="signup-email"
                type="email"
                value={signup.email}
                onChange={event =>
                  updateSignup(
                    "email",
                    event.target.value
                  )
                }
                required
                placeholder="Enter email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-phone">
                Phone number
              </Label>

              <Input
                id="signup-phone"
                type="tel"
                value={signup.phone}
                onChange={event =>
                  updateSignup(
                    "phone",
                    event.target.value
                  )
                }
                required
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label>Register as</Label>

              <Select
                value={signup.role}
                onValueChange={value =>
                  updateSignup("role", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Select role"
                  />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="applicant">
                    Student
                  </SelectItem>

                  <SelectItem value="parent">
                    Parent
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">
                Password
              </Label>

              <PasswordInput
                id="signup-password"
                value={signup.password}
                onChange={event =>
                  updateSignup(
                    "password",
                    event.target.value
                  )
                }
                autoComplete="new-password"
              />
            </div>

            <PasswordStrength
              password={signup.password}
            />

            <div className="space-y-2">
              <Label htmlFor="signup-confirm">
                Confirm password
              </Label>

              <PasswordInput
                id="signup-confirm"
                value={signup.confirm_password}
                onChange={event =>
                  updateSignup(
                    "confirm_password",
                    event.target.value
                  )
                }
                autoComplete="new-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create account
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already registered?{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={() =>
                  onModeChange("login")
                }
              >
                Login
              </Button>
            </p>
          </form>
        ) : (
          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="login-email">
                Email
              </Label>

              <Input
                id="login-email"
                type="email"
                value={login.email}
                onChange={event =>
                  setLogin(previous => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                required
                placeholder="Enter email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">
                Password
              </Label>

              <PasswordInput
                id="login-password"
                value={login.password}
                onChange={event =>
                  setLogin(previous => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Login
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={() =>
                  onModeChange("signup")
                }
              >
                Register
              </Button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  session,
  onComplete,
}) {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  });

  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isValidPassword(form.new_password)) {
      toast.error(
        "New password does not meet requirements."
      );
      return;
    }

    if (
      form.new_password !==
      form.confirm_new_password
    ) {
      toast.error("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest(
        "/api/v1/auth/change-password",
        form,
        session.access_token
      );

      toast.success(
        "Password updated. Please sign in again."
      );

      onComplete();
    } catch (error) {
      toast.error(
        error.message || "Password update failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open>
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-md"
        onEscapeKeyDown={event =>
          event.preventDefault()
        }
        onInteractOutside={event =>
          event.preventDefault()
        }
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5" />
            Change password
          </DialogTitle>

          <DialogDescription>
            You must update your temporary password
            before accessing your dashboard.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="current-password">
              Current password
            </Label>

            <PasswordInput
              id="current-password"
              value={form.current_password}
              onChange={event =>
                setForm(previous => ({
                  ...previous,
                  current_password:
                    event.target.value,
                }))
              }
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">
              New password
            </Label>

            <PasswordInput
              id="new-password"
              value={form.new_password}
              onChange={event =>
                setForm(previous => ({
                  ...previous,
                  new_password:
                    event.target.value,
                }))
              }
              autoComplete="new-password"
            />
          </div>

          <PasswordStrength
            password={form.new_password}
          />

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">
              Confirm new password
            </Label>

            <PasswordInput
              id="confirm-new-password"
              value={form.confirm_new_password}
              onChange={event =>
                setForm(previous => ({
                  ...previous,
                  confirm_new_password:
                    event.target.value,
                }))
              }
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Update password
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="break-all font-medium">
        {value}
      </p>
    </div>
  );
}

function Dashboard({ user }) {
  const roleName =
    ROLE_NAMES[user.role] || user.role;

  return (
    <main className="mx-auto w-full max-w-6xl animate-in fade-in space-y-8 px-4 py-10 duration-500 sm:px-6">
      <div className="space-y-2">
        <Badge variant="secondary">
          {roleName}
        </Badge>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome, {user.name}
        </h1>

        <p className="text-muted-foreground">
          Your Connect-Ai dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Account verified
            </CardTitle>

            <CardDescription>
              Signed in as {roleName}
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6 sm:grid-cols-2">
            <InfoRow
              label="Email"
              value={user.email}
            />

            <InfoRow
              label="College ID"
              value={user.college_id}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Coming soon
            </CardTitle>

            <CardDescription>
              Your role-specific management dashboard
              is in the next development phase.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Badge variant="outline">
              In progress
            </Badge>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function App() {
  const [authMode, setAuthMode] = useState(null);

  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem(
        "connect_ai_session"
      );

      if (!saved) return null;

      const parsed = JSON.parse(saved);

      if (
        !parsed.access_token ||
        !parsed.user
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  });

  const user = session?.user || null;

  const isStudent =
    user && STUDENT_ROLES.includes(user.role);

  function handleLoginSuccess(data) {
    sessionStorage.setItem(
      "connect_ai_session",
      JSON.stringify(data)
    );

    setSession(data);
    setAuthMode(null);
  }

  function logout() {
    sessionStorage.removeItem(
      "connect_ai_session"
    );

    localStorage.removeItem(
      "connect_ai_session"
    );

    setSession(null);
    setAuthMode(null);

    toast.success("Logged out successfully");
  }

  function handlePasswordComplete() {
    sessionStorage.removeItem(
      "connect_ai_session"
    );

    localStorage.removeItem(
      "connect_ai_session"
    );

    setSession(null);
    setAuthMode("login");
  }

  // Handle an expired JWT from chat or voice endpoints.
  // No changes to the existing UI are necessary.
  useEffect(() => {
    function handleExpiredSession() {
      sessionStorage.removeItem(
        "connect_ai_session"
      );

      localStorage.removeItem(
        "connect_ai_session"
      );

      setSession(null);
      setAuthMode("login");

      toast.error(
        "Your session has expired. Please sign in again."
      );
    }

    window.addEventListener(
      "connect-ai-auth-expired",
      handleExpiredSession
    );

    return () => {
      window.removeEventListener(
        "connect-ai-auth-expired",
        handleExpiredSession
      );
    };
  }, []);

  function renderContent() {
    if (!session) {
      return (
        <>
          <Hero
            onSignup={() => setAuthMode("signup")}
            onLogin={() => setAuthMode("login")}
          />

          <Features />
          <HowItWorks />
        </>
      );
    }

    if (session.user.must_change_password) {
      return (
        <main className="flex min-h-[70dvh] items-center justify-center px-4">
          <p className="text-muted-foreground">
            Please change your temporary password
            to continue.
          </p>
        </main>
      );
    }

    if (isStudent) {
      return (
        <StudentDashboard
          user={session.user}
          token={session.access_token}
        />
      );
    }

    if (user.role === "admin") {
      return (
        <AdminDashboard
          user={session.user}
          token={session.access_token}
        />
      );
    }

    if (user.role === "support") {
      return (
        <SupportDashboard
          user={session.user}
          token={session.access_token}
        />
      );
    }

    return (
      <Dashboard user={session.user} />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header
        user={user}
        onLogin={() => setAuthMode("login")}
        onSignup={() => setAuthMode("signup")}
        onLogout={logout}
      />

      <div className="flex flex-1 flex-col">
        {renderContent()}
      </div>

      {(!session || !isStudent) && (
        <Footer />
      )}

      {!session && (
        <AuthDialog
          mode={authMode}
          onModeChange={setAuthMode}
          onClose={() => setAuthMode(null)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {session?.user?.must_change_password && (
        <ChangePasswordDialog
          session={session}
          onComplete={handlePasswordComplete}
        />
      )}

      <Toaster
        richColors
        position="top-center"
        closeButton
      />
    </div>
  );
}
