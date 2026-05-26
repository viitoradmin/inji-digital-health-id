import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  User,
  UserPlus,
} from "lucide-react";
import { createRecord } from "@/lib/records-api";
import type { RecordResponse } from "@/types/record";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
] as const;

type FormState = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phoneNumber: string;
};

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  phoneNumber: "",
};

function validate(form: FormState): string | null {
  if (!form.firstName.trim()) return "First name is required.";
  if (!form.lastName.trim()) return "Last name is required.";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "Enter a valid email address.";
  }
  if (form.dateOfBirth) {
    const dob = new Date(form.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return "Enter a valid date of birth.";
    if (dob > new Date()) return "Date of birth cannot be in the future.";
  }
  return null;
}

export function RegisterIdentityForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<RecordResponse | null>(null);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate(form);
    if (validation) {
      setSubmitError(validation);
      return;
    }

    setLoading(true);
    setSubmitError(null);

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
      ...(form.gender ? { gender: form.gender } : {}),
      ...(form.email.trim() ? { email: form.email.trim() } : {}),
      ...(form.phoneNumber.trim() ? { phoneNumber: form.phoneNumber.trim() } : {}),
    };

    const { data, error, status } = await createRecord(payload);
    setLoading(false);

    if (error || !data) {
      if (status === 409) {
        setSubmitError("This email is already registered. Use a different email.");
      } else {
        setSubmitError(
          error || "Could not save your record. Ensure Inji Certify is running on port 8090.",
        );
      }
      return;
    }

    setCreated(data);
    try {
      sessionStorage.setItem("certify:lastRecordId", data.id);
    } catch {
      /* ignore */
    }
  };

  if (created) {
    return <SuccessView record={created} onContinue={() => navigate({ to: "/dashboard" })} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <header className="space-y-1 pb-1">
        <RegisterIconBadge />
        <h2 className="text-2xl font-semibold tracking-tight">Register your identity</h2>
        <p className="text-sm text-muted-foreground">
          Enter the details that will appear on your verifiable credential.
        </p>
      </header>

      <FormSection title="Personal details">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="firstName" label="First name" required icon={User}>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="Shailesh"
              autoComplete="given-name"
              className="h-11 rounded-xl border-border bg-background"
            />
          </FormField>
          <FormField id="lastName" label="Last name" required icon={User}>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              placeholder="Gojiya"
              autoComplete="family-name"
              className="h-11 rounded-xl border-border bg-background"
            />
          </FormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="dateOfBirth" label="Date of birth" icon={Calendar}>
            <Input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => update("dateOfBirth", e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="h-11 rounded-xl border-border bg-background"
            />
          </FormField>
          <FormField id="gender" label="Gender">
            <Select value={form.gender || undefined} onValueChange={(v) => update("gender", v)}>
              <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Contact">
        <FormField id="email" label="Email" icon={Mail}>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="h-11 rounded-xl border-border bg-background"
          />
        </FormField>
        <FormField id="phoneNumber" label="Phone number" icon={Phone}>
          <Input
            id="phoneNumber"
            type="tel"
            value={form.phoneNumber}
            onChange={(e) => update("phoneNumber", e.target.value)}
            placeholder="+91 98765 43210"
            autoComplete="tel"
            className="h-11 rounded-xl border-border bg-background"
          />
        </FormField>
      </FormSection>

      {submitError && (
        <p
          role="alert"
          className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5"
        >
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-brand text-primary-foreground font-medium shadow-elevated hover:shadow-glow transition-shadow disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving record…
          </>
        ) : (
          <>
            Register & continue <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        Your details are stored in{" "}
        <span className="font-mono text-foreground/80">certify.records</span> and can be used when
        issuing a HealthID credential.
      </p>
    </form>
  );
}

function RegisterIconBadge() {
  return (
    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary mb-2">
      <UserPlus className="h-5 w-5" />
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-border/80 bg-secondary/30 p-4">
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {title}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function FormField({
  id,
  label,
  required,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SuccessView({ record, onContinue }: { record: RecordResponse; onContinue: () => void }) {
  return (
    <div className="space-y-5 text-center py-2">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Registration complete</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {record.firstName} {record.lastName} was saved successfully.
        </p>
      </div>
      <RecordIdCard record={record} />
      <button
        type="button"
        onClick={onContinue}
        className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-brand text-primary-foreground font-medium shadow-elevated"
      >
        Go to dashboard <ArrowRight className="h-4 w-4" />
      </button>
      <Link
        to="/issuance"
        search={{ recordId: undefined, credentialConfigId: undefined }}
        className="block text-sm text-primary hover:underline"
      >
        Issue a credential now
      </Link>
    </div>
  );
}

function RecordIdCard({ record }: { record: RecordResponse }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-left">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your record ID</p>
      <p className="font-mono text-sm mt-1 break-all text-foreground">{record.id}</p>
      <p className="text-xs text-muted-foreground mt-2">
        Use this ID in pre-auth claims when issuing a HealthID credential.
      </p>
    </div>
  );
}
