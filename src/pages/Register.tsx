import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import { ArrowLeft, Building2, GraduationCap, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

type RegistrationType = "organization" | "student";

// Validation schema
const registerSchema = z.object({
  email: z.string().trim().email({ message: "Введите корректный email" }).max(255),
  password: z.string().min(6, { message: "Пароль должен быть не менее 6 символов" }).max(128),
  fullName: z.string().trim().min(1, { message: "Введите имя" }).max(200),
});

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading, signUp } = useAuth();
  const [step, setStep] = useState<"select" | "form">("select");
  const [type, setType] = useState<RegistrationType>("student");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role) {
      const redirectPath = role === 'admin' ? '/admin' : role === 'organization' ? '/organization' : '/student';
      navigate(redirectPath, { replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    
    // Validate inputs
    const result = registerSchema.safeParse({ email, password, fullName });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string; fullName?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
        if (err.path[0] === 'fullName') fieldErrors.fullName = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    
    const { error } = await signUp(email, password, fullName, type);
    
    if (error) {
      let errorMessage = error.message;
      if (error.message.includes("User already registered")) {
        errorMessage = "Пользователь с таким email уже зарегистрирован";
      }
      toast({
        title: "Ошибка регистрации",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Регистрация успешна!",
        description: "Добро пожаловать в систему",
      });
    }
    
    setIsLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
                        Для самостоятельного обучения
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
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    {type === "organization" ? "Контактное лицо" : "ФИО"}
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Иванов Иван Иванович"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`h-12 rounded-xl ${errors.fullName ? 'border-destructive' : ''}`}
                    required
                  />
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@mail.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`h-12 rounded-xl ${errors.email ? 'border-destructive' : ''}`}
                    required
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`h-12 rounded-xl pr-12 ${errors.password ? 'border-destructive' : ''}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
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
