import { Outlet } from "react-router";
import { Brain, Sparkles } from "lucide-react";

export function AuthLayout() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Auth forms */}
      <div className="flex items-center justify-center p-8">
        <Outlet />
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary via-secondary to-accent p-12">
        <div className="max-w-md text-white space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              <Brain className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">GenQGen</h1>
              <p className="text-white/80 text-sm">AI-Powered Question Paper Generation</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">AI-Powered Generation</h3>
                <p className="text-white/80 text-sm">Automatically generate question papers using advanced AI</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Bloom's Taxonomy</h3>
                <p className="text-white/80 text-sm">Ensure balanced cognitive levels in your assessments</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Syllabus Coverage</h3>
                <p className="text-white/80 text-sm">Track and optimize curriculum coverage automatically</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/20">
            <p className="text-sm text-white/60">
              Trusted by universities and colleges worldwide for academic excellence
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
