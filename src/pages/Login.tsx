import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Demo credentials for testing
const DEMO_ACCOUNTS = {
  admin: { email: "admin@sintagma.ru", password: "admin123", role: "admin" },
  org: { email: "status@sintagma.ru", password: "status123", role: "organization" },
  student: { email: "student@status.ru", password: "student123", role: "student" },
};

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check demo accounts
    const account = Object.values(DEMO_ACCOUNTS).find(
      (acc) => acc.email === email && acc.password === password
    );

    if (account) {
      localStorage.setItem("user", JSON.stringify(account));
      toast({
        title: "Успешный вход!",
        description: `Добро пожаловать в систему`,
      });
      
      if (account.role === "admin") {
        navigate("/admin");
      } else if (account.role === "organization") {
        navigate("/organization");
      } else {
        navigate("/student");
      }
    } else {
      toast({
        title: "Ошибка входа",
        description: "Неверный email или пароль",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const fillDemoCredentials = (type: keyof typeof DEMO_ACCOUNTS) => {
    setEmail(DEMO_ACCOUNTS[type].email);
    setPassword(DEMO_ACCOUNTS[type].password);
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

          <h1 className="font-display text-3xl font-bold mb-2">Войти в систему</h1>
          <p className="text-muted-foreground mb-8">
            Введите свои учётные данные для входа
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@mail.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
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
                  className="h-12 rounded-xl pr-12"
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
            </div>

            <Button
              type="submit"
              className="w-full h-12 btn-gradient rounded-xl text-lg"
              disabled={isLoading}
            >
              {isLoading ? "Вход..." : "Войти"}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8 p-4 bg-secondary/50 rounded-xl">
            <p className="text-sm font-medium mb-3">Демо-аккаунты для проверки:</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials("admin")}
                className="w-full text-left p-2 rounded-lg hover:bg-secondary transition-colors text-sm"
              >
                <span className="font-medium">Администратор:</span>{" "}
                <span className="text-muted-foreground">admin@sintagma.ru / admin123</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials("org")}
                className="w-full text-left p-2 rounded-lg hover:bg-secondary transition-colors text-sm"
              >
                <span className="font-medium">УЦ СТАТУС:</span>{" "}
                <span className="text-muted-foreground">status@sintagma.ru / status123</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials("student")}
                className="w-full text-left p-2 rounded-lg hover:bg-secondary transition-colors text-sm"
              >
                <span className="font-medium">Ученик:</span>{" "}
                <span className="text-muted-foreground">student@status.ru / student123</span>
              </button>
            </div>
          </div>

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
