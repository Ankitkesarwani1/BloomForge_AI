import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Brain, Mail, Lock, User, Building2 } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [role, setRole] = useState<"faculty" | "admin" | "exam-cell">("faculty");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    // profiles.role uses an underscore ("exam_cell") to match the Postgres enum;
    // the UI keeps the hyphenated value ("exam-cell") for display purposes only.
    const dbRole = role === "exam-cell" ? "exam_cell" : role;
    const { error } = await signUp(email, password, fullName, dbRole);
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
        <h2 className="text-3xl font-bold">Create an account</h2>
        <p className="text-muted-foreground mt-2">Get started with GenQGen today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block mb-2">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Dr. John Doe"
                required
              />
            </div>
          </div>

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
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-3">Select your role</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole("faculty")}
                className={`p-3 border rounded-xl text-sm transition-all ${
                  role === "faculty"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                Faculty
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`p-3 border rounded-xl text-sm transition-all ${
                  role === "admin"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole("exam-cell")}
                className={`p-3 border rounded-xl text-sm transition-all ${
                  role === "exam-cell"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                Exam Cell
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
