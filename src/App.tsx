import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import CourseBuilder from "./pages/CourseBuilder";
import CoursePreview from "./pages/CoursePreview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/organization" element={
              <ProtectedRoute requiredRole="organization">
                <OrganizationDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student" element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/course-builder" element={
              <ProtectedRoute requiredRole="organization">
                <CourseBuilder />
              </ProtectedRoute>
            } />
            <Route path="/course-builder/:courseId" element={
              <ProtectedRoute requiredRole="organization">
                <CourseBuilder />
              </ProtectedRoute>
            } />
            <Route path="/course-preview/:courseId" element={
              <ProtectedRoute requiredRole="organization">
                <CoursePreview />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
