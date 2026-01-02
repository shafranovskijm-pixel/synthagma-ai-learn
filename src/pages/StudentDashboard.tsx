import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import { 
  BookOpen, 
  MessageCircle, 
  Trophy, 
  Settings, 
  LogOut, 
  Play,
  Clock,
  CheckCircle2,
  Lock,
  Send,
  Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

const courses = [
  { 
    id: 1, 
    title: "Основы безопасности", 
    progress: 75,
    totalLessons: 12,
    completedLessons: 9,
    duration: "8 часов",
    status: "in_progress"
  },
  { 
    id: 2, 
    title: "Пожарная безопасность", 
    progress: 100,
    totalLessons: 8,
    completedLessons: 8,
    duration: "6 часов",
    status: "completed"
  },
  { 
    id: 3, 
    title: "Охрана труда", 
    progress: 0,
    totalLessons: 15,
    completedLessons: 0,
    duration: "10 часов",
    status: "locked"
  },
];

const aiMessages = [
  { role: "assistant", content: "Привет! Я ИИ-помощник платформы СИНТАГМА. Чем могу помочь с обучением?" },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"courses" | "chat">("courses");
  const [messages, setMessages] = useState(aiMessages);
  const [inputValue, setInputValue] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", content: inputValue }]);
    setInputValue("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Спасибо за ваш вопрос! Я анализирую материалы курса... Вот что я могу сказать: это важный аспект обучения, который требует внимательного изучения. Рекомендую обратить внимание на раздел 3 урока 5, там подробно разбирается эта тема. Есть ещё вопросы?" 
      }]);
    }, 1500);
  };

  const totalProgress = Math.round(
    courses.reduce((acc, c) => acc + c.progress, 0) / courses.length
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <SigmaLogo size="md" />
          <div className="mt-4 p-3 bg-secondary rounded-xl">
            <div className="font-semibold text-sm">Петров Петр</div>
            <div className="text-xs text-muted-foreground">УЦ СТАТУС</div>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <button 
              onClick={() => setActiveTab("courses")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === "courses" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Мои курсы
            </button>
            <button 
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === "chat" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              ИИ-помощник
              <span className="ml-auto w-2 h-2 rounded-full bg-sigma-green animate-pulse" />
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
              <Trophy className="w-5 h-5" />
              Достижения
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
        {activeTab === "courses" && (
          <>
            {/* Header */}
            <header className="bg-card border-b border-border px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-bold">Добро пожаловать, Петр!</h1>
                  <p className="text-muted-foreground">Продолжайте обучение</p>
                </div>
              </div>
            </header>

            <div className="p-8">
              {/* Progress overview */}
              <div className="bg-gradient-to-r from-primary via-accent to-sigma-purple rounded-2xl p-6 mb-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-semibold mb-2">Общий прогресс</h2>
                    <p className="text-white/80 mb-4">Вы прошли {totalProgress}% всех курсов</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        <span>12ч 45м обучения</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>17 уроков пройдено</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="12"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="white"
                        strokeWidth="12"
                        strokeDasharray={`${totalProgress * 3.52} 352`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold font-display">{totalProgress}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Courses */}
              <h2 className="font-display text-xl font-semibold mb-4">Мои курсы</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div 
                    key={course.id} 
                    className={`bg-card rounded-2xl border border-border overflow-hidden hover-lift group cursor-pointer ${
                      course.status === "locked" ? "opacity-60" : ""
                    }`}
                  >
                    <div className={`h-32 relative ${
                      course.status === "completed" 
                        ? "bg-gradient-to-br from-sigma-green to-accent"
                        : course.status === "locked"
                        ? "bg-gradient-to-br from-muted to-secondary"
                        : "bg-gradient-to-br from-primary via-accent to-sigma-purple"
                    }`}>
                      {course.status === "locked" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock className="w-10 h-10 text-white/50" />
                        </div>
                      )}
                      {course.status === "completed" && (
                        <div className="absolute top-4 right-4 bg-white/20 rounded-full p-2">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="font-display font-semibold text-lg mb-2">{course.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          {course.completedLessons}/{course.totalLessons}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {course.duration}
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Прогресс</span>
                          <span className="font-medium">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>
                      <Button 
                        className={`w-full rounded-xl gap-2 ${
                          course.status === "locked" 
                            ? ""
                            : course.status === "completed"
                            ? ""
                            : "btn-gradient"
                        }`}
                        variant={course.status === "locked" || course.status === "completed" ? "outline" : "default"}
                        disabled={course.status === "locked"}
                      >
                        {course.status === "locked" && <Lock className="w-4 h-4" />}
                        {course.status === "completed" && <CheckCircle2 className="w-4 h-4" />}
                        {course.status === "in_progress" && <Play className="w-4 h-4" />}
                        {course.status === "locked" 
                          ? "Недоступен" 
                          : course.status === "completed" 
                          ? "Пройден"
                          : "Продолжить"
                        }
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === "chat" && (
          <div className="h-screen flex flex-col">
            {/* Chat header */}
            <header className="bg-card border-b border-border px-8 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-display font-bold">ИИ-помощник</h1>
                  <p className="text-sm text-sigma-green flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sigma-green animate-pulse" />
                    Онлайн
                  </p>
                </div>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-md"
                      : "bg-secondary rounded-tl-md"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-6 bg-card border-t border-border">
              <div className="flex gap-3 max-w-4xl mx-auto">
                <Input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Задайте вопрос по материалам курса..." 
                  className="flex-1 h-12 rounded-xl"
                />
                <Button 
                  onClick={handleSendMessage}
                  className="btn-gradient rounded-xl px-6 h-12"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-3">
                ИИ-помощник поможет разобраться в материалах курса и ответит на ваши вопросы
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
