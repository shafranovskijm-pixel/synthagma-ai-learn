import { useState, useCallback } from "react";
import { 
  Plus, 
  GripVertical, 
  Trash2,
  Type,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  AlertCircle,
  Lightbulb,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type BlockType = 
  | "paragraph" 
  | "heading1" 
  | "heading2" 
  | "bulletList" 
  | "numberedList"
  | "quote"
  | "callout-info"
  | "callout-warning"
  | "callout-tip"
  | "accordion"
  | "quiz"
  | "term"
  | "image"
  | "video"
  | "table";

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  // For accordion
  accordionTitle?: string;
  accordionOpen?: boolean;
  // For quiz
  quizQuestion?: string;
  quizOptions?: QuizOption[];
  quizExplanation?: string;
  // For term
  termWord?: string;
  termDefinition?: string;
  // For image
  imageSrc?: string;
  imageAlt?: string;
  // For video
  videoUrl?: string;
  // For table (raw HTML)
  tableHtml?: string;
}

interface BlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  readOnly?: boolean;
}

const blockTypeConfig: Record<BlockType, { icon: any; label: string; color: string }> = {
  paragraph: { icon: Type, label: "Параграф", color: "text-foreground" },
  heading1: { icon: Heading1, label: "Заголовок 1", color: "text-foreground" },
  heading2: { icon: Heading2, label: "Заголовок 2", color: "text-foreground" },
  bulletList: { icon: List, label: "Маркированный список", color: "text-foreground" },
  numberedList: { icon: ListOrdered, label: "Нумерованный список", color: "text-foreground" },
  quote: { icon: Quote, label: "Цитата", color: "text-muted-foreground" },
  "callout-info": { icon: AlertCircle, label: "Информация", color: "text-blue-500" },
  "callout-warning": { icon: AlertCircle, label: "Предупреждение", color: "text-amber-500" },
  "callout-tip": { icon: Lightbulb, label: "Совет", color: "text-green-500" },
  accordion: { icon: ChevronDown, label: "Сворачиваемая секция", color: "text-purple-500" },
  quiz: { icon: HelpCircle, label: "Мини-квиз", color: "text-primary" },
  term: { icon: BookOpen, label: "Термин", color: "text-cyan-500" },
  image: { icon: ImageIcon, label: "Изображение", color: "text-green-500" },
  video: { icon: Video, label: "Видео", color: "text-red-500" },
  table: { icon: Type, label: "Таблица", color: "text-blue-500" },
};

const createBlock = (type: BlockType): ContentBlock => ({
  id: crypto.randomUUID(),
  type,
  content: "",
  ...(type === "accordion" && { accordionTitle: "Заголовок секции", accordionOpen: true }),
  ...(type === "quiz" && { 
    quizQuestion: "",
    quizOptions: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
    quizExplanation: ""
  }),
  ...(type === "term" && { termWord: "", termDefinition: "" }),
  ...(type === "image" && { imageSrc: "", imageAlt: "" }),
  ...(type === "video" && { videoUrl: "" }),
  ...(type === "table" && { tableHtml: "" }),
});

export function BlockEditor({ blocks, onChange, readOnly = false }: BlockEditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  const addBlock = useCallback((type: BlockType, afterIndex?: number) => {
    const newBlock = createBlock(type);
    const newBlocks = [...blocks];
    if (afterIndex !== undefined) {
      newBlocks.splice(afterIndex + 1, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    onChange(newBlocks);
    setFocusedBlockId(newBlock.id);
  }, [blocks, onChange]);

  const updateBlock = useCallback((id: string, updates: Partial<ContentBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  }, [blocks, onChange]);

  const deleteBlock = useCallback((id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  }, [blocks, onChange]);

  const moveBlock = useCallback((fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, removed);
    onChange(newBlocks);
  }, [blocks, onChange]);

  if (readOnly) {
    return <BlockRenderer blocks={blocks} />;
  }

  return (
    <div className="space-y-2">
      {blocks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-3">Начните добавлять контент</p>
          <AddBlockButton onAdd={(type) => addBlock(type)} />
        </div>
      )}

      {blocks.map((block, index) => (
        <BlockItem
          key={block.id}
          block={block}
          index={index}
          isFocused={focusedBlockId === block.id}
          onFocus={() => setFocusedBlockId(block.id)}
          onUpdate={(updates) => updateBlock(block.id, updates)}
          onDelete={() => deleteBlock(block.id)}
          onAddAfter={(type) => addBlock(type, index)}
          onMoveUp={index > 0 ? () => moveBlock(index, index - 1) : undefined}
          onMoveDown={index < blocks.length - 1 ? () => moveBlock(index, index + 1) : undefined}
        />
      ))}

      {blocks.length > 0 && (
        <div className="flex justify-center pt-2">
          <AddBlockButton onAdd={(type) => addBlock(type)} />
        </div>
      )}
    </div>
  );
}

// Add Block Button
function AddBlockButton({ onAdd }: { onAdd: (type: BlockType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-lg gap-2">
          <Plus className="w-4 h-4" />
          Добавить блок
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuItem onClick={() => onAdd("paragraph")}>
          <Type className="w-4 h-4 mr-2" />
          Параграф
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("heading1")}>
          <Heading1 className="w-4 h-4 mr-2" />
          Заголовок 1
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("heading2")}>
          <Heading2 className="w-4 h-4 mr-2" />
          Заголовок 2
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAdd("bulletList")}>
          <List className="w-4 h-4 mr-2" />
          Маркированный список
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("numberedList")}>
          <ListOrdered className="w-4 h-4 mr-2" />
          Нумерованный список
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("quote")}>
          <Quote className="w-4 h-4 mr-2" />
          Цитата
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAdd("callout-info")}>
          <AlertCircle className="w-4 h-4 mr-2 text-blue-500" />
          Информация
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("callout-warning")}>
          <AlertCircle className="w-4 h-4 mr-2 text-amber-500" />
          Предупреждение
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("callout-tip")}>
          <Lightbulb className="w-4 h-4 mr-2 text-green-500" />
          Совет
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAdd("accordion")}>
          <ChevronDown className="w-4 h-4 mr-2 text-purple-500" />
          Сворачиваемая секция
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("quiz")}>
          <HelpCircle className="w-4 h-4 mr-2 text-primary" />
          Мини-квиз
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("term")}>
          <BookOpen className="w-4 h-4 mr-2 text-cyan-500" />
          Термин с пояснением
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAdd("image")}>
          <ImageIcon className="w-4 h-4 mr-2 text-green-500" />
          Изображение
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("video")}>
          <Video className="w-4 h-4 mr-2 text-red-500" />
          Видео
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Block Item Component
interface BlockItemProps {
  block: ContentBlock;
  index: number;
  isFocused: boolean;
  onFocus: () => void;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
  onAddAfter: (type: BlockType) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function BlockItem({ 
  block, 
  index, 
  isFocused, 
  onFocus, 
  onUpdate, 
  onDelete,
  onAddAfter,
  onMoveUp,
  onMoveDown
}: BlockItemProps) {
  const config = blockTypeConfig[block.type];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "group relative flex gap-2 rounded-lg transition-all",
        isFocused && "bg-secondary/30"
      )}
      onClick={onFocus}
    >
      {/* Drag handle & actions */}
      <div className="flex flex-col items-center gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="cursor-grab text-muted-foreground hover:text-foreground">
          <GripVertical className="w-4 h-4" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {Object.entries(blockTypeConfig).map(([type, cfg]) => (
              <DropdownMenuItem key={type} onClick={() => onAddAfter(type as BlockType)}>
                <cfg.icon className={cn("w-4 h-4 mr-2", cfg.color)} />
                {cfg.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {/* Block content */}
      <div className="flex-1 min-w-0">
        <BlockContent block={block} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

// Block Content Component
function BlockContent({ block, onUpdate }: { block: ContentBlock; onUpdate: (updates: Partial<ContentBlock>) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  
  // Helper to strip HTML for plain text editing
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };
  
  switch (block.type) {
    case "paragraph":
      return (
        <div 
          className="py-2 min-h-[40px] cursor-text"
          onClick={() => setIsEditing(true)}
        >
          {isEditing ? (
            <Textarea
              autoFocus
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              onBlur={() => setIsEditing(false)}
              placeholder="Введите текст..."
              className="min-h-[60px] border-0 bg-transparent resize-none focus-visible:ring-0 px-0"
            />
          ) : (
            <div 
              className="prose prose-sm dark:prose-invert max-w-none [&_strong]:font-bold [&_em]:italic"
              dangerouslySetInnerHTML={{ __html: block.content || '<span class="text-muted-foreground">Введите текст...</span>' }}
            />
          )}
        </div>
      );

    case "heading1":
      return (
        <Input
          value={stripHtml(block.content)}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Заголовок 1"
          className="text-2xl font-bold border-0 bg-transparent focus-visible:ring-0 px-0 h-auto py-2"
        />
      );

    case "heading2":
      return (
        <Input
          value={stripHtml(block.content)}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder="Заголовок 2"
          className="text-xl font-semibold border-0 bg-transparent focus-visible:ring-0 px-0 h-auto py-2"
        />
      );

    case "bulletList":
    case "numberedList":
      return (
        <div className="space-y-1 py-2">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {block.type === "bulletList" ? (
              <ul className="list-disc pl-4">
                {(block.content || "").split("\n").filter(Boolean).map((item, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            ) : (
              <ol className="list-decimal pl-4">
                {(block.content || "").split("\n").filter(Boolean).map((item, i) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ol>
            )}
          </div>
          <Textarea
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Элемент списка (каждая строка — отдельный пункт)"
            className="min-h-[60px] border-0 bg-secondary/30 resize-none focus-visible:ring-1 rounded-lg text-sm"
          />
        </div>
      );

    case "quote":
      return (
        <div className="border-l-4 border-muted-foreground/30 pl-4 py-2">
          <Textarea
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Введите цитату..."
            className="min-h-[60px] border-0 bg-transparent resize-none focus-visible:ring-0 px-0 italic text-muted-foreground"
          />
        </div>
      );

    case "callout-info":
    case "callout-warning":
    case "callout-tip":
      return <CalloutBlock block={block} onUpdate={onUpdate} />;

    case "accordion":
      return <AccordionBlock block={block} onUpdate={onUpdate} />;

    case "quiz":
      return <QuizBlock block={block} onUpdate={onUpdate} />;

    case "term":
      return <TermBlock block={block} onUpdate={onUpdate} />;

    case "image":
      return <ImageBlock block={block} onUpdate={onUpdate} />;

    case "video":
      return <VideoBlock block={block} onUpdate={onUpdate} />;

    case "table":
      return <TableBlock block={block} onUpdate={onUpdate} />;

    default:
      return null;
  }
}

// Image Block with URL and file upload
function ImageBlock({ block, onUpdate }: { block: ContentBlock; onUpdate: (updates: Partial<ContentBlock>) => void }) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate({ imageSrc: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="py-2">
      {block.imageSrc ? (
        <div className="space-y-2">
          <div className="relative group/img">
            <img 
              src={block.imageSrc} 
              alt={block.imageAlt || ""} 
              className="rounded-lg max-w-full h-auto max-h-[400px] object-contain"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity"
              onClick={() => onUpdate({ imageSrc: "", imageAlt: "" })}
            >
              Удалить
            </Button>
          </div>
          <Input
            value={block.imageAlt || ""}
            onChange={(e) => onUpdate({ imageAlt: e.target.value })}
            placeholder="Подпись к изображению..."
            className="text-sm border-0 bg-secondary/30 focus-visible:ring-1 rounded-lg"
          />
        </div>
      ) : (
        <div className="bg-muted rounded-xl p-6 space-y-4">
          <div className="text-center">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">Добавьте изображение</p>
          </div>
          
          {/* URL input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">По ссылке</label>
            <Input
              value={block.imageSrc || ""}
              onChange={(e) => onUpdate({ imageSrc: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="text-sm"
            />
          </div>
          
          {/* File upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Или загрузите файл</label>
            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Выберите файл</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// Video Block (URL only)
function VideoBlock({ block, onUpdate }: { block: ContentBlock; onUpdate: (updates: Partial<ContentBlock>) => void }) {
  // Extract video embed URL
  const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    
    // Rutube
    const rutubeMatch = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)/);
    if (rutubeMatch) return `https://rutube.ru/play/embed/${rutubeMatch[1]}`;
    
    // VK Video
    const vkMatch = url.match(/vk\.com\/video(-?\d+)_(\d+)/);
    if (vkMatch) return `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}`;
    
    return null;
  };

  const embedUrl = getEmbedUrl(block.videoUrl || "");

  return (
    <div className="py-2">
      {embedUrl ? (
        <div className="space-y-2">
          <div className="relative group/video aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover/video:opacity-100 transition-opacity"
              onClick={() => onUpdate({ videoUrl: "" })}
            >
              Удалить
            </Button>
          </div>
          <Input
            value={block.videoUrl || ""}
            onChange={(e) => onUpdate({ videoUrl: e.target.value })}
            placeholder="Ссылка на видео..."
            className="text-sm border-0 bg-secondary/30 focus-visible:ring-1 rounded-lg"
          />
        </div>
      ) : (
        <div className="bg-muted rounded-xl p-6 text-center">
          <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">Добавьте видео по ссылке</p>
          <Input
            value={block.videoUrl || ""}
            onChange={(e) => onUpdate({ videoUrl: e.target.value })}
            placeholder="YouTube, Vimeo, Rutube или VK Video..."
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Поддерживаются: YouTube, Vimeo, Rutube, VK Video
          </p>
        </div>
      )}
    </div>
  );
}

// Table Block
function TableBlock({ block, onUpdate }: { block: ContentBlock; onUpdate: (updates: Partial<ContentBlock>) => void }) {
  return (
    <div className="py-2 overflow-x-auto">
      {block.tableHtml ? (
        <div 
          className="min-w-full [&_table]:min-w-full [&_table]:text-sm [&_table]:border [&_table]:border-border [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:font-semibold"
          dangerouslySetInnerHTML={{ __html: block.tableHtml }}
        />
      ) : (
        <div className="bg-muted rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">Таблица не загружена</p>
        </div>
      )}
    </div>
  );
}

// Callout Block
function CalloutBlock({ block, onUpdate }: { block: ContentBlock; onUpdate: (updates: Partial<ContentBlock>) => void }) {
  const styles = {
    "callout-info": { bg: "bg-blue-500/10", border: "border-blue-500/30", icon: AlertCircle, iconColor: "text-blue-500" },
    "callout-warning": { bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertCircle, iconColor: "text-amber-500" },
    "callout-tip": { bg: "bg-green-500/10", border: "border-green-500/30", icon: Lightbulb, iconColor: "text-green-500" },
  };
  const style = styles[block.type as keyof typeof styles];
  const Icon = style.icon;

  return (
    <div className={cn("rounded-xl p-4 border", style.bg, style.border)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", style.iconColor)} />
        <Textarea
          value={block.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder={block.type === "callout-info" ? "Информация..." : block.type === "callout-warning" ? "Предупреждение..." : "Полезный совет..."}
          className="min-h-[40px] border-0 bg-transparent resize-none focus-visible:ring-0 px-0 flex-1"
        />
      </div>
    </div>
  );
}

// Accordion Block
function AccordionBlock({ block, onUpdate }: { block: ContentBlock; onUpdate: (updates: Partial<ContentBlock>) => void }) {
  const isOpen = block.accordionOpen ?? true;

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden">
      <div 
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-purple-500/10"
        onClick={() => onUpdate({ accordionOpen: !isOpen })}
      >
        {isOpen ? <ChevronDown className="w-4 h-4 text-purple-500" /> : <ChevronRight className="w-4 h-4 text-purple-500" />}
        <Input
          value={block.accordionTitle || ""}
          onChange={(e) => { e.stopPropagation(); onUpdate({ accordionTitle: e.target.value }); }}
          onClick={(e) => e.stopPropagation()}
          placeholder="Заголовок секции"
          className="border-0 bg-transparent focus-visible:ring-0 px-0 font-medium"
        />
      </div>
      {isOpen && (
        <div className="p-3 pt-0 border-t border-purple-500/20">
          <Textarea
            value={block.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Скрытое содержимое..."
            className="min-h-[80px] border-0 bg-transparent resize-none focus-visible:ring-0 px-0"
          />
        </div>
      )}
    </div>
  );
}

// Quiz Block
function QuizBlock({ block, onUpdate }: { block: ContentBlock; onUpdate: (updates: Partial<ContentBlock>) => void }) {
  const options = block.quizOptions || [{ text: "", isCorrect: true }, { text: "", isCorrect: false }];

  const updateOption = (index: number, updates: Partial<QuizOption>) => {
    const newOptions = options.map((opt, i) => 
      i === index ? { ...opt, ...updates } : updates.isCorrect ? { ...opt, isCorrect: false } : opt
    );
    onUpdate({ quizOptions: newOptions });
  };

  const addOption = () => {
    onUpdate({ quizOptions: [...options, { text: "", isCorrect: false }] });
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      onUpdate({ quizOptions: options.filter((_, i) => i !== index) });
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-primary">
        <HelpCircle className="w-5 h-5" />
        <span className="font-medium">Мини-квиз</span>
      </div>
      <Input
        value={block.quizQuestion || ""}
        onChange={(e) => onUpdate({ quizQuestion: e.target.value })}
        placeholder="Введите вопрос..."
        className="font-medium"
      />
      <div className="space-y-2">
        {options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              checked={option.isCorrect}
              onChange={() => updateOption(i, { isCorrect: true })}
              className="w-4 h-4 text-primary"
            />
            <Input
              value={option.text}
              onChange={(e) => updateOption(i, { text: e.target.value })}
              placeholder={`Вариант ${i + 1}`}
              className="flex-1"
            />
            {options.length > 2 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive"
                onClick={() => removeOption(i)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addOption} className="gap-2">
        <Plus className="w-4 h-4" />
        Добавить вариант
      </Button>
      <Textarea
        value={block.quizExplanation || ""}
        onChange={(e) => onUpdate({ quizExplanation: e.target.value })}
        placeholder="Пояснение к правильному ответу (опционально)"
        className="min-h-[40px] text-sm bg-white/50 dark:bg-black/20"
      />
    </div>
  );
}

// Term Block
function TermBlock({ block, onUpdate }: { block: ContentBlock; onUpdate: (updates: Partial<ContentBlock>) => void }) {
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-cyan-500">
        <BookOpen className="w-5 h-5" />
        <span className="font-medium">Термин</span>
      </div>
      <Input
        value={block.termWord || ""}
        onChange={(e) => onUpdate({ termWord: e.target.value })}
        placeholder="Термин"
        className="font-semibold"
      />
      <Textarea
        value={block.termDefinition || ""}
        onChange={(e) => onUpdate({ termDefinition: e.target.value })}
        placeholder="Определение термина..."
        className="min-h-[60px]"
      />
    </div>
  );
}

// Block Renderer for read-only view
export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  const handleQuizAnswer = (blockId: string, optionIndex: number) => {
    if (!quizSubmitted[blockId]) {
      setQuizAnswers(prev => ({ ...prev, [blockId]: optionIndex }));
    }
  };

  const submitQuiz = (blockId: string) => {
    setQuizSubmitted(prev => ({ ...prev, [blockId]: true }));
  };

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert space-y-4">
      {blocks.map((block) => (
        <RenderBlock 
          key={block.id} 
          block={block} 
          quizAnswer={quizAnswers[block.id]}
          quizSubmitted={quizSubmitted[block.id]}
          onQuizAnswer={(index) => handleQuizAnswer(block.id, index)}
          onQuizSubmit={() => submitQuiz(block.id)}
        />
      ))}
    </div>
  );
}

function RenderBlock({ 
  block, 
  quizAnswer, 
  quizSubmitted, 
  onQuizAnswer, 
  onQuizSubmit 
}: { 
  block: ContentBlock; 
  quizAnswer?: number;
  quizSubmitted?: boolean;
  onQuizAnswer: (index: number) => void;
  onQuizSubmit: () => void;
}) {
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [showTermDef, setShowTermDef] = useState(false);

  switch (block.type) {
    case "paragraph":
      return <p dangerouslySetInnerHTML={{ __html: block.content }} />;

    case "heading1":
      return <h1 className="text-2xl font-bold" dangerouslySetInnerHTML={{ __html: block.content }} />;

    case "heading2":
      return <h2 className="text-xl font-semibold" dangerouslySetInnerHTML={{ __html: block.content }} />;

    case "bulletList":
      return (
        <ul className="list-disc pl-6">
          {(block.content || "").split("\n").filter(Boolean).map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      );

    case "numberedList":
      return (
        <ol className="list-decimal pl-6">
          {(block.content || "").split("\n").filter(Boolean).map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ol>
      );

    case "quote":
      return (
        <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground">
          <span dangerouslySetInnerHTML={{ __html: block.content }} />
        </blockquote>
      );

    case "callout-info":
      return (
        <div className="rounded-xl p-4 bg-blue-500/10 border border-blue-500/30 flex gap-3 not-prose">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm" dangerouslySetInnerHTML={{ __html: block.content }} />
        </div>
      );

    case "callout-warning":
      return (
        <div className="rounded-xl p-4 bg-amber-500/10 border border-amber-500/30 flex gap-3 not-prose">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm" dangerouslySetInnerHTML={{ __html: block.content }} />
        </div>
      );

    case "callout-tip":
      return (
        <div className="rounded-xl p-4 bg-green-500/10 border border-green-500/30 flex gap-3 not-prose">
          <Lightbulb className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm" dangerouslySetInnerHTML={{ __html: block.content }} />
        </div>
      );

    case "accordion":
      return (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 overflow-hidden not-prose">
          <button 
            className="w-full flex items-center gap-2 p-3 text-left hover:bg-purple-500/10"
            onClick={() => setAccordionOpen(!accordionOpen)}
          >
            {accordionOpen ? <ChevronDown className="w-4 h-4 text-purple-500" /> : <ChevronRight className="w-4 h-4 text-purple-500" />}
            <span className="font-medium">{block.accordionTitle}</span>
          </button>
          {accordionOpen && (
            <div className="p-3 pt-0 border-t border-purple-500/20">
              <p className="text-sm" dangerouslySetInnerHTML={{ __html: block.content }} />
            </div>
          )}
        </div>
      );

    case "quiz":
      const options = block.quizOptions || [];
      const correctIndex = options.findIndex(o => o.isCorrect);
      const isCorrect = quizSubmitted && quizAnswer === correctIndex;

      return (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 not-prose">
          <div className="flex items-center gap-2 text-primary">
            <HelpCircle className="w-5 h-5" />
            <span className="font-medium">Проверьте себя</span>
          </div>
          <p className="font-medium">{block.quizQuestion}</p>
          <div className="space-y-2">
            {options.map((option, i) => (
              <button
                key={i}
                onClick={() => onQuizAnswer(i)}
                disabled={quizSubmitted}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all",
                  quizAnswer === i && !quizSubmitted && "border-primary bg-primary/10",
                  quizSubmitted && option.isCorrect && "border-green-500 bg-green-500/10",
                  quizSubmitted && quizAnswer === i && !option.isCorrect && "border-destructive bg-destructive/10",
                  !quizSubmitted && quizAnswer !== i && "border-border hover:border-primary/50"
                )}
              >
                {option.text}
              </button>
            ))}
          </div>
          {!quizSubmitted && quizAnswer !== undefined && (
            <Button onClick={onQuizSubmit} size="sm">
              Проверить
            </Button>
          )}
          {quizSubmitted && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              isCorrect ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"
            )}>
              {isCorrect ? "Правильно! " : "Неправильно. "}
              {block.quizExplanation}
            </div>
          )}
        </div>
      );

    case "term":
      return (
        <div className="not-prose">
          <button 
            className="inline-flex items-center gap-1 text-cyan-500 underline decoration-dotted cursor-help"
            onMouseEnter={() => setShowTermDef(true)}
            onMouseLeave={() => setShowTermDef(false)}
            onClick={() => setShowTermDef(!showTermDef)}
          >
            <BookOpen className="w-4 h-4" />
            {block.termWord}
          </button>
          {showTermDef && (
            <div className="mt-2 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-sm">
              <strong>{block.termWord}</strong> — {block.termDefinition}
            </div>
          )}
        </div>
      );

    case "image":
      return (
        <div className="not-prose my-4">
          {block.imageSrc ? (
            <img 
              src={block.imageSrc} 
              alt={block.imageAlt || ""} 
              className="rounded-lg max-w-full h-auto"
            />
          ) : (
            <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Изображение не загружено</p>
            </div>
          )}
          {block.imageAlt && (
            <p className="text-sm text-muted-foreground mt-2 text-center italic">{block.imageAlt}</p>
          )}
        </div>
      );

    case "video":
      const getEmbedUrlRender = (url: string): string | null => {
        if (!url) return null;
        const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        const rutubeMatch = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)/);
        if (rutubeMatch) return `https://rutube.ru/play/embed/${rutubeMatch[1]}`;
        const vkMatch = url.match(/vk\.com\/video(-?\d+)_(\d+)/);
        if (vkMatch) return `https://vk.com/video_ext.php?oid=${vkMatch[1]}&id=${vkMatch[2]}`;
        return null;
      };
      const videoEmbedUrl = getEmbedUrlRender(block.videoUrl || "");
      return (
        <div className="not-prose my-4">
          {videoEmbedUrl ? (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src={videoEmbedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="bg-muted rounded-lg p-8 text-center text-muted-foreground">
              <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Видео не добавлено</p>
            </div>
          )}
        </div>
      );

    case "table":
      return (
        <div className="not-prose my-4 overflow-x-auto">
          <div 
            className="min-w-full [&_table]:min-w-full [&_table]:text-sm [&_table]:border [&_table]:border-border [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:font-semibold"
            dangerouslySetInnerHTML={{ __html: block.tableHtml || "" }}
          />
        </div>
      );

    default:
      return null;
  }
}

// Utility to convert HTML to blocks (for import)
export function htmlToBlocks(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push(createBlock("paragraph"));
        blocks[blocks.length - 1].content = text;
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();

    switch (tagName) {
      case "h1":
        blocks.push({ ...createBlock("heading1"), content: el.textContent || "" });
        break;
      case "h2":
      case "h3":
        blocks.push({ ...createBlock("heading2"), content: el.textContent || "" });
        break;
      case "p":
        // Check if paragraph contains only an image
        const imgInP = el.querySelector("img");
        if (imgInP && el.childNodes.length === 1) {
          blocks.push({ 
            ...createBlock("image"), 
            imageSrc: imgInP.getAttribute("src") || "",
            imageAlt: imgInP.getAttribute("alt") || "",
          });
        } else {
          // Keep innerHTML to preserve inline formatting (bold, italic, etc.)
          blocks.push({ ...createBlock("paragraph"), content: el.innerHTML || "" });
        }
        break;
      case "ul":
        const bulletItems = Array.from(el.querySelectorAll(":scope > li")).map(li => li.innerHTML || "").join("\n");
        blocks.push({ ...createBlock("bulletList"), content: bulletItems });
        break;
      case "ol":
        const numberedItems = Array.from(el.querySelectorAll(":scope > li")).map(li => li.innerHTML || "").join("\n");
        blocks.push({ ...createBlock("numberedList"), content: numberedItems });
        break;
      case "blockquote":
        blocks.push({ ...createBlock("quote"), content: el.innerHTML || "" });
        break;
      case "img":
        // Standalone image
        blocks.push({ 
          ...createBlock("image"), 
          imageSrc: el.getAttribute("src") || "",
          imageAlt: el.getAttribute("alt") || "",
        });
        break;
      case "table":
        // Preserve table as HTML for proper rendering
        blocks.push({ 
          ...createBlock("table"), 
          tableHtml: el.outerHTML,
          content: "", // Keep content empty, tableHtml has the data
        });
        break;
      case "div":
      case "section":
      case "article":
      case "span":
        // Process children for container elements
        el.childNodes.forEach(processNode);
        break;
      default:
        // Process children for unknown elements
        el.childNodes.forEach(processNode);
    }
  };

  doc.body.childNodes.forEach(processNode);
  
  return blocks.filter(b => b.content || b.tableHtml || b.imageSrc || b.type === "quiz" || b.type === "accordion" || b.type === "term" || b.type === "image" || b.type === "table");
}

// Utility to convert blocks to JSON for storage
export function blocksToJson(blocks: ContentBlock[]): string {
  return JSON.stringify(blocks);
}

// Utility to parse JSON to blocks
export function jsonToBlocks(json: string): ContentBlock[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}
