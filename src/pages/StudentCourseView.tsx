import { useState, useEffect } from "react";
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
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BlockEditor, jsonToBlocks } from "@/components/course-builder/BlockEditor";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

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
  
  // Test state
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<{score: number; max_score: number; passed: boolean} | null>(null);
  const [isSubmittingTest, setIsSubmittingTest] = useState(false);

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

      await supabase
        .from("enrollments")
        .update({ progress })
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

  const goToNextLesson = () => {
    const idx = lessons.findIndex(l => l.id === selectedLessonId);
    if (idx < lessons.length - 1) {
      setSelectedLessonId(lessons[idx + 1].id);
    }
  };

  const goToPrevLesson = () => {
    const idx = lessons.findIndex(l => l.id === selectedLessonId);
    if (idx > 0) {
      setSelectedLessonId(lessons[idx - 1].id);
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
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-xl"
                onClick={() => navigate("/student")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                К курсам
              </Button>
              <SigmaLogo size="sm" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Прогресс:</span>
                <Progress value={overallProgress} className="w-24 h-2" />
                <span className="font-medium">{overallProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Course Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">{course?.title}</h1>
          {course?.description && (
            <p className="text-muted-foreground mt-2">{course.description}</p>
          )}
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Lessons List */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border p-4 sticky top-24">
              <h3 className="font-display font-semibold mb-4">Содержание курса</h3>
              <div className="space-y-1">
                {lessons.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
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
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedLesson ? (
              <div className="bg-card rounded-2xl border border-border p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-display font-bold">{selectedLesson.title}</h2>
                  {!selectedLesson.completed && selectedLesson.type !== "test" && (
                    <Button
                      variant="outline"
                      className="rounded-xl gap-2"
                      onClick={() => markLessonComplete(selectedLesson.id)}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Завершить урок
                    </Button>
                  )}
                  {selectedLesson.completed && (
                    <span className="inline-flex items-center gap-2 text-sm text-sigma-green bg-sigma-green/10 px-3 py-1.5 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      Пройден
                    </span>
                  )}
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
                              {q.options.map((opt, optIdx) => (
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
                                  <span>{opt}</span>
                                </label>
                              ))}
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
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  {currentIndex > 0 ? (
                    <Button variant="outline" onClick={goToPrevLesson}>
                      ← Предыдущий урок
                    </Button>
                  ) : <div />}
                  
                  {currentIndex < lessons.length - 1 && (
                    <Button onClick={goToNextLesson}>
                      Следующий урок →
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-border p-12 text-center">
                <p className="text-muted-foreground">Выберите урок из списка</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}