import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

// Input validation schema
const loginSchema = z.object({
  email: z.string().trim().email({ message: "Введите корректный email" }).max(255),
  password: z.string().min(6, { message: "Пароль должен быть не менее 6 символов" }).max(128),
});

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading, signIn, resetPassword } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role) {
      const redirectPath = role === 'admin' ? '/admin' : role === 'organization' ? '/organization' : '/student';
      navigate(redirectPath, { replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate inputs
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Ошибка входа",
        description: error.message === "Invalid login credentials" 
          ? "Неверный email или пароль" 
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Успешный вход!",
        description: "Добро пожаловать в систему",
      });
    }

    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate email only
    const emailValidation = z.string().trim().email({ message: "Введите корректный email" }).max(255);
    const result = emailValidation.safeParse(email);
    
    if (!result.success) {
      setErrors({ email: result.error.errors[0].message });
      return;
    }

    setIsLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Письмо отправлено!",
        description: "Проверьте вашу почту для восстановления пароля",
      });
      setIsResetMode(false);
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

          <h1 className="font-display text-3xl font-bold mb-2">
            {isResetMode ? "Восстановление пароля" : "Войти в систему"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isResetMode 
              ? "Введите email для получения ссылки на восстановление" 
              : "Введите свои учётные данные для входа"}
          </p>

          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
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

              <Button
                type="submit"
                className="w-full h-12 btn-gradient rounded-xl text-lg"
                disabled={isLoading}
              >
                {isLoading ? "Отправка..." : "Отправить ссылку"}
              </Button>

              <button
                type="button"
                onClick={() => setIsResetMode(false)}
                className="w-full text-center text-primary font-medium hover:underline"
              >
                Вернуться к входу
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Пароль</Label>
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Забыли пароль?
                  </button>
                </div>
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
                className="w-full h-12 btn-gradient rounded-xl text-lg"
                disabled={isLoading}
              >
                {isLoading ? "Вход..." : "Войти"}
              </Button>
            </form>
          )}

          <p className="text-center text-muted-foreground mt-8">
            Нет аккаунта?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary via-accent to-sigma-purple items-center justify-center p-16">
        <div className="text-center text-white">
          <SigmaLogo size="xl" variant="white" className="mb-8 justify-center" />
          <h2 className="font-display text-3xl font-bold mb-4">
            Добро пожаловать в СИНТАГМА
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            Современная платформа дистанционного обучения с ИИ-помощником и детальной аналитикой
          </p>
        </div>
      </div>
    </div>
  );
}
