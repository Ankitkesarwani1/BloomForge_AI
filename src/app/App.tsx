import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./lib/auth-context";   // 1. import it

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="genqgen-theme">
      <AuthProvider>                                  {/* 2. wrap it around the router */}
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}