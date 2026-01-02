import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronUp
} from "lucide-react";
import { Label } from "@/components/ui/label";

type LessonType = "text" | "video" | "image" | "test";

interface Lesson {
  id: string;
  type: LessonType;
  title: string;
  content: string;
  expanded: boolean;
}

const lessonIcons = {
  text: FileText,
  video: Video,
  image: Image,
  test: FileQuestion,
};

const lessonColors = {
  text: "text-primary bg-primary/10",
  video: "text-sigma-purple bg-sigma-purple/10",
  image: "text-sigma-cyan bg-sigma-cyan/10",
  test: "text-sigma-orange bg-sigma-orange/10",
};

export default function CourseBuilder() {
  const navigate = useNavigate();
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const addLesson = (type: LessonType) => {
    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      type,
      title: `Новый ${type === "text" ? "урок" : type === "video" ? "видеоурок" : type === "image" ? "материал" : "тест"}`,
      content: "",
      expanded: true,
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
              <Button className="btn-gradient rounded-xl gap-2">
                <Save className="w-4 h-4" />
                Сохранить курс
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
                              <Textarea 
                                value={lesson.content}
                                onChange={(e) => updateLesson(lesson.id, { content: e.target.value })}
                                placeholder="Введите текст урока..."
                                className="rounded-xl min-h-[150px]"
                              />
                            )}
                            {lesson.type === "video" && (
                              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Загрузите видео или вставьте ссылку</p>
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
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-sigma-orange hover:bg-sigma-orange/5 transition-all"
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
