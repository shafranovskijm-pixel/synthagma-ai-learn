import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Plus,
  Upload,
  FileSpreadsheet,
  Search,
  Eye,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit,
  Trash2,
  FileText,
  Download,
  X,
  ChevronRight,
  Link,
  Copy,
  Building2,
  Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
  lessonsCount?: number;
  studentsCount?: number;
  duration?: string;
}

interface Student {
  id: string;
  enrollment_id: string;
  name: string;
  email: string;
  course: string;
  course_id: string;
  progress: number;
  lastActivity: string;
  status: string;
}

interface OrgDocument {
  id: string;
  type: string;
  name: string;
  file_url: string | null;
  created_at: string;
}

interface StudentDocument {
  id: string;
  type: string;
  name: string;
  file_url: string | null;
}

interface TestAttempt {
  id: string;
  lesson_id: string;
  lesson_title: string;
  score: number;
  max_score: number;
  completed_at: string;
  answers: Record<string, number>;
}

interface TestQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  order_index: number;
}

interface StudentDetails {
  student: Student;
  documents: StudentDocument[];
  testAttempts: TestAttempt[];
}

interface RegistrationLink {
  id: string;
  token: string;
  name: string | null;
  inn: string | null;
  expires_at: string;
  used_count: number;
  created_at: string;
}

export default function OrganizationDashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"students" | "courses" | "documents" | "stats" | "links">("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("Организация");
  
  // Documents state
  const [orgDocuments, setOrgDocuments] = useState<OrgDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  
  // Student details dialog
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [isLoadingStudentDetails, setIsLoadingStudentDetails] = useState(false);
  const [testQuestions, setTestQuestions] = useState<Record<string, TestQuestion[]>>({});
  
  // Registration links state
  const [registrationLinks, setRegistrationLinks] = useState<RegistrationLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [showCreateLinkDialog, setShowCreateLinkDialog] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkInn, setNewLinkInn] = useState("");
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  
  // Statistics state
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    completedCount: 0,
    averageProgress: 0
  });

  // Fetch organization data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Get organization ID from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (!profile?.organization_id) {
          setIsLoadingCourses(false);
          return;
        }

        const orgId = profile.organization_id;
        setOrganizationId(orgId);

        // Get organization name
        const { data: orgData } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", orgId)
          .single();
        
        if (orgData) {
          setOrganizationName(orgData.name);
        }

        // Fetch courses for organization
        const { data: coursesData, error } = await supabase
          .from("courses")
          .select(`
            *,
            lessons(count)
          `)
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const courseIds = (coursesData || []).map((c: any) => c.id);
        
        // Get all enrollments for organization's courses
        let allEnrollments: any[] = [];
        if (courseIds.length > 0) {
          const { data: enrollmentsData } = await supabase
            .from("enrollments")
            .select("*")
            .in("course_id", courseIds);
          allEnrollments = enrollmentsData || [];
        }

        // Calculate stats
        const totalStudents = allEnrollments.length;
        const totalCourses = coursesData?.length || 0;
        const completedCount = allEnrollments.filter(e => e.status === 'completed').length;
        const averageProgress = totalStudents > 0 
          ? Math.round(allEnrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / totalStudents)
          : 0;

        // Build students list from enrollments
        const studentsList: Student[] = [];
        for (const enrollment of allEnrollments) {
          const course = coursesData?.find((c: any) => c.id === enrollment.course_id);
          const { data: studentProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", enrollment.user_id)
            .single();
          
          if (studentProfile) {
            studentsList.push({
              id: enrollment.user_id,
              enrollment_id: enrollment.id,
              name: studentProfile.full_name || "Без имени",
              email: studentProfile.email || "",
              course: course?.title || "—",
              course_id: enrollment.course_id,
              progress: enrollment.progress || 0,
              lastActivity: enrollment.started_at,
              status: enrollment.status
            });
          }
        }
        setStudents(studentsList);
        setIsLoadingStudents(false);

        setStats({
          totalStudents,
          totalCourses,
          completedCount,
          averageProgress
        });

        // Get enrollment counts per course
        const coursesWithStats = (coursesData || []).map((course: any) => {
          const courseEnrollments = allEnrollments.filter(e => e.course_id === course.id);
          return {
            id: course.id,
            title: course.title,
            description: course.description,
            is_published: course.is_published,
            created_at: course.created_at,
            lessonsCount: course.lessons?.[0]?.count || 0,
            studentsCount: courseEnrollments.length,
            duration: course.duration || "—",
          };
        });

        setCourses(coursesWithStats);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Ошибка загрузки данных");
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchData();
  }, [user]);

  // Fetch organization documents
  useEffect(() => {
    const fetchOrgDocuments = async () => {
      if (!organizationId) return;
      
      setIsLoadingDocs(true);
      try {
        const { data, error } = await supabase
          .from("org_documents")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setOrgDocuments(data || []);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    if (activeTab === "documents") {
      fetchOrgDocuments();
    }
  }, [organizationId, activeTab]);

  // Fetch registration links
  useEffect(() => {
    const fetchLinks = async () => {
      if (!organizationId || activeTab !== "links") return;
      
      setIsLoadingLinks(true);
      try {
        const { data, error } = await supabase
          .from("registration_links")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        setRegistrationLinks(data || []);
      } catch (error) {
        console.error("Error fetching links:", error);
      } finally {
        setIsLoadingLinks(false);
      }
    };

    fetchLinks();
  }, [organizationId, activeTab]);

  const handleLogout = async () => {
    await signOut();
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const handleCreateRegistrationLink = async () => {
    if (!organizationId) return;
    
    setIsCreatingLink(true);
    try {
      const token = generateToken();
      
      const { error } = await supabase
        .from("registration_links")
        .insert({
          organization_id: organizationId,
          token,
          name: newLinkName || null,
          inn: newLinkInn || null
        });
      
      if (error) throw error;
      
      // Refresh links
      const { data } = await supabase
        .from("registration_links")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      
      setRegistrationLinks(data || []);
      setShowCreateLinkDialog(false);
      setNewLinkName("");
      setNewLinkInn("");
      toast.success("Ссылка для регистрации создана");
    } catch (error) {
      console.error("Error creating link:", error);
      toast.error("Ошибка создания ссылки");
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("registration_links")
        .delete()
        .eq("id", linkId);
      
      if (error) throw error;
      
      setRegistrationLinks(registrationLinks.filter(l => l.id !== linkId));
      toast.success("Ссылка удалена");
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Ошибка удаления");
    }
  };

  const copyLinkToClipboard = (token: string) => {
    const url = `${window.location.origin}/student-register?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Ссылка скопирована");
  };

  // Generate random password
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Create student (just save without sending email)
  const handleCreateStudent = async (sendEmail: boolean) => {
    if (!organizationId || !newStudentName || !newStudentEmail) {
      toast.error("Заполните ФИО и Email");
      return;
    }

    setIsCreatingStudent(true);
    try {
      const password = generatePassword();
      
      // Create user via edge function
      const { data, error } = await supabase.functions.invoke("register-student", {
        body: {
          token: null, // No token - direct creation by org
          email: newStudentEmail,
          password,
          full_name: newStudentName,
          organization_id: organizationId,
          course_id: selectedCourseId || null
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (sendEmail) {
        // TODO: Send email with credentials
        toast.success(`Ученик создан. Пароль: ${password} (сохраните его!)`);
      } else {
        toast.success(`Ученик создан. Пароль: ${password} (сохраните его!)`);
      }

      // Refresh students list
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`
          id,
          progress,
          status,
          started_at,
          course_id,
          courses!inner(id, title, organization_id),
          profiles!inner(user_id, full_name, email)
        `)
        .eq("courses.organization_id", organizationId);

      if (enrollments) {
        const studentsList: Student[] = [];
        for (const enrollment of enrollments as any[]) {
          studentsList.push({
            id: enrollment.profiles.user_id,
            enrollment_id: enrollment.id,
            name: enrollment.profiles.full_name || "Без имени",
            email: enrollment.profiles.email || "",
            course: enrollment.courses.title,
            course_id: enrollment.course_id,
            progress: enrollment.progress || 0,
            lastActivity: enrollment.started_at,
            status: enrollment.status
          });
        }
        setStudents(studentsList);
      }

      setShowAddStudentDialog(false);
      setNewStudentName("");
      setNewStudentEmail("");
      setSelectedCourseId("");
    } catch (error: any) {
      console.error("Error creating student:", error);
      toast.error(error.message || "Ошибка создания ученика");
    } finally {
      setIsCreatingStudent(false);
    }
  };

  const handleDeleteStudent = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from("enrollments")
        .delete()
        .eq("id", enrollmentId);
      
      if (error) throw error;
      
      setStudents(students.filter(s => s.enrollment_id !== enrollmentId));
      toast.success("Ученик удалён из курса");
    } catch (error) {
      console.error("Error deleting enrollment:", error);
      toast.error("Ошибка удаления");
    }
  };

  // Document upload handler
  const handleUploadDocument = async (type: string, file: File) => {
    if (!organizationId) return;
    
    try {
      const filePath = `${organizationId}/${type}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("org-documents")
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("org-documents")
        .getPublicUrl(filePath);
      
      const { error: dbError } = await supabase
        .from("org_documents")
        .insert({
          organization_id: organizationId,
          type,
          name: file.name,
          file_url: publicUrl
        });
      
      if (dbError) throw dbError;
      
      // Refresh documents
      const { data } = await supabase
        .from("org_documents")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      
      setOrgDocuments(data || []);
      toast.success("Документ загружен");
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Ошибка загрузки документа");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from("org_documents")
        .delete()
        .eq("id", docId);
      
      if (error) throw error;
      
      setOrgDocuments(orgDocuments.filter(d => d.id !== docId));
      toast.success("Документ удалён");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Ошибка удаления");
    }
  };

  // Student details handler
  const handleViewStudent = async (student: Student) => {
    setIsLoadingStudentDetails(true);
    setShowStudentDialog(true);
    
    try {
      // Fetch student documents
      const { data: docs } = await supabase
        .from("student_documents")
        .select("*")
        .eq("enrollment_id", student.enrollment_id);
      
      // Fetch test attempts for this student
      const { data: attempts } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("user_id", student.id)
        .order("completed_at", { ascending: false });
      
      // Get lesson titles for attempts
      const lessonIds = [...new Set((attempts || []).map(a => a.lesson_id))];
      const testAttemptsWithTitles: TestAttempt[] = [];
      
      for (const attempt of attempts || []) {
        const { data: lesson } = await supabase
          .from("lessons")
          .select("title, course_id")
          .eq("id", attempt.lesson_id)
          .single();
        
        // Only include attempts from this organization's courses
        if (lesson) {
          const { data: course } = await supabase
            .from("courses")
            .select("organization_id")
            .eq("id", lesson.course_id)
            .single();
          
          if (course?.organization_id === organizationId) {
            testAttemptsWithTitles.push({
              id: attempt.id,
              lesson_id: attempt.lesson_id,
              lesson_title: lesson.title,
              score: attempt.score,
              max_score: attempt.max_score,
              completed_at: attempt.completed_at,
              answers: attempt.answers as Record<string, number>
            });
          }
        }
      }
      
      // Fetch test questions for each lesson
      const questionsMap: Record<string, TestQuestion[]> = {};
      for (const lessonId of lessonIds) {
        const { data: questions } = await supabase
          .from("test_questions")
          .select("*")
          .eq("lesson_id", lessonId)
          .order("order_index");
        
        if (questions) {
          questionsMap[lessonId] = questions.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options as string[],
            correct_answer: q.correct_answer,
            order_index: q.order_index
          }));
        }
      }
      
      setTestQuestions(questionsMap);
      setSelectedStudent({
        student,
        documents: (docs || []).map(d => ({
          id: d.id,
          type: d.type,
          name: d.name,
          file_url: d.file_url
        })),
        testAttempts: testAttemptsWithTitles
      });
    } catch (error) {
      console.error("Error fetching student details:", error);
      toast.error("Ошибка загрузки данных ученика");
    } finally {
      setIsLoadingStudentDetails(false);
    }
  };

  // Student document upload
  const handleUploadStudentDocument = async (enrollmentId: string, type: string, file: File) => {
    try {
      const filePath = `${enrollmentId}/${type}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("student-documents")
        .getPublicUrl(filePath);
      
      const { error: dbError } = await supabase
        .from("student_documents")
        .insert({
          enrollment_id: enrollmentId,
          type,
          name: file.name,
          file_url: publicUrl
        });
      
      if (dbError) throw dbError;
      
      // Refresh student details
      if (selectedStudent) {
        handleViewStudent(selectedStudent.student);
      }
      
      toast.success("Документ загружен");
    } catch (error) {
      console.error("Error uploading student document:", error);
      toast.error("Ошибка загрузки документа");
    }
  };

  const handleDeleteStudentDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from("student_documents")
        .delete()
        .eq("id", docId);
      
      if (error) throw error;
      
      if (selectedStudent) {
        setSelectedStudent({
          ...selectedStudent,
          documents: selectedStudent.documents.filter(d => d.id !== docId)
        });
      }
      
      toast.success("Документ удалён");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Ошибка удаления");
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDocsByType = (type: string) => orgDocuments.filter(d => d.type === type);

  // Document section component
  const DocumentSection = ({ title, type, docs }: { title: string; type: string; docs: OrgDocument[] }) => (
    <div className="bg-secondary/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">{title}</h4>
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadDocument(type, file);
            }}
          />
          <div className="flex items-center gap-1 text-sm text-primary hover:underline">
            <Upload className="w-4 h-4" />
            Загрузить
          </div>
        </label>
      </div>
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет документов</p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-2 bg-background rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm truncate max-w-[200px]">{doc.name}</span>
              </div>
              <div className="flex gap-1">
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteDocument(doc.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Student document section
  const StudentDocSection = ({ title, type, docs, enrollmentId }: { 
    title: string; 
    type: string; 
    docs: StudentDocument[]; 
    enrollmentId: string;
  }) => (
    <div className="bg-secondary/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">{title}</h4>
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadStudentDocument(enrollmentId, type, file);
            }}
          />
          <div className="flex items-center gap-1 text-sm text-primary hover:underline">
            <Upload className="w-4 h-4" />
            Загрузить
          </div>
        </label>
      </div>
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Нет документов</p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-2 bg-background rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm truncate max-w-[200px]">{doc.name}</span>
              </div>
              <div className="flex gap-1">
                {doc.file_url && (
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteStudentDocument(doc.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <SigmaLogo size="md" />
          <div className="mt-4 p-3 bg-secondary rounded-xl">
            <div className="font-semibold text-sm">{organizationName}</div>
            <div className="text-xs text-muted-foreground">Организация</div>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab("students")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === "students" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Users className="w-5 h-5" />
              Ученики
            </button>
            <button 
              onClick={() => setActiveTab("courses")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === "courses" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Курсы
            </button>
            <button 
              onClick={() => setActiveTab("documents")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === "documents" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <FileText className="w-5 h-5" />
              Документы
            </button>
            <button 
              onClick={() => setActiveTab("stats")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === "stats" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Статистика
            </button>
            <button 
              onClick={() => setActiveTab("links")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === "links" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Link className="w-5 h-5" />
              Ссылки регистрации
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
              <Settings className="w-5 h-5" />
              Настройки
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">
                {activeTab === "students" && "Управление учениками"}
                {activeTab === "courses" && "Управление курсами"}
                {activeTab === "documents" && "Документы организации"}
                {activeTab === "stats" && "Статистика обучения"}
                {activeTab === "links" && "Ссылки для регистрации"}
              </h1>
              <p className="text-muted-foreground">{organizationName}</p>
            </div>
            <div className="flex gap-3">
              {activeTab === "links" && (
                <Dialog open={showCreateLinkDialog} onOpenChange={setShowCreateLinkDialog}>
                  <DialogTrigger asChild>
                    <Button className="btn-gradient rounded-xl gap-2">
                      <Plus className="w-4 h-4" />
                      Создать ссылку
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-display">Создать ссылку регистрации</DialogTitle>
                      <DialogDescription>
                        Ученики, зарегистрировавшиеся по этой ссылке, автоматически привяжутся к вашей организации
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Название (опционально)</Label>
                        <Input 
                          placeholder="Например: Набор июль 2026" 
                          className="rounded-xl"
                          value={newLinkName}
                          onChange={(e) => setNewLinkName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ИНН организации (опционально)</Label>
                        <Input 
                          placeholder="1234567890" 
                          className="rounded-xl"
                          value={newLinkInn}
                          onChange={(e) => setNewLinkInn(e.target.value)}
                        />
                      </div>
                      <Button 
                        className="w-full btn-gradient rounded-xl"
                        onClick={handleCreateRegistrationLink}
                        disabled={isCreatingLink}
                      >
                        {isCreatingLink ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Создание...
                          </>
                        ) : (
                          "Создать ссылку"
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {activeTab === "students" && (
                <>
                  <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="rounded-xl gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Импорт из Excel
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-display">Импорт учеников</DialogTitle>
                        <DialogDescription>
                          Загрузите файл Excel или Word с данными учеников
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <p className="font-medium mb-1">Перетащите файл сюда</p>
                          <p className="text-sm text-muted-foreground">
                            Поддерживаются форматы: .xlsx, .xls, .docx
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium mb-2">Формат файла:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>ФИО (обязательно)</li>
                            <li>Email (обязательно)</li>
                            <li>Наименование курса</li>
                          </ul>
                        </div>
                        <Button className="w-full btn-gradient rounded-xl">
                          Загрузить и создать аккаунты
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={showAddStudentDialog} onOpenChange={setShowAddStudentDialog}>
                    <DialogTrigger asChild>
                      <Button className="btn-gradient rounded-xl gap-2">
                        <Plus className="w-4 h-4" />
                        Добавить ученика
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-display">Добавить ученика</DialogTitle>
                        <DialogDescription>
                          Создайте аккаунт для нового ученика
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>ФИО</Label>
                          <Input 
                            placeholder="Иванов Иван Иванович" 
                            className="rounded-xl"
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input 
                            type="email" 
                            placeholder="ivanov@mail.ru" 
                            className="rounded-xl"
                            value={newStudentEmail}
                            onChange={(e) => setNewStudentEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Курс</Label>
                          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Выберите курс" />
                            </SelectTrigger>
                            <SelectContent>
                              {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.title}
                                </SelectItem>
                              ))}
                              {courses.length === 0 && (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                  Нет доступных курсов
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 rounded-xl"
                            onClick={() => handleCreateStudent(false)}
                            disabled={isCreatingStudent}
                          >
                            {isCreatingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
                          </Button>
                          <Button 
                            className="flex-1 btn-gradient rounded-xl"
                            onClick={() => handleCreateStudent(true)}
                            disabled={isCreatingStudent}
                          >
                            {isCreatingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить и отправить"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
              {activeTab === "courses" && (
                <>
                  <Button variant="outline" className="rounded-xl gap-2" onClick={() => navigate("/course-import")}>
                    <Upload className="w-4 h-4" />
                    Импорт курса
                  </Button>
                  <Button className="btn-gradient rounded-xl gap-2" onClick={() => navigate("/course-builder")}>
                    <Plus className="w-4 h-4" />
                    Создать курс
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">{stats.totalStudents}</div>
                  <div className="text-muted-foreground text-sm">Учеников</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">{stats.totalCourses}</div>
                  <div className="text-muted-foreground text-sm">Курсов</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sigma-green/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-sigma-green" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">{stats.completedCount}</div>
                  <div className="text-muted-foreground text-sm">Завершили</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sigma-orange/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-sigma-orange" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">{stats.averageProgress}%</div>
                  <div className="text-muted-foreground text-sm">Ср. прогресс</div>
                </div>
              </div>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === "students" && (
            <div className="bg-card rounded-2xl border border-border">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">Список учеников</h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 rounded-xl"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Ученик</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Курс</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Прогресс</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Последняя активность</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Статус</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.enrollment_id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">{student.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{student.course}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden w-24">
                              <div 
                                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                                style={{ width: `${student.progress}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{student.progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {new Date(student.lastActivity).toLocaleDateString('ru-RU')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            student.status === "completed" 
                              ? 'bg-sigma-green/10 text-sigma-green' 
                              : student.status === "active"
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {student.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                            {student.status === "completed" ? 'Завершён' : student.status === "active" ? 'В процессе' : 'Неактивен'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-lg"
                              onClick={() => handleViewStudent(student)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-lg text-destructive hover:text-destructive"
                              onClick={() => handleDeleteStudent(student.enrollment_id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          {isLoadingStudents ? (
                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                          ) : (
                            "Нет учеников"
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "courses" && (
            <div>
              {isLoadingCourses ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border border-border">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-display font-semibold text-lg mb-2">Нет курсов</h3>
                  <p className="text-muted-foreground mb-4">Создайте первый курс для обучения сотрудников</p>
                  <Button onClick={() => navigate("/course-builder")} className="btn-gradient rounded-xl gap-2">
                    <Plus className="w-4 h-4" />
                    Создать курс
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <div key={course.id} className="bg-card rounded-2xl border border-border overflow-hidden hover-lift group">
                      <div className="h-32 bg-gradient-to-br from-primary via-accent to-sigma-purple relative">
                        {!course.is_published && (
                          <span className="absolute top-3 right-3 px-2 py-1 bg-background/80 backdrop-blur-sm text-xs rounded-lg">
                            Черновик
                          </span>
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="font-display font-semibold text-lg mb-2">{course.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {course.studentsCount}
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {course.lessonsCount} уроков
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {course.duration}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full rounded-xl gap-2"
                          onClick={() => navigate(`/course-builder/${course.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                          Редактировать
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "documents" && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-display text-xl font-semibold mb-6">Документы организации</h2>
              {isLoadingDocs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6">
                  <DocumentSection title="Договоры" type="contract" docs={getDocsByType("contract")} />
                  <DocumentSection title="Счета" type="invoice" docs={getDocsByType("invoice")} />
                  <DocumentSection title="Акты" type="act" docs={getDocsByType("act")} />
                </div>
              )}
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-6">
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-display font-semibold text-lg mb-4">Статистика по тестам</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-secondary/50 rounded-xl">
                    <div className="text-3xl font-bold font-display text-sigma-green">87%</div>
                    <div className="text-muted-foreground text-sm">Средний балл</div>
                  </div>
                  <div className="text-center p-4 bg-secondary/50 rounded-xl">
                    <div className="text-3xl font-bold font-display text-primary">1,234</div>
                    <div className="text-muted-foreground text-sm">Тестов пройдено</div>
                  </div>
                  <div className="text-center p-4 bg-secondary/50 rounded-xl">
                    <div className="text-3xl font-bold font-display text-sigma-orange">15</div>
                    <div className="text-muted-foreground text-sm">Активных тестов</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-display font-semibold text-lg mb-4">Проблемные вопросы</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-xl border border-destructive/20">
                    <div>
                      <div className="font-medium">Вопрос о пожарной эвакуации</div>
                      <div className="text-sm text-muted-foreground">Курс: Пожарная безопасность</div>
                    </div>
                    <div className="text-right">
                      <div className="text-destructive font-bold">32%</div>
                      <div className="text-sm text-muted-foreground">правильных ответов</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-sigma-orange/5 rounded-xl border border-sigma-orange/20">
                    <div>
                      <div className="font-medium">Нормативы освещённости</div>
                      <div className="text-sm text-muted-foreground">Курс: Охрана труда</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sigma-orange font-bold">45%</div>
                      <div className="text-sm text-muted-foreground">правильных ответов</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "links" && (
            <div>
              {isLoadingLinks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : registrationLinks.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border border-border">
                  <Link className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-display font-semibold text-lg mb-2">Нет ссылок регистрации</h3>
                  <p className="text-muted-foreground mb-4">
                    Создайте ссылку, чтобы ученики могли зарегистрироваться и автоматически привязаться к вашей организации
                  </p>
                  <Button onClick={() => setShowCreateLinkDialog(true)} className="btn-gradient rounded-xl gap-2">
                    <Plus className="w-4 h-4" />
                    Создать ссылку
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrationLinks.map((link) => {
                    const isExpired = new Date(link.expires_at) < new Date();
                    const linkUrl = `${window.location.origin}/student-register?token=${link.token}`;
                    
                    return (
                      <div 
                        key={link.id} 
                        className={`bg-card rounded-2xl border p-6 ${
                          isExpired ? 'border-destructive/30 opacity-60' : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-display font-semibold text-lg">
                                {link.name || "Ссылка регистрации"}
                              </h3>
                              {isExpired && (
                                <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs rounded-full">
                                  Истекла
                                </span>
                              )}
                            </div>
                            {link.inn && (
                              <p className="text-sm text-muted-foreground mb-2">
                                ИНН: {link.inn}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                              <span>Использована: {link.used_count} раз</span>
                              <span>•</span>
                              <span>
                                Действует до: {new Date(link.expires_at).toLocaleDateString('ru-RU')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-xl">
                              <code className="flex-1 text-sm truncate">{linkUrl}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyLinkToClipboard(link.token)}
                                className="shrink-0"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive ml-4"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Student Details Dialog */}
      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {selectedStudent?.student.name || "Ученик"}
            </DialogTitle>
            <DialogDescription>
              {selectedStudent?.student.email} • {selectedStudent?.student.course}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingStudentDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedStudent && (
            <Tabs defaultValue="documents" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="documents">Документы</TabsTrigger>
                <TabsTrigger value="tests">Результаты тестов</TabsTrigger>
              </TabsList>
              
              <TabsContent value="documents" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <StudentDocSection 
                    title="Приказ о зачислении" 
                    type="enrollment_order" 
                    docs={selectedStudent.documents.filter(d => d.type === 'enrollment_order')}
                    enrollmentId={selectedStudent.student.enrollment_id}
                  />
                  <StudentDocSection 
                    title="Приказ об отчислении" 
                    type="expulsion_order" 
                    docs={selectedStudent.documents.filter(d => d.type === 'expulsion_order')}
                    enrollmentId={selectedStudent.student.enrollment_id}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="tests" className="space-y-4 mt-4">
                {selectedStudent.testAttempts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Нет результатов тестирования
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedStudent.testAttempts.map((attempt) => {
                      const questions = testQuestions[attempt.lesson_id] || [];
                      const percentage = attempt.max_score > 0 
                        ? Math.round((attempt.score / attempt.max_score) * 100) 
                        : 0;
                      
                      return (
                        <div key={attempt.id} className="bg-secondary/30 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{attempt.lesson_title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date(attempt.completed_at).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className={`text-lg font-bold ${
                              percentage >= 70 ? 'text-sigma-green' : 'text-destructive'
                            }`}>
                              {attempt.score}/{attempt.max_score} ({percentage}%)
                            </div>
                          </div>
                          
                          {questions.length > 0 && (
                            <div className="space-y-2 mt-4 border-t border-border pt-4">
                              <p className="text-sm font-medium text-muted-foreground mb-2">Ответы:</p>
                              {questions.map((q, idx) => {
                                const userAnswer = attempt.answers[q.id];
                                const isCorrect = userAnswer === q.correct_answer;
                                
                                return (
                                  <div 
                                    key={q.id} 
                                    className={`p-3 rounded-lg border ${
                                      isCorrect 
                                        ? 'bg-sigma-green/5 border-sigma-green/20' 
                                        : 'bg-destructive/5 border-destructive/20'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {isCorrect ? (
                                        <CheckCircle2 className="w-5 h-5 text-sigma-green shrink-0 mt-0.5" />
                                      ) : (
                                        <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                      )}
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{idx + 1}. {q.question}</p>
                                        <div className="mt-1 text-sm">
                                          <span className="text-muted-foreground">Ответ: </span>
                                          <span className={isCorrect ? 'text-sigma-green' : 'text-destructive'}>
                                            {q.options[userAnswer] || '—'}
                                          </span>
                                          {!isCorrect && (
                                            <>
                                              <span className="text-muted-foreground"> • Правильно: </span>
                                              <span className="text-sigma-green">{q.options[q.correct_answer]}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
