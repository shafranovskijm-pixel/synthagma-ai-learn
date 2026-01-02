import { MessageCircle, Layers, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const studentFeatures = [
  {
    icon: MessageCircle,
    title: "ИИ-консультант",
    description: "Персональный помощник ответит на вопросы и поможет разобраться в материале",
    gradient: "from-primary to-accent",
  },
  {
    icon: Layers,
    title: "Интерактивное обучение",
    description: "Современные форматы материалов для эффективного усвоения знаний",
    gradient: "from-accent to-sigma-purple",
  },
  {
    icon: Clock,
    title: "Гибкий график",
    description: "Учитесь в удобное время с любого устройства",
    gradient: "from-sigma-purple to-sigma-pink",
  },
];

export function ForStudents() {
  return (
    <section id="for-students" className="py-32 bg-secondary/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sigma-purple/10 border border-sigma-purple/20 mb-6">
              <Sparkles className="w-4 h-4 text-sigma-purple" />
              <span className="text-sm font-medium text-sigma-purple">Для учеников</span>
            </div>
            
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
              ИИ-помощник <span className="gradient-text">всегда рядом</span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8">
              Персональный консультант поможет разобраться в любом учебном материале, 
              ответит на вопросы и проведёт через весь курс
            </p>

            <div className="space-y-6 mb-10">
              {studentFeatures.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="flex gap-4 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-lg mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/register">
              <Button size="lg" className="btn-gradient rounded-xl px-8 h-14 text-lg">
                Начать обучение
              </Button>
            </Link>
          </div>

          {/* Right - Chat preview */}
          <div className="relative">
            <div className="glass-card rounded-3xl p-6 shadow-2xl">
              {/* Chat header */}
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold">ИИ-помощник</div>
                  <div className="text-sm text-sigma-green flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sigma-green animate-pulse" />
                    Онлайн
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              <div className="py-6 space-y-4">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]">
                    Объясни, пожалуйста, что такое машинное обучение?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-tl-md px-4 py-3 max-w-[80%]">
                    <p className="mb-2">
                      Машинное обучение — это раздел искусственного интеллекта, 
                      который позволяет компьютерам учиться на данных без явного программирования.
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Хотите узнать о конкретных алгоритмах? 🤖
                    </p>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Задайте вопрос..." 
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button className="btn-gradient rounded-xl px-6">
                  Отправить
                </Button>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-2xl rotate-12 opacity-20" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-accent to-sigma-purple rounded-2xl -rotate-12 opacity-20" />
          </div>
        </div>
      </div>
    </section>
  );
}
