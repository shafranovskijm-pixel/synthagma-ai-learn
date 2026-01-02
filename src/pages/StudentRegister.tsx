import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function StudentRegister() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [linkInfo, setLinkInfo] = useState<{ organization_name: string; name?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyLink = async () => {
      if (!token) {
        setError("Ссылка недействительна");
        setIsVerifying(false);
        return;
      }

      try {
        const { data: link, error: linkError } = await supabase
          .from("registration_links")
          .select("organization_id, name, expires_at")
          .eq("token", token)
          .single();

        if (linkError || !link) {
          setError("Ссылка регистрации не найдена");
          setIsVerifying(false);
          return;
        }

        if (new Date(link.expires_at) < new Date()) {
          setError("Срок действия ссылки истёк");
          setIsVerifying(false);
          return;
        }

        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", link.organization_id)
          .single();

        setLinkInfo({
          organization_name: org?.name || "Организация",
          name: link.name || undefined
        });
      } catch (err) {
        setError("Ошибка проверки ссылки");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyLink();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !fullName || !email || !password) {
      toast.error("Заполните все поля");
      return;
    }

    if (password.length < 6) {
      toast.error("Пароль должен быть не менее 6 символов");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("register-student", {
        body: { token, email, password, full_name: fullName }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSuccess(true);
      toast.success("Регистрация успешна!");
      
      // Auto-login
      setTimeout(async () => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (!signInError) {
          navigate("/student");
        } else {
          navigate("/login");
        }
      }, 2000);

    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error(err.message || "Ошибка регистрации");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Проверка ссылки...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Ошибка</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate("/login")} className="btn-gradient rounded-xl">
            Перейти к входу
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Регистрация завершена!</h1>
          <p className="text-muted-foreground">Перенаправление в личный кабинет...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <SigmaLogo size="lg" />
            <h1 className="text-2xl font-bold mt-6 mb-2">Регистрация ученика</h1>
            <p className="text-muted-foreground">
              Организация: <span className="font-medium text-foreground">{linkInfo?.organization_name}</span>
            </p>
            {linkInfo?.name && (
              <p className="text-sm text-muted-foreground mt-1">{linkInfo.name}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО</Label>
              <Input
                placeholder="Иванов Иван Иванович"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="ivanov@mail.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Пароль</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Минимум 6 символов"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full btn-gradient rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Регистрация...
                </>
              ) : (
                "Зарегистрироваться"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-primary hover:underline"
            >
              Войти
            </button>
          </p>
        </div>
      </div>

      {/* Right - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold mb-4">Добро пожаловать!</h2>
          <p className="text-muted-foreground">
            Создайте аккаунт для доступа к обучающим курсам вашей организации
          </p>
        </div>
      </div>
    </div>
  );
}
