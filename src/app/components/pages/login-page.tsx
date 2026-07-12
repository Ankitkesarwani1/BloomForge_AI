import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Brain, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../lib/auth-context";              // ← 1. add this import

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();                                 // ← 2. add this line
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);       // ← 3. new state for showing errors
  const [submitting, setSubmitting] = useState(false);           // ← 3. new state for the loading button

  const handleSubmit = async (e: React.FormEvent) => {            // ← 4. add "async" here
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);              // ← 5. replace the old mock logic with this
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    navigate("/app/dashboard");
  };


  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary rounded-xl">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <span className="text-2xl font-bold">GenQGen</span>
        </div>
        <h2 className="text-3xl font-bold">Welcome back</h2>
        <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="professor@university.edu"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-2 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-border" />
            <span className="text-sm">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </form>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
