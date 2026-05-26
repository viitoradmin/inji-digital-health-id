import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nameFromEmail, setAuthUser } from "@/lib/auth-session";

type Tab = "login" | "register";

export function AuthForm() {
  const [tab, setTab] = useState<Tab>("login");

  return (
    <div className="space-y-6">
      {/* Tab toggle */}
      <div className="flex rounded-xl bg-secondary p-1">
        {(["login", "register"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 h-9 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "login" ? "Sign in" : "Register"}
          </button>
        ))}
      </div>

      {tab === "login" ? <LoginForm /> : <RegisterForm onSuccess={() => setTab("login")} />}
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("Email is required.");
    if (!password) return setError("Password is required.");
    setError(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setAuthUser({ email: email.trim(), name: nameFromEmail(email.trim()) });
    setLoading(false);
    navigate({ to: "/dashboard" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email" className="text-xs font-medium flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
        </Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="you@example.com"
          autoComplete="email"
          className="h-11 rounded-xl border-border bg-background"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-pw" className="text-xs font-medium flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
          </Label>
          <button type="button" className="text-[11px] text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Input
            id="login-pw"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="••••••••"
            autoComplete="current-password"
            className="h-11 rounded-xl border-border bg-background pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-brand text-primary-foreground font-medium shadow-elevated hover:shadow-glow transition-shadow disabled:opacity-60 mt-1"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
          </>
        ) : (
          <>
            Sign in <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Full name is required.");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setError(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setAuthUser({ email: email.trim(), name: name.trim() });
    setLoading(false);
    void navigate({ to: "/dashboard" });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reg-name" className="text-xs font-medium flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" /> Full name
        </Label>
        <Input
          id="reg-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="Shailesh Gojiya"
          autoComplete="name"
          className="h-11 rounded-xl border-border bg-background"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-email" className="text-xs font-medium flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
        </Label>
        <Input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="you@example.com"
          autoComplete="email"
          className="h-11 rounded-xl border-border bg-background"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-pw" className="text-xs font-medium flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
        </Label>
        <div className="relative">
          <Input
            id="reg-pw"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            className="h-11 rounded-xl border-border bg-background pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            tabIndex={-1}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password && <PasswordStrength value={password} />}
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-brand text-primary-foreground font-medium shadow-elevated hover:shadow-glow transition-shadow disabled:opacity-60 mt-1"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
          </>
        ) : (
          <>
            Create account <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-[11px] text-muted-foreground text-center">
        By registering you agree to the{" "}
        <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>.
      </p>
    </form>
  );
}

function PasswordStrength({ value }: { value: string }) {
  const score =
    (value.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(value) ? 1 : 0) +
    (/[0-9]/.test(value) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(value) ? 1 : 0);

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-destructive", "bg-accent", "bg-trust", "bg-success"];

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i <= score ? colors[score] : "bg-border"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground w-10 text-right">{labels[score]}</span>
    </div>
  );
}
