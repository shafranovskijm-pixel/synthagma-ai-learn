import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SigmaLogo } from "@/components/ui/SigmaLogo";
import { 
  Building2, 
  Users, 
  Settings, 
  LogOut, 
  Brain, 
  TrendingUp,
  Plus,
  Search,
  Eye,
  FileText,
  FileCheck,
  Receipt,
  Upload,
  Trash2,
  Send,
  Loader2,
  BookOpen
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  email: string;
  contact_name: string | null;
  phone: string | null;
  inn: string | null;
  ai_enabled: boolean;
  created_at: string;
  studentsCount?: number;
  coursesCount?: number;
}

interface OrgDocument {
  id: string;
  organization_id: string;
  type: 'contract' | 'invoice' | 'act';
  name: string;
  file_url: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgDocuments, setOrgDocuments] = useState<OrgDocument[]>([]);
  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
  const [showOrgDetails, setShowOrgDetails] = useState(false);
  
  // Stats
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [aiEnabledCount, setAiEnabledCount] = useState(0);
  
  // New org form
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgEmail, setNewOrgEmail] = useState("");
  const [newOrgContact, setNewOrgContact] = useState("");
  const [newOrgPhone, setNewOrgPhone] = useState("");
  const [newOrgInn, setNewOrgInn] = useState("");

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get total courses count
      const { count: coursesCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true });
      setTotalCourses(coursesCount || 0);

      // Get total enrollments count
      const { count: enrollmentsCount } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true });
      setTotalStudents(enrollmentsCount || 0);

      // Count AI enabled orgs
      const aiCount = (orgs || []).filter(o => o.ai_enabled).length;
      setAiEnabledCount(aiCount);

      // Get stats for each org
      const orgsWithStats = await Promise.all((orgs || []).map(async (org) => {
        const { count: orgCoursesCount } = await supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id);

        const { data: courseIds } = await supabase
          .from("courses")
          .select("id")
          .eq("organization_id", org.id);

        let studentsCount = 0;
        if (courseIds && courseIds.length > 0) {
          const { count } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .in("course_id", courseIds.map(c => c.id));
          studentsCount = count || 0;
        }

        return {
          ...org,
          coursesCount: orgCoursesCount || 0,
          studentsCount
        };
      }));

      setOrganizations(orgsWithStats);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast.error("Ошибка загрузки организаций");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrgDocuments = async (orgId: string) => {
    const { data, error } = await supabase
      .from("org_documents")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      return;
    }
    setOrgDocuments((data || []) as OrgDocument[]);
  };

  const handleViewOrg = async (org: Organization) => {
    setSelectedOrg(org);
    await fetchOrgDocuments(org.id);
    setShowOrgDetails(true);
  };

  const handleAddOrg = async () => {
    if (!newOrgName || !newOrgEmail) {
      toast.error("Заполните обязательные поля");
      return;
    }

    try {
      const { error } = await supabase
        .from("organizations")
        .insert({
          name: newOrgName,
          email: newOrgEmail,
          contact_name: newOrgContact || null,
          phone: newOrgPhone || null,
          inn: newOrgInn || null
        });

      if (error) throw error;

      toast.success("Организация добавлена");
      setShowAddOrgDialog(false);
      setNewOrgName("");
      setNewOrgEmail("");
      setNewOrgContact("");
      setNewOrgPhone("");
      setNewOrgInn("");
      fetchOrganizations();
    } catch (error) {
      console.error("Error adding organization:", error);
      toast.error("Ошибка добавления организации");
    }
  };

  const handleUploadDocument = async (type: 'contract' | 'invoice' | 'act', file: File) => {
    if (!selectedOrg) return;

    try {
      const filePath = `${selectedOrg.id}/${type}_${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("org-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("org-documents")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("org_documents")
        .insert({
          organization_id: selectedOrg.id,
          type,
          name: file.name,
          file_url: publicUrl
        });

      if (dbError) throw dbError;

      toast.success("Документ загружен");
      fetchOrgDocuments(selectedOrg.id);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Ошибка загрузки документа");
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from("org_documents")
        .delete()
        .eq("id", docId);

      if (error) throw error;

      toast.success("Документ удалён");
      if (selectedOrg) {
        fetchOrgDocuments(selectedOrg.id);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Ошибка удаления документа");
    }
  };

  const handleSendToFRDO = () => {
    toast.success("Данные отправлены в ФРДО");
  };

  const handleLogout = async () => {
    await signOut();
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.inn && org.inn.includes(searchQuery))
  );

  const getDocsByType = (type: string) => orgDocuments.filter(d => d.type === type);

  const DocumentSection = ({ type, label, icon: Icon }: { type: 'contract' | 'invoice' | 'act', label: string, icon: React.ElementType }) => {
    const docs = getDocsByType(type);
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">{label}</span>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadDocument(type, file);
              }}
            />
            <Button variant="outline" size="sm" className="rounded-lg gap-1" asChild>
              <span>
                <Upload className="w-4 h-4" />
                Загрузить
              </span>
            </Button>
          </label>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет документов</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{doc.name}</span>
                </div>
                <div className="flex gap-1">
                  {doc.file_url && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-lg"
                      onClick={() => window.open(doc.file_url!, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-lg text-destructive hover:text-destructive"
                    onClick={() => handleDeleteDocument(doc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <SigmaLogo size="md" />
          <div className="mt-4 p-3 bg-destructive/10 rounded-xl">
            <div className="font-semibold text-sm text-destructive">Администратор</div>
            <div className="text-xs text-muted-foreground">Полный доступ</div>
          </div>
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
        <header className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">Панель администратора</h1>
              <p className="text-muted-foreground">Управление платформой СИНТАГМА</p>
            </div>
            <Dialog open={showAddOrgDialog} onOpenChange={setShowAddOrgDialog}>
              <DialogTrigger asChild>
                <Button className="btn-gradient rounded-xl gap-2">
                  <Plus className="w-4 h-4" />
                  Добавить организацию
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display">Новая организация</DialogTitle>
                  <DialogDescription>Добавьте информацию об организации</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Название *</Label>
                    <Input 
                      placeholder='ООО "Название"'
                      className="rounded-xl"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input 
                      type="email"
                      placeholder="info@company.ru"
                      className="rounded-xl"
                      value={newOrgEmail}
                      onChange={(e) => setNewOrgEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Контактное лицо</Label>
                    <Input 
                      placeholder="ФИО"
                      className="rounded-xl"
                      value={newOrgContact}
                      onChange={(e) => setNewOrgContact(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Телефон</Label>
                      <Input 
                        placeholder="+7 (xxx) xxx-xx-xx"
                        className="rounded-xl"
                        value={newOrgPhone}
                        onChange={(e) => setNewOrgPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ИНН</Label>
                      <Input 
                        placeholder="1234567890"
                        className="rounded-xl"
                        value={newOrgInn}
                        onChange={(e) => setNewOrgInn(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button className="w-full btn-gradient rounded-xl" onClick={handleAddOrg}>
                    Добавить организацию
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                  <div className="text-2xl font-bold font-display">{totalStudents}</div>
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
                  <div className="text-2xl font-bold font-display">{totalCourses}</div>
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
                  <div className="text-2xl font-bold font-display">{aiEnabledCount}</div>
                  <div className="text-muted-foreground text-sm">ИИ включён</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Поиск по названию, email или ИНН..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
          </div>

          {/* Organizations table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Организация</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Контакт</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">ИНН</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Курсов</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Учеников</th>
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
                        <div>
                          <div className="text-sm">{org.contact_name || "—"}</div>
                          <div className="text-sm text-muted-foreground">{org.phone || "—"}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{org.inn || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-lg text-sm">
                          <BookOpen className="w-3 h-3" />
                          {org.coursesCount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-sm">
                          <Users className="w-3 h-3" />
                          {org.studentsCount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          org.ai_enabled 
                            ? 'bg-sigma-green/10 text-sigma-green' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {org.ai_enabled ? 'Вкл' : 'Выкл'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-lg gap-1"
                          onClick={() => handleViewOrg(org)}
                        >
                          <Eye className="w-4 h-4" />
                          Подробнее
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Organization Details Dialog */}
      <Dialog open={showOrgDetails} onOpenChange={setShowOrgDetails}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedOrg?.name}</DialogTitle>
            <DialogDescription>{selectedOrg?.email}</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="documents">Документы</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <div className="text-sm text-muted-foreground">Контактное лицо</div>
                  <div className="font-medium">{selectedOrg?.contact_name || "—"}</div>
                </div>
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <div className="text-sm text-muted-foreground">Телефон</div>
                  <div className="font-medium">{selectedOrg?.phone || "—"}</div>
                </div>
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <div className="text-sm text-muted-foreground">ИНН</div>
                  <div className="font-medium">{selectedOrg?.inn || "—"}</div>
                </div>
                <div className="p-4 bg-secondary/50 rounded-xl">
                  <div className="text-sm text-muted-foreground">Дата регистрации</div>
                  <div className="font-medium">
                    {selectedOrg?.created_at ? new Date(selectedOrg.created_at).toLocaleDateString('ru-RU') : "—"}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button className="flex-1 btn-gradient rounded-xl gap-2" onClick={handleSendToFRDO}>
                  <Send className="w-4 h-4" />
                  Отправить в ФРДО
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="documents" className="space-y-6 mt-4">
              <DocumentSection type="contract" label="Договоры" icon={FileText} />
              <DocumentSection type="invoice" label="Счета" icon={Receipt} />
              <DocumentSection type="act" label="Акты" icon={FileCheck} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
