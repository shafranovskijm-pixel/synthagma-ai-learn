import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import {
  ArrowLeft,
  Loader2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  BookOpen,
  Menu,
  X,
  Edit,
  Eye,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BlockEditor, jsonToBlocks } from "@/components/course-builder/BlockEditor";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lesson {
  id: string;
  title: string;
  type: string;
  content: string | null;
  order_index: number;
}

interface TestQuestion {
  id: string;
  question: string;
  options: string[];
  order_index: number;
  correct_answer: number;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
}

export default function CoursePreview() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Test preview state
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, number>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        navigate("/organization");
        return;
      }

      // Параллельная загрузка курса и уроков
      const [courseResult, lessonsResult] = await Promise.all([
        supabase.from("courses").select("id, title, description").eq("id", courseId).single(),
        supabase.from("lessons").select("id, title, type, content, order_index").eq("course_id", courseId).order("order_index")
      ]);

      if (courseResult.error || !courseResult.data) {
        navigate("/organization");
        return;
      }

      setCourse(courseResult.data);

      if (lessonsResult.data && lessonsResult.data.length > 0) {
        setLessons(lessonsResult.data);
        setSelectedLessonId(lessonsResult.data[0].id);
      }

      setIsLoading(false);
    };

    fetchCourse();
  }, [courseId, navigate]);

  // Fetch test questions when lesson changes
  useEffect(() => {
    const fetchTestQuestions = async () => {
      if (!selectedLessonId) return;
      
      const selectedLesson = lessons.find(l => l.id === selectedLessonId);
      if (selectedLesson?.type !== "test") {
        setTestQuestions([]);
        setPreviewAnswers({});
        return;
      }

      try {
        const { data: questions } = await supabase
          .from("test_questions")
          .select("id, question, options, order_index, correct_answer")
          .eq("lesson_id", selectedLessonId)
          .order("order_index");

        setTestQuestions((questions || []).map(q => ({
          ...q,
          options: Array.isArray(q.options) 
            ? q.options.map((opt: unknown) => 
                typeof opt === 'object' && opt !== null && 'text' in opt 
                  ? (opt as { text: string }).text 
                  : String(opt)
              )
            : []
        })));
        setPreviewAnswers({});
        setTestSubmitted(false);
      } catch (error) {
        console.error("Error fetching questions:", error);
      }
    };

    fetchTestQuestions();
  }, [selectedLessonId, lessons]);

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

      {/* Sidebar - Mobile Drawer */}
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
                  <span className="font-medium">{index + 1}.</span>
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
                onClick={() => navigate(`/course-builder/${courseId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">К редактированию</span>
              </Button>
              <SigmaLogo size="sm" className="hidden sm:block" />
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Предпросмотр</span>
              </span>
              <Button 
                onClick={() => navigate(`/course-builder/${courseId}`)}
                variant="outline"
                className="rounded-xl gap-2"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Редактировать</span>
              </Button>
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
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg">
                  Урок {currentIndex + 1} из {lessons.length}
                </span>
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
                  {testQuestions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Вопросы ещё не добавлены</p>
                    </div>
                  ) : (
                    <>
                      {testSubmitted && (
                        <div className="bg-primary/10 border border-primary rounded-xl p-6 mb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-display font-semibold text-lg">Результат теста</h3>
                              <p className="text-muted-foreground text-sm mt-1">
                                Правильных ответов: {testQuestions.filter(q => previewAnswers[q.id] === q.correct_answer).length} из {testQuestions.length}
                              </p>
                            </div>
                            <div className="text-3xl font-bold text-primary">
                              {Math.round((testQuestions.filter(q => previewAnswers[q.id] === q.correct_answer).length / testQuestions.length) * 100)}%
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            className="mt-4 gap-2"
                            onClick={() => {
                              setPreviewAnswers({});
                              setTestSubmitted(false);
                            }}
                          >
                            <RotateCcw className="w-4 h-4" />
                            Пройти заново
                          </Button>
                        </div>
                      )}
                      {testQuestions.map((q, qIdx) => {
                        const isCorrect = previewAnswers[q.id] === q.correct_answer;
                        const isAnswered = previewAnswers[q.id] !== undefined;
                        return (
                          <div 
                            key={q.id} 
                            className={cn(
                              "rounded-xl p-6 transition-colors",
                              testSubmitted && isAnswered
                                ? isCorrect 
                                  ? "bg-green-500/10 border border-green-500/30"
                                  : "bg-red-500/10 border border-red-500/30"
                                : "bg-secondary/30"
                            )}
                          >
                            <div className="flex items-start gap-3 mb-4">
                              <p className="font-medium flex-1">{qIdx + 1}. {q.question}</p>
                              {testSubmitted && isAnswered && (
                                isCorrect 
                                  ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                  : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="space-y-2">
                              {q.options.map((opt, optIdx) => (
                                <label
                                  key={optIdx}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                    testSubmitted ? "cursor-default" : "cursor-pointer",
                                    testSubmitted && optIdx === q.correct_answer
                                      ? "bg-green-500/20 border border-green-500"
                                      : testSubmitted && previewAnswers[q.id] === optIdx && optIdx !== q.correct_answer
                                        ? "bg-red-500/20 border border-red-500"
                                        : previewAnswers[q.id] === optIdx
                                          ? "bg-primary/10 border border-primary"
                                          : "bg-background hover:bg-secondary/50 border border-transparent"
                                  )}
                                >
                                  <input
                                    type="radio"
                                    name={q.id}
                                    checked={previewAnswers[q.id] === optIdx}
                                    onChange={() => !testSubmitted && setPreviewAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                    disabled={testSubmitted}
                                    className="w-4 h-4"
                                  />
                                  <span>{opt}</span>
                                  {testSubmitted && optIdx === q.correct_answer && (
                                    <span className="ml-auto text-xs text-green-600 font-medium">Правильный ответ</span>
                                  )}
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {!testSubmitted && (
                        <div className="flex flex-col items-center gap-4">
                          <Button 
                            onClick={() => setTestSubmitted(true)}
                            disabled={Object.keys(previewAnswers).length < testQuestions.length}
                            className="w-full sm:w-auto"
                          >
                            Завершить тест
                          </Button>
                          <p className="text-sm text-muted-foreground">
                            {Object.keys(previewAnswers).length < testQuestions.length 
                              ? `Ответьте на все вопросы (${Object.keys(previewAnswers).length}/${testQuestions.length})`
                              : "Это предпросмотр теста. Ответы не сохраняются."
                            }
                          </p>
                        </div>
                      )}
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
                <Button 
                  onClick={goToNextLesson}
                  className="w-full gap-2"
                  size="lg"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {currentIndex < lessons.length - 1 ? "Завершить урок и продолжить" : "Завершить курс"}
                </Button>
                
                <div className="flex justify-between">
                  {currentIndex > 0 ? (
                    <Button variant="outline" onClick={goToPrevLesson}>
                      ← Предыдущий урок
                    </Button>
                  ) : <div />}
                  
                  {currentIndex < lessons.length - 1 && (
                    <Button variant="ghost" onClick={goToNextLesson}>
                      Пропустить →
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
    </div>
  );
}
