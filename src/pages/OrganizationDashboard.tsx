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
  MoreHorizontal,
  Eye,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit
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

const students = [
  { 
    id: 1, 
    name: "Петров Петр Петрович", 
    email: "petrov@mail.ru",
    course: "Основы безопасности",
    progress: 75,
    lastActivity: "2024-03-15",
    status: "active"
  },
  { 
    id: 2, 
    name: "Иванова Мария Сергеевна", 
    email: "ivanova@mail.ru",
    course: "Пожарная безопасность",
    progress: 100,
    lastActivity: "2024-03-14",
    status: "completed"
  },
  { 
    id: 3, 
    name: "Сидоров Алексей Викторович", 
    email: "sidorov@mail.ru",
    course: "Охрана труда",
    progress: 45,
    lastActivity: "2024-03-13",
    status: "active"
  },
  { 
    id: 4, 
    name: "Козлова Анна Игоревна", 
    email: "kozlova@mail.ru",
    course: "Первая помощь",
    progress: 20,
    lastActivity: "2024-03-12",
    status: "inactive"
  },
];

export default function OrganizationDashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"students" | "courses" | "stats">("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  
  // Statistics state
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    completedCount: 0,
    averageProgress: 0
  });

  // Fetch courses and stats from database
  useEffect(() => {
    const fetchCoursesAndStats = async () => {
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

        const organizationId = profile.organization_id;

        // Fetch courses for organization
        const { data: coursesData, error } = await supabase
          .from("courses")
          .select(`
            *,
            lessons(count)
          `)
          .eq("organization_id", organizationId)
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
        console.error("Error fetching courses:", error);
        toast.error("Ошибка загрузки курсов");
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchCoursesAndStats();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <SigmaLogo size="md" />
          <div className="mt-4 p-3 bg-secondary rounded-xl">
            <div className="font-semibold text-sm">УЦ СТАТУС</div>
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
                {activeTab === "stats" && "Статистика обучения"}
              </h1>
              <p className="text-muted-foreground">Учебный центр СТАТУС</p>
            </div>
            <div className="flex gap-3">
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
                        <Button className="w-full btn-gradient rounded-xl">
                          Создать и отправить доступ
                        </Button>
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
                      <tr key={student.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
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
                            <Button variant="ghost" size="sm" className="rounded-lg">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="rounded-lg">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
        </div>
      </main>
    </div>
  );
}
