import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  FileText,
  Video,
  Image,
  FileQuestion,
  Trash2,
  Save,
  Eye,
  Sparkles,
  Upload,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileUp,
  Headphones
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BlockEditor, ContentBlock, htmlToBlocks, blocksToJson, jsonToBlocks } from "@/components/course-builder/BlockEditor";

type LessonType = "text" | "video" | "image" | "test" | "audio";

interface Lesson {
  id: string;
  type: LessonType;
  title: string;
  content: string;
  expanded: boolean;
  blocks?: ContentBlock[]; // Block-based content
}

const lessonIcons = {
  text: FileText,
  video: Video,
  image: Image,
  test: FileQuestion,
  audio: Headphones,
};

const lessonColors = {
  text: "text-primary bg-primary/10",
  video: "text-sigma-purple bg-sigma-purple/10",
  image: "text-sigma-cyan bg-sigma-cyan/10",
  test: "text-sigma-orange bg-sigma-orange/10",
  audio: "text-green-500 bg-green-500/10",
};

export default function CourseBuilder() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const { user } = useAuth();
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!courseId);
  const [isImporting, setIsImporting] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import course from file
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-course`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Ошибка импорта');
      }

      // Set course title from file
      if (data.courseTitle && !courseTitle) {
        setCourseTitle(data.courseTitle);
      }

      // Add imported lessons - convert HTML to blocks
      const importedLessons: Lesson[] = data.lessons.map((l: any) => {
        const blocks = htmlToBlocks(l.content || "");
        return {
          id: l.id,
          type: l.type as LessonType,
          title: l.title,
          content: blocksToJson(blocks), // Store as JSON
          blocks: blocks,
          expanded: false,
        };
      });

      setLessons(prev => [...prev, ...importedLessons]);
      toast.success(`Импортировано ${data.sectionsCount} разделов`);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Ошибка импорта файла');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Fetch organization ID and course data if editing
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Get organization ID from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
      }

      // If editing existing course, fetch course data
      if (courseId) {
        const { data: course } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (course) {
          setCourseTitle(course.title);
          setCourseDescription(course.description || "");
        }

        // Fetch lessons
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index");

        if (lessonsData) {
          setLessons(lessonsData.map(l => {
            const blocks = l.content ? jsonToBlocks(l.content) : [];
            return {
              id: l.id,
              type: l.type as LessonType,
              title: l.title,
              content: l.content || "",
              blocks: blocks.length > 0 ? blocks : undefined,
              expanded: false
            };
          }));
        }
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, courseId]);

  const addLesson = (type: LessonType) => {
    const typeNames: Record<LessonType, string> = {
      text: "урок",
      video: "видеоурок",
      image: "материал",
      test: "тест",
      audio: "аудиолекция"
    };
    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      type,
      title: `Новый ${typeNames[type]}`,
      content: "",
      expanded: true,
      blocks: type === "text" ? [] : undefined,
    };
    setLessons([...lessons, newLesson]);
  };

  const updateLesson = (id: string, updates: Partial<Lesson>) => {
    setLessons(lessons.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLesson = (id: string) => {
    setLessons(lessons.filter(l => l.id !== id));
  };

  const toggleLesson = (id: string) => {
    setLessons(lessons.map(l => l.id === id ? { ...l, expanded: !l.expanded } : l));
  };

  const saveCourse = async () => {
    if (!courseTitle.trim()) {
      toast.error("Введите название курса");
      return;
    }

    if (!organizationId) {
      toast.error("Не найдена организация");
      return;
    }

    setIsSaving(true);

    try {
      let savedCourseId = courseId;

      if (courseId) {
        // Update existing course
        const { error } = await supabase
          .from("courses")
          .update({
            title: courseTitle.trim(),
            description: courseDescription.trim() || null,
          })
          .eq("id", courseId);

        if (error) throw error;

        // Delete existing lessons and recreate
        await supabase.from("lessons").delete().eq("course_id", courseId);
      } else {
        // Create new course
        const { data: newCourse, error } = await supabase
          .from("courses")
          .insert({
            title: courseTitle.trim(),
            description: courseDescription.trim() || null,
            organization_id: organizationId,
          })
          .select()
          .single();

        if (error) throw error;
        savedCourseId = newCourse.id;
      }

      // Insert lessons
      if (lessons.length > 0 && savedCourseId) {
        const lessonsToInsert = lessons.map((lesson, index) => ({
          id: lesson.id,
          course_id: savedCourseId,
          title: lesson.title,
          type: lesson.type,
          content: lesson.content || null,
          order_index: index,
        }));

        const { error: lessonsError } = await supabase
          .from("lessons")
          .insert(lessonsToInsert);

        if (lessonsError) throw lessonsError;
      }

      toast.success(courseId ? "Курс обновлён" : "Курс создан");
      navigate("/organization");
    } catch (error: any) {
      console.error("Error saving course:", error);
      toast.error("Ошибка сохранения: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Save single lesson (creates course if needed)
  const saveSingleLesson = async (lesson: Lesson, orderIndex: number) => {
    if (!organizationId) {
      toast.error("Не найдена организация");
      return;
    }

    setIsSaving(true);

    try {
      let savedCourseId = courseId;

      // Create course if it doesn't exist
      if (!savedCourseId) {
        if (!courseTitle.trim()) {
          setCourseTitle(lesson.title || "Новый курс");
        }
        
        const { data: newCourse, error } = await supabase
          .from("courses")
          .insert({
            title: courseTitle.trim() || lesson.title || "Новый курс",
            description: courseDescription.trim() || null,
            organization_id: organizationId,
          })
          .select()
          .single();

        if (error) throw error;
        savedCourseId = newCourse.id;
        
        // Update URL without navigation to keep state
        window.history.replaceState(null, '', `/course-builder/${savedCourseId}`);
      }

      // Check if lesson exists in DB
      const { data: existingLesson } = await supabase
        .from("lessons")
        .select("id")
        .eq("id", lesson.id)
        .maybeSingle();

      if (existingLesson) {
        // Update existing lesson
        const { error } = await supabase
          .from("lessons")
          .update({
            title: lesson.title,
            type: lesson.type,
            content: lesson.content || null,
            order_index: orderIndex,
          })
          .eq("id", lesson.id);

        if (error) throw error;
        toast.success("Лекция обновлена");
      } else {
        // Insert new lesson
        const { error } = await supabase
          .from("lessons")
          .insert({
            id: lesson.id,
            course_id: savedCourseId,
            title: lesson.title,
            type: lesson.type,
            content: lesson.content || null,
            order_index: orderIndex,
          });

        if (error) throw error;
        toast.success("Лекция сохранена");
      }
    } catch (error: any) {
      console.error("Error saving lesson:", error);
      toast.error("Ошибка сохранения: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const generateWithAI = async () => {
    if (!courseTitle) return;
    setIsGenerating(true);
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const generatedLessons: Lesson[] = [
      { id: crypto.randomUUID(), type: "text", title: "Введение в курс", content: "Добро пожаловать в курс! В этом модуле вы познакомитесь с основными концепциями...", expanded: false },
      { id: crypto.randomUUID(), type: "video", title: "Основные понятия", content: "", expanded: false },
      { id: crypto.randomUUID(), type: "text", title: "Теоретические основы", content: "Рассмотрим ключевые теоретические аспекты темы...", expanded: false },
      { id: crypto.randomUUID(), type: "test", title: "Проверка знаний", content: "", expanded: false },
    ];
    
    setLessons(generatedLessons);
    setIsGenerating(false);
  };

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
                onClick={() => navigate("/organization")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
              <SigmaLogo size="sm" />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-xl gap-2">
                <Eye className="w-4 h-4" />
                Предпросмотр
              </Button>
              <Button 
                onClick={saveCourse}
                disabled={isSaving}
                className="btn-gradient rounded-xl gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? "Сохранение..." : "Сохранить курс"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course info */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-display text-xl font-semibold mb-4">Информация о курсе</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Название курса</Label>
                  <Input 
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Например: Основы безопасности на производстве"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea 
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="Краткое описание курса..."
                    className="rounded-xl min-h-[100px]"
                  />
                </div>
              </div>
            </div>

            {/* Import from file */}
            <div className="bg-gradient-to-r from-sigma-cyan/10 via-primary/10 to-sigma-purple/10 rounded-2xl border border-sigma-cyan/20 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sigma-cyan to-primary flex items-center justify-center flex-shrink-0">
                  <FileUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-lg mb-1">Импорт лекции из файла</h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Загрузите DOC, DOCX, HTML или TXT — стили и таблицы сохранятся
                  </p>
                  {lessons.length > 0 && (
                    <p className="text-xs text-primary mb-3">
                      ✓ Загружено {lessons.length} {lessons.length === 1 ? 'лекция' : lessons.length < 5 ? 'лекции' : 'лекций'} — можете добавить ещё
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".doc,.docx,.html,.htm,.txt"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="rounded-xl gap-2"
                    variant="outline"
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                    {isImporting ? "Импорт..." : lessons.length > 0 ? "Загрузить ещё файл" : "Загрузить файл"}
                  </Button>
                </div>
              </div>
            </div>

            {/* AI Generation */}
            <div className="bg-gradient-to-r from-sigma-purple/10 via-primary/10 to-accent/10 rounded-2xl border border-sigma-purple/20 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sigma-purple to-primary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-lg mb-1">ИИ-генератор курсов</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Введите название курса и ИИ создаст структуру с лекциями и тестами
                  </p>
                  <Button 
                    onClick={generateWithAI}
                    disabled={!courseTitle || isGenerating}
                    className="rounded-xl gap-2"
                    variant="outline"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isGenerating ? "Генерация..." : "Сгенерировать структуру"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Lessons */}
            <div className="bg-card rounded-2xl border border-border p-6">
              <h2 className="font-display text-xl font-semibold mb-4">Структура курса</h2>
              
              {lessons.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Добавьте первый урок или сгенерируйте структуру с помощью ИИ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.map((lesson, index) => {
                    const Icon = lessonIcons[lesson.type];
                    return (
                      <div key={lesson.id} className="border border-border rounded-xl overflow-hidden">
                        <div 
                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                          onClick={() => toggleLesson(lesson.id)}
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          <span className="text-sm font-medium text-muted-foreground w-8">{index + 1}.</span>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lessonColors[lesson.type]}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <Input 
                            value={lesson.title}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateLesson(lesson.id, { title: e.target.value });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-0"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveSingleLesson(lesson, index);
                            }}
                            className="text-primary hover:text-primary gap-1"
                          >
                            <Save className="w-3 h-3" />
                            <span className="hidden sm:inline">Сохранить</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLesson(lesson.id);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {lesson.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                        
                        {lesson.expanded && (
                          <div className="p-4 pt-0 border-t border-border">
                            {lesson.type === "text" && (
                              <div className="space-y-3">
                                <BlockEditor
                                  blocks={lesson.blocks || []}
                                  onChange={(blocks) => updateLesson(lesson.id, { 
                                    blocks,
                                    content: blocksToJson(blocks) 
                                  })}
                                />
                              </div>
                            )}
                            {lesson.type === "video" && (
                              <div className="space-y-3">
                                <Input
                                  value={lesson.content}
                                  onChange={(e) => updateLesson(lesson.id, { content: e.target.value })}
                                  placeholder="Вставьте ссылку на видео (YouTube, Vimeo и др.)"
                                  className="rounded-xl"
                                />
                                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">Или загрузите видеофайл</p>
                                </div>
                              </div>
                            )}
                            {lesson.type === "audio" && (
                              <div className="space-y-3">
                                <Input
                                  value={lesson.content}
                                  onChange={(e) => updateLesson(lesson.id, { content: e.target.value })}
                                  placeholder="Вставьте ссылку на аудио"
                                  className="rounded-xl"
                                />
                                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                                  <Headphones className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">Загрузите аудиофайл (MP3, WAV, OGG)</p>
                                  <input 
                                    type="file" 
                                    accept="audio/*" 
                                    className="mt-3"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        // For now just store file name, later can upload to storage
                                        updateLesson(lesson.id, { content: `[Audio: ${file.name}]` });
                                      }
                                    }}
                                  />
                                </div>
                                {lesson.content && lesson.content.startsWith('http') && (
                                  <audio controls className="w-full mt-2">
                                    <source src={lesson.content} />
                                  </audio>
                                )}
                              </div>
                            )}
                            {lesson.type === "image" && (
                              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                                <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Загрузите изображения</p>
                              </div>
                            )}
                            {lesson.type === "test" && (
                              <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">Добавьте вопросы для теста</p>
                                <Button variant="outline" size="sm" className="rounded-lg gap-2">
                                  <Plus className="w-4 h-4" />
                                  Добавить вопрос
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 sticky top-24">
              <h3 className="font-display font-semibold mb-4">Добавить элемент</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => addLesson("text")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Текст</span>
                </button>
                <button 
                  onClick={() => addLesson("video")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-sigma-purple hover:bg-sigma-purple/5 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-sigma-purple/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-sigma-purple" />
                  </div>
                  <span className="text-sm font-medium">Видео</span>
                </button>
                <button 
                  onClick={() => addLesson("audio")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-green-500 hover:bg-green-500/5 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-sm font-medium">Аудио</span>
                </button>
                <button 
                  onClick={() => addLesson("image")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-sigma-cyan hover:bg-sigma-cyan/5 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-sigma-cyan/10 flex items-center justify-center">
                    <Image className="w-5 h-5 text-sigma-cyan" />
                  </div>
                  <span className="text-sm font-medium">Изображение</span>
                </button>
                <button 
                  onClick={() => addLesson("test")}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-sigma-orange hover:bg-sigma-orange/5 transition-all col-span-2"
                >
                  <div className="w-10 h-10 rounded-lg bg-sigma-orange/10 flex items-center justify-center">
                    <FileQuestion className="w-5 h-5 text-sigma-orange" />
                  </div>
                  <span className="text-sm font-medium">Тест</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
