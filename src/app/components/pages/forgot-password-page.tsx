import { useState } from "react";
import { Link } from "react-router";
import { Brain, Mail, ArrowLeft } from "lucide-react";

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
        <h2 className="text-3xl font-bold">Forgot password?</h2>
        <p className="text-muted-foreground mt-2">
          {submitted
            ? "Check your email for reset instructions"
            : "Enter your email to receive reset instructions"}
        </p>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="email"
                type="email"
                className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="professor@university.edu"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
          >
            Send reset link
          </button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-center">
            <p className="text-success">
              Password reset instructions have been sent to your email address.
            </p>
          </div>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      )}
    </div>
  );
}
