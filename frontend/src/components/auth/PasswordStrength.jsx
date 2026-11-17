
import { CheckCircle2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function getPasswordChecks(password = "") {
  return [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "One uppercase letter (A-Z)",
      valid: /[A-Z]/.test(password),
    },
    {
      label: "One lowercase letter (a-z)",
      valid: /[a-z]/.test(password),
    },
    {
      label: "One number (0-9)",
      valid: /[0-9]/.test(password),
    },
    {
      label: "One special character (!@#$...)",
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function isValidPassword(password) {
  return (
    password.length <= 128 &&
    getPasswordChecks(password).every((check) => check.valid)
  );
}

export function PasswordStrength({ password = "" }) {
  const checks = getPasswordChecks(password);
  const passed = checks.filter((check) => check.valid).length;
  const valid = isValidPassword(password);
  const progress = (passed / checks.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Password requirements
        </span>

        <span
          className={
            valid
              ? "font-medium text-green-600"
              : "text-muted-foreground"
          }
        >
          {valid ? "All requirements met" : `${passed}/5`}
        </span>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center gap-2 text-sm"
          >
            {check.valid ? (
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-green-600"
              />
            ) : (
              <Circle
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
            )}

            <span
              className={
                check.valid
                  ? "text-green-600"
                  : "text-muted-foreground"
              }
            >
              {check.label}
            </span>
          </div>
        ))}

        {password.length > 128 && (
          <p className="text-sm text-destructive">
            Password cannot exceed 128 characters.
          </p>
        )}
      </div>
    </div>
  );
}
