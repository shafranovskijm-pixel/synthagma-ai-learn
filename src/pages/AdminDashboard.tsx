import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import { 
  Building2, 
  Users, 
  Settings, 
  LogOut, 
  Brain, 
  Calendar,
  TrendingUp,
  Plus,
  MoreHorizontal,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

const organizations = [
  { 
    id: 1, 
    name: "Учебный центр СТАТУС", 
    email: "status@sintagma.ru",
    registeredAt: "2024-01-15",
    studentsCount: 156,
    coursesCount: 12,
    aiEnabled: true,
    status: "active"
  },
  { 
    id: 2, 
    name: "Академия Прогресс", 
    email: "progress@mail.ru",
    registeredAt: "2024-02-20",
    studentsCount: 89,
    coursesCount: 8,
    aiEnabled: true,
    status: "active"
  },
  { 
    id: 3, 
    name: "Школа IT-навыков", 
    email: "it-skills@mail.ru",
    registeredAt: "2024-03-10",
    studentsCount: 234,
    coursesCount: 15,
    aiEnabled: false,
    status: "active"
  },
];

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    await signOut();
  };

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <SigmaLogo size="md" />
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary font-medium">
              <Building2 className="w-5 h-5" />
              Организации
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
              <Users className="w-5 h-5" />
              Все пользователи
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
              <Brain className="w-5 h-5" />
              ИИ-настройки
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary transition-colors">
              <Settings className="w-5 h-5" />
              Настройки
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">Панель администратора</h1>
              <p className="text-muted-foreground">Управление платформой СИНТАГМА</p>
            </div>
            <Button className="btn-gradient rounded-xl gap-2">
              <Plus className="w-4 h-4" />
              Добавить организацию
            </Button>
          </div>
        </header>

        <div className="p-8">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">{organizations.length}</div>
                  <div className="text-muted-foreground text-sm">Организаций</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">479</div>
                  <div className="text-muted-foreground text-sm">Всего учеников</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sigma-green/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-sigma-green" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">35</div>
                  <div className="text-muted-foreground text-sm">Курсов</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sigma-purple/10 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-sigma-purple" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display">2</div>
                  <div className="text-muted-foreground text-sm">ИИ включён</div>
                </div>
              </div>
            </div>
          </div>

          {/* Organizations table */}
          <div className="bg-card rounded-2xl border border-border">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Организации</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Поиск..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 rounded-xl"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Название</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Дата регистрации</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Учеников</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Курсов</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">ИИ</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-muted-foreground">{org.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(org.registeredAt).toLocaleDateString('ru-RU')}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{org.studentsCount}</td>
                      <td className="px-6 py-4 font-medium">{org.coursesCount}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          org.aiEnabled 
                            ? 'bg-sigma-green/10 text-sigma-green' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {org.aiEnabled ? 'Включён' : 'Выключен'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="sm" className="rounded-lg">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
