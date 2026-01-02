import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import { ArrowLeft, Edit, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BlockEditor, jsonToBlocks } from "@/components/course-builder/BlockEditor";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  type: string;
  content: string | null;
  order_index: number;
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

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) {
        navigate("/organization");
        return;
      }

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (courseError || !courseData) {
        navigate("/organization");
        return;
      }

      setCourse(courseData);

      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");

      if (lessonsData && lessonsData.length > 0) {
        setLessons(lessonsData);
        setSelectedLessonId(lessonsData[0].id);
      }

      setIsLoading(false);
    };

    fetchCourse();
  }, [courseId, navigate]);

  const selectedLesson = lessons.find(l => l.id === selectedLessonId);
  const blocks = selectedLesson?.content ? jsonToBlocks(selectedLesson.content) : [];

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
                onClick={() => navigate(`/course-builder/${courseId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                К редактированию
              </Button>
              <SigmaLogo size="sm" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-lg">
                Режим предпросмотра
              </span>
              <Button 
                onClick={() => navigate(`/course-builder/${courseId}`)}
                variant="outline"
                className="rounded-xl gap-2"
              >
                <Edit className="w-4 h-4" />
                Редактировать
              </Button>
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
                    <span className="font-medium w-6">{index + 1}.</span>
                    <span className="flex-1 truncate">{lesson.title}</span>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-opacity",
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
                <h2 className="text-2xl font-display font-bold mb-6">{selectedLesson.title}</h2>
                
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
                  <audio controls className="w-full">
                    <source src={selectedLesson.content} />
                  </audio>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Контент отсутствует</p>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                  {lessons.findIndex(l => l.id === selectedLessonId) > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const idx = lessons.findIndex(l => l.id === selectedLessonId);
                        if (idx > 0) setSelectedLessonId(lessons[idx - 1].id);
                      }}
                    >
                      ← Предыдущий урок
                    </Button>
                  ) : <div />}
                  
                  {lessons.findIndex(l => l.id === selectedLessonId) < lessons.length - 1 && (
                    <Button
                      onClick={() => {
                        const idx = lessons.findIndex(l => l.id === selectedLessonId);
                        if (idx < lessons.length - 1) setSelectedLessonId(lessons[idx + 1].id);
                      }}
                    >
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
