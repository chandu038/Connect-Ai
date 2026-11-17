import { useEffect, useState } from "react";
import {
  Activity,
  Users,
  UserCheck,
  UserX,
  Headset,
  ShieldCheck,
  RefreshCw,
  Loader2,
} from "lucide-react";

import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Metric({ label, value, icon: Icon }) {
  return (
    <Card className="rounded-lg shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
            {label}
          </p>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">
          {value ?? 0}
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminAnalytics({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/api/v1/admin/analytics", undefined, token);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, [token]);

  const roles = data?.student_roles || [];
  const maxValue = Math.max(1, ...roles.map((item) => item.value));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold sm:text-base">Admission Analytics</h2>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Live account statistics for your college.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 text-xs"
          onClick={loadAnalytics}
          disabled={loading}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-xs" role="status">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          Loading analytics...
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-4 text-xs text-destructive" role="alert">
            {error}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <Metric label="Total Students" value={data.total_students} icon={Users} />
            <Metric label="Active Students" value={data.active_students} icon={UserCheck} />
            <Metric label="Inactive Students" value={data.inactive_students} icon={UserX} />
            <Metric label="Total Staff" value={data.total_staff} icon={Headset} />
            <Metric label="Active Staff" value={data.active_staff} icon={Activity} />
            <Metric label="Administrators" value={data.total_admins} icon={ShieldCheck} />
            <Metric label="Support Staff" value={data.total_support_staff} icon={Headset} />
          </div>

          <Card className="rounded-lg">
            <CardHeader className="p-3 pb-2 sm:p-4">
              <CardTitle className="text-sm">Student Role Distribution</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 p-3 pt-1 sm:p-4 sm:pt-2">
              {roles.length === 0 && (
                <p className="text-xs text-muted-foreground">No role data yet.</p>
              )}

              {roles.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate capitalize">{item.name}</span>
                    <span className="shrink-0 font-medium tabular-nums">{item.value}</span>
                  </div>

                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label={item.name}
                    aria-valuemin={0}
                    aria-valuemax={maxValue}
                    aria-valuenow={item.value}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
                      style={{ width: `${(item.value / maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}