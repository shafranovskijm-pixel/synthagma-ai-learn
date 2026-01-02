import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import { ArrowLeft, Building2, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RegistrationType = "organization" | "student";

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"select" | "form">("select");
  const [type, setType] = useState<RegistrationType>("organization");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast({
      title: "Регистрация успешна!",
      description: "На вашу почту отправлены данные для входа",
    });
    
    navigate("/login");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
        <div className="max-w-md mx-auto w-full">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            На главную
          </Link>

          <SigmaLogo size="lg" className="mb-8" />

          {step === "select" ? (
            <>
              <h1 className="font-display text-3xl font-bold mb-2">Регистрация</h1>
              <p className="text-muted-foreground mb-8">
                Выберите тип аккаунта для регистрации
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    setType("organization");
                    setStep("form");
                  }}
                  className="w-full p-6 rounded-2xl border border-border hover:border-primary hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Building2 className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-semibold mb-1">Организация</h3>
                      <p className="text-muted-foreground">
                        Для учебных центров, школ и компаний
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setType("student");
                    setStep("form");
                  }}
                  className="w-full p-6 rounded-2xl border border-border hover:border-accent hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <GraduationCap className="w-7 h-7 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-semibold mb-1">Ученик</h3>
                      <p className="text-muted-foreground">
                        Присоединиться к существующей организации
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("select")}
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад к выбору
              </button>

              <h1 className="font-display text-3xl font-bold mb-2">
                {type === "organization" ? "Регистрация организации" : "Регистрация ученика"}
              </h1>
              <p className="text-muted-foreground mb-8">
                Заполните форму для создания аккаунта
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {type === "organization" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Название организации</Label>
                      <Input
                        id="orgName"
                        placeholder="Учебный центр СТАТУС"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inn">ИНН организации</Label>
                      <Input
                        id="inn"
                        placeholder="1234567890"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Контактное лицо</Label>
                      <Input
                        id="contactName"
                        placeholder="Иванов Иван Иванович"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">ФИО</Label>
                      <Input
                        id="fullName"
                        placeholder="Иванов Иван Иванович"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">Код приглашения</Label>
                      <Input
                        id="inviteCode"
                        placeholder="ABC123"
                        className="h-12 rounded-xl"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@mail.ru"
                    className="h-12 rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+7 (999) 123-45-67"
                    className="h-12 rounded-xl"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 btn-gradient rounded-xl text-lg mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? "Регистрация..." : "Зарегистрироваться"}
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-muted-foreground mt-8">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary via-accent to-sigma-purple items-center justify-center p-16">
        <div className="text-center text-white">
          <SigmaLogo size="xl" variant="white" className="mb-8 justify-center" />
          <h2 className="font-display text-3xl font-bold mb-4">
            Присоединяйтесь к СИНТАГМА
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            Создайте аккаунт и начните использовать все возможности современной LMS-платформы
          </p>
        </div>
      </div>
    </div>
  );
}
