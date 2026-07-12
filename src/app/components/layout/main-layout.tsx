import { Outlet } from "react-router";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import { AIAssistant } from "../ai-assistant";
import { useState } from "react";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "ml-20" : "ml-64"}`}>
        <TopNav />
        
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      <AIAssistant />
    </div>
  );
}
