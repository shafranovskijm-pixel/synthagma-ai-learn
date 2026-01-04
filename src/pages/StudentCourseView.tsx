import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import {
  ArrowLeft,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Play,
  BookOpen,
  Clock,
  Menu,
  X,
  Volume2,
  Pause,
  MessageCircle,
  Send,
  Square,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BlockEditor, jsonToBlocks } from "@/components/course-builder/BlockEditor";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lesson {
  id: string;
  title: string;
  type: string;
  content: string | null;
  order_index: number;
  completed?: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
}

interface TestQuestion {
  id: string;
  question: string;
  options: string[];
  order_index: number;
}

export default function StudentCourseView() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Voice (browser SpeechSynthesis)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Test state
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<{score: number; max_score: number; passed: boolean} | null>(null);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);

  // AI Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: "user" | "assistant"; content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId || !user) {
        navigate("/student");
        return;
      }

      // Check enrollment
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .single();

      if (!enrollment) {
        toast.error("Вы не зачислены на этот курс");
        navigate("/student");
        return;
      }

      setEnrollmentId(enrollment.id);

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .eq("is_published", true)
        .single();

      if (courseError || !courseData) {
        toast.error("Курс не найден");
        navigate("/student");
        return;
      }

      setCourse(courseData);

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");

      // Fetch progress
      const { data: progressData } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id);

      const progressMap = new Map(progressData?.map(p => [p.lesson_id, p.completed]) || []);

      if (lessonsData && lessonsData.length > 0) {
        const lessonsWithProgress = lessonsData.map(l => ({
          ...l,
          completed: progressMap.get(l.id) || false
        }));
        setLessons(lessonsWithProgress);
        setSelectedLessonId(lessonsData[0].id);
      }

      setIsLoading(false);
    };

    fetchCourse();
  }, [courseId, user, navigate]);

  // Fetch test questions when lesson changes
  useEffect(() => {
    const fetchTestQuestions = async () => {
      if (!selectedLessonId) return;
      
      const selectedLesson = lessons.find(l => l.id === selectedLessonId);
      if (selectedLesson?.type !== "test") {
        setTestQuestions([]);
        setUserAnswers({});
        setTestResult(null);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("get_test_questions", {
          p_lesson_id: selectedLessonId
        });

        if (error) throw error;
        setTestQuestions((data as unknown as TestQuestion[]) || []);
        setUserAnswers({});
        setTestResult(null);
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };

    fetchTestQuestions();
  }, [selectedLessonId, lessons]);

  const markLessonComplete = async (lessonId: string) => {
    if (!user) return;

    try {
      // Upsert lesson progress
      const { error } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString()
        }, {
          onConflict: "user_id,lesson_id"
        });

      if (error) throw error;

      // Update local state
      setLessons(prev => prev.map(l => 
        l.id === lessonId ? { ...l, completed: true } : l
      ));

      // Update enrollment progress
      const completedCount = lessons.filter(l => l.completed || l.id === lessonId).length;
      const progress = Math.round((completedCount / lessons.length) * 100);
      
      // If all lessons completed, mark enrollment as completed
      const updateData: { progress: number; status?: string; completed_at?: string } = { progress };
      if (progress === 100) {
        updateData.status = "completed";
        updateData.completed_at = new Date().toISOString();
      }

      await supabase
        .from("enrollments")
        .update(updateData)
        .eq("id", enrollmentId);

    } catch (error) {
      console.error("Error marking lesson complete:", error);
    }
  };

  const handleSubmitTest = async () => {
    if (!selectedLessonId) return;

    setIsSubmittingTest(true);
    try {
      const { data, error } = await supabase.rpc("submit_test_answers", {
        p_lesson_id: selectedLessonId,
        p_user_answers: userAnswers
      });

      if (error) throw error;

      const result = data as { score: number; max_score: number; passed: boolean };
      setTestResult(result);
      
      if (result.passed) {
        await markLessonComplete(selectedLessonId);
        toast.success("Тест пройден!");
      } else {
        toast.error("Тест не пройден, попробуйте ещё раз");
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      toast.error("Ошибка отправки теста");
    } finally {
      setIsSubmittingTest(false);
    }
  };

  const goToNextLesson = async () => {
    const idx = lessons.findIndex(l => l.id === selectedLessonId);
    // Отмечаем текущий урок как пройденный (если это не тест)
    if (selectedLessonId && selectedLesson?.type !== "test") {
      await markLessonComplete(selectedLessonId);
    }
    if (idx < lessons.length - 1) {
      setSelectedLessonId(lessons[idx + 1].id);
    }
  };

  const handleCompleteLesson = async () => {
    if (!selectedLessonId || selectedLesson?.type === "test") return;
    await markLessonComplete(selectedLessonId);
    toast.success("Урок отмечен как пройденный");
  };

  const goToPrevLesson = () => {
    const idx = lessons.findIndex(l => l.id === selectedLessonId);
    if (idx > 0) {
      setSelectedLessonId(lessons[idx - 1].id);
    }
  };

  // Extract text from blocks for TTS
  const extractTextFromBlocks = (blocks: any[]): string => {
    return blocks
      .filter(b => 
        b.type === "text" || 
        b.type === "paragraph" || 
        b.type?.startsWith("heading")
      )
      .map(b => {
        // Strip HTML tags from content
        const raw = b.content || "";
        return raw.replace(/<[^>]+>/g, "");
      })
      .filter(t => t.trim())
      .join(". ");
  };

  const handlePlayAudio = () => {
    const textToSpeak = extractTextFromBlocks(blocks);
    if (!textToSpeak.trim()) {
      toast.error("Нет текста для озвучивания");
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Озвучка не поддерживается в этом браузере");
      return;
    }

    // Toggle pause/resume if already speaking
    if (isSpeaking) {
      if (isSpeechPaused) {
        window.speechSynthesis.resume();
        setIsSpeechPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsSpeechPaused(true);
      }
      return;
    }

    // Start speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "ru-RU";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      utteranceRef.current = null;
      toast.error("Ошибка озвучивания");
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    setIsSpeechPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  // Stop voice when lesson changes
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsSpeechPaused(false);
    utteranceRef.current = null;
  }, [selectedLessonId]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Stop speech completely
  const handleStopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsSpeechPaused(false);
    utteranceRef.current = null;
  };

  // Send message to AI
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isAiLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsAiLoading(true);

    try {
      const messagesToSend = [...chatMessages, { role: "user", content: userMessage }]
        .filter(m => m.role === "user" || m.role === "assistant");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gigachat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ messages: messagesToSend }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setChatMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch (error) {
      console.error("AI chat error:", error);
      setChatMessages(prev => [
        ...prev,
        { role: "assistant", content: "Извините, произошла ошибка. Попробуйте ещё раз." }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedLesson = lessons.find(l => l.id === selectedLessonId);
  const blocks = selectedLesson?.content ? jsonToBlocks(selectedLesson.content) : [];
  const currentIndex = lessons.findIndex(l => l.id === selectedLessonId);
  const overallProgress = lessons.length > 0 
    ? Math.round((lessons.filter(l => l.completed).length / lessons.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile Drawer / Desktop Hidden by Default */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-80 bg-card border-r border-border z-50 transform transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-display font-semibold">Содержание курса</h3>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-65px)]">
          <div className="p-4 space-y-1">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => {
                  setSelectedLessonId(lesson.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 p-3 rounded-xl text-left transition-all text-sm",
                  selectedLessonId === lesson.id 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-secondary"
                )}
              >
                <span className="w-6 flex-shrink-0">
                  {lesson.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-sigma-green" />
                  ) : (
                    <span className="font-medium">{index + 1}.</span>
                  )}
                </span>
                <span className="flex-1 truncate">{lesson.title}</span>
                <ChevronRight className={cn(
                  "w-4 h-4 transition-opacity flex-shrink-0",
                  selectedLessonId === lesson.id ? "opacity-100" : "opacity-0"
                )} />
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-xl"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-xl"
                onClick={() => navigate("/student")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">К курсам</span>
              </Button>
              <SigmaLogo size="sm" className="hidden sm:block" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground hidden sm:inline">Прогресс:</span>
              <Progress value={overallProgress} className="w-16 sm:w-24 h-2" />
              <span className="font-medium">{overallProgress}%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Course Title */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-display font-bold">{course?.title}</h1>
          {course?.description && (
            <p className="text-muted-foreground mt-2 text-sm">{course.description}</p>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {selectedLesson ? (
            <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-xl sm:text-2xl font-display font-bold">{selectedLesson.title}</h2>
                <div className="flex items-center gap-2">
                  {/* TTS Button for text lessons */}
                  {selectedLesson.type === "text" && blocks.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2"
                      onClick={handlePlayAudio}
                    >
                      {isSpeaking ? (
                        isSpeechPaused ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Pause className="w-4 h-4" />
                        )
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        {isSpeaking ? (isSpeechPaused ? "Продолжить" : "Пауза") : "Озвучить"}
                      </span>
                    </Button>
                  )}
                  {!selectedLesson.completed && selectedLesson.type !== "test" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2"
                      onClick={() => markLessonComplete(selectedLesson.id)}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Завершить урок</span>
                    </Button>
                  )}
                  {selectedLesson.completed && (
                    <span className="inline-flex items-center gap-2 text-sm text-sigma-green bg-sigma-green/10 px-3 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Пройден</span>
                    </span>
                  )}
                </div>
              </div>
              
              {selectedLesson.type === "text" && blocks.length > 0 ? (
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <BlockEditor blocks={blocks} onChange={() => {}} readOnly />
                </div>
              ) : selectedLesson.type === "video" && selectedLesson.content ? (
                <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                  <iframe
                    src={selectedLesson.content}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              ) : selectedLesson.type === "audio" && selectedLesson.content ? (
                <div className="bg-secondary/50 rounded-xl p-6">
                  <audio controls className="w-full">
                    <source src={selectedLesson.content} />
                  </audio>
                </div>
              ) : selectedLesson.type === "test" ? (
                <div className="space-y-6">
                  {testResult ? (
                    <div className={cn(
                      "p-6 rounded-xl text-center",
                      testResult.passed ? "bg-sigma-green/10" : "bg-destructive/10"
                    )}>
                      <div className={cn(
                        "text-4xl font-bold font-display mb-2",
                        testResult.passed ? "text-sigma-green" : "text-destructive"
                      )}>
                        {testResult.score}/{testResult.max_score}
                      </div>
                      <p className={testResult.passed ? "text-sigma-green" : "text-destructive"}>
                        {testResult.passed ? "Тест пройден!" : "Тест не пройден"}
                      </p>
                      {!testResult.passed && (
                        <Button
                          className="mt-4"
                          onClick={() => {
                            setTestResult(null);
                            setUserAnswers({});
                          }}
                        >
                          Попробовать ещё раз
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {testQuestions.map((q, qIdx) => (
                        <div key={q.id} className="bg-secondary/30 rounded-xl p-6">
                          <p className="font-medium mb-4">{qIdx + 1}. {q.question}</p>
                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                              const optionText = typeof opt === "object" && opt && "text" in opt 
                                ? (opt as { text: string }).text 
                                : String(opt ?? "");
                              return (
                                <label
                                  key={optIdx}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                                    userAnswers[q.id] === optIdx
                                      ? "bg-primary/10 border border-primary"
                                      : "bg-background hover:bg-secondary/50 border border-transparent"
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    checked={userAnswers[q.id] === optIdx}
                                    onChange={() => setUserAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                    className="w-4 h-4"
                                  />
                                  <span>{optionText}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <Button
                        className="w-full btn-gradient rounded-xl"
                        onClick={handleSubmitTest}
                        disabled={isSubmittingTest || Object.keys(userAnswers).length < testQuestions.length}
                      >
                        {isSubmittingTest ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Отправить ответы"
                        )}
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Контент отсутствует</p>
                </div>
              )}

                {/* Navigation */}
                <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-border">
                  {selectedLesson?.type !== "test" && (
                    <Button 
                      onClick={handleCompleteLesson}
                      className="w-full gap-2"
                      size="lg"
                      disabled={selectedLesson?.completed}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {selectedLesson?.completed ? "Урок пройден" : "Завершить урок"}
                    </Button>
                  )}
                  
                  <div className="flex justify-between">
                    {currentIndex > 0 ? (
                      <Button variant="outline" onClick={goToPrevLesson}>
                        ← Предыдущий урок
                      </Button>
                    ) : <div />}
                    
                    {currentIndex < lessons.length - 1 && (
                      <Button variant="ghost" onClick={goToNextLesson}>
                        Следующий урок →
                      </Button>
                    )}
                  </div>
                </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <p className="text-muted-foreground">Выберите урок из списка</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Buttons - Always visible */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        {/* Voice Controls */}
        {selectedLesson?.type === "text" && blocks.length > 0 && (
          <div className="flex gap-2">
            {isSpeaking && (
              <Button
                size="icon"
                variant="destructive"
                className="rounded-full w-12 h-12 shadow-lg"
                onClick={handleStopSpeech}
              >
                <Square className="w-5 h-5" />
              </Button>
            )}
            <Button
              size="icon"
              variant={isSpeaking ? "secondary" : "default"}
              className="rounded-full w-12 h-12 shadow-lg"
              onClick={handlePlayAudio}
            >
              {isSpeaking ? (
                isSpeechPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
          </div>
        )}

        {/* AI Chat Button */}
        <Button
          size="icon"
          className="rounded-full w-14 h-14 shadow-lg btn-gradient"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </Button>
      </div>

      {/* AI Chat Panel */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[60vh]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold">ИИ Консультант</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div 
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]"
          >
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Задайте вопрос по материалу курса</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-xl text-sm max-w-[85%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-secondary"
                  )}
                >
                  {msg.content}
                </div>
              ))
            )}
            {isAiLoading && (
              <div className="bg-secondary p-3 rounded-xl text-sm max-w-[85%] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Думаю...
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                placeholder="Введите вопрос..."
                className="flex-1 bg-secondary rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                disabled={isAiLoading}
              />
              <Button
                size="icon"
                className="rounded-xl"
                onClick={handleSendChatMessage}
                disabled={isAiLoading || !chatInput.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}