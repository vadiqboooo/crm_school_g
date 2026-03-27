import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { ArrowLeft, Loader2, KeyRound, FileText } from "lucide-react";
import { LessonsTab } from "../components/LessonsTab";
import { ExamsTab } from "../components/ExamsTab";
import { GroupInfoTab } from "../components/GroupInfoTab";
import { PerformanceTab } from "../components/PerformanceTab";
import { PrintCredentialsModal } from "../components/PrintCredentialsModal";
import { api } from "../lib/api";
import type { Group, PortalCredential } from "../types/api";

export function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { from?: string; studentId?: string; openLessonId?: string } | null;
  const backToStudent = navState?.from === "student" && !!navState.studentId;
  const openLessonId = navState?.openLessonId ?? null;

  const handleBack = () => {
    if (backToStudent && lessonDetailOpen) {
      // Currently viewing a lesson that was opened from a student card — go back to that student
      navigate(`/students/${navState!.studentId}`, { state: { from: "group", groupId } });
    } else if (openLessonId) {
      // Came here via student→lesson flow but lesson is now closed — go to groups list
      navigate("/");
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingCreds, setGeneratingCreds] = useState(false);
  const [printCredentials, setPrintCredentials] = useState<PortalCredential[] | null>(null);
  const [generatingAllCreds, setGeneratingAllCreds] = useState(false);
  // If returning from a student that was opened from a lesson, force lessons tab
  const [activeTab, setActiveTab] = useState(openLessonId ? "lessons" : "lessons");
  const [lessonDetailOpen, setLessonDetailOpen] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  // Update document title when group is loaded
  useEffect(() => {
    if (group) {
      document.title = `${group.name} | Школа Гарри`;
    }
  }, [group]);

  const loadGroup = async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await api.getGroup(groupId);
      setGroup(data);
    } catch (err) {
      console.error("Failed to load group:", err);
      setError("Не удалось загрузить группу");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAllGroups = async () => {
    setGeneratingAllCreds(true);
    try {
      const groups = await api.generateAllGroupsCredentials();
      const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

      const pages = groups.map((g, idx) => {
        const cards = g.credentials.map((c) => `
          <div class="card">
            <div class="school">Школа Гарри</div>
            <div class="name">${c.student_name}</div>
            <div class="field"><span class="label">Логин</span><span class="value">${c.portal_login}</span></div>
            <div class="field"><span class="label">Пароль</span><span class="value">${c.plain_password}</span></div>
            <div class="site">web.garryschool.ru</div>
          </div>
        `).join("");

        const isLast = idx === groups.length - 1;
        return `
          <div class="page${isLast ? "" : " page-break"}">
            <div class="page-header">${g.group_name} · ${date}</div>
            <div class="grid">${cards}</div>
          </div>
        `;
      }).join("");

      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) return;
      win.document.write(`
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <title>Доступы учеников — все группы</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; color: #000; background: #fff; }
            .page { padding: 8mm; }
            .page-break { page-break-after: always; }
            .page-header { font-size: 13px; font-weight: bold; color: #333; margin-bottom: 5mm; border-bottom: 1px solid #ddd; padding-bottom: 2mm; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
            .card { border: 1.5px dashed #bbb; border-radius: 3mm; padding: 4mm 5mm; page-break-inside: avoid; min-height: 32mm; display: flex; flex-direction: column; justify-content: space-between; }
            .school { font-size: 8px; color: #aaa; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3mm; }
            .name { font-size: 13px; font-weight: bold; margin-bottom: 3mm; line-height: 1.3; }
            .field { display: flex; align-items: baseline; gap: 4px; margin-bottom: 1.5mm; }
            .label { font-size: 9px; color: #888; width: 40px; flex-shrink: 0; }
            .value { font-family: monospace; font-size: 12px; font-weight: bold; word-break: break-all; }
            .site { font-size: 8px; color: #ccc; margin-top: 2mm; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${pages}</body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 400);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingAllCreds(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{error || "Группа не найдена"}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backToStudent ? "Назад к ученику" : "Назад к списку"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {printCredentials && (
        <PrintCredentialsModal
          title={`Группа: ${group.name}`}
          credentials={printCredentials}
          onClose={() => setPrintCredentials(null)}
        />
      )}

      {/* Group Info Header */}
      <div className={`bg-white border-b ${lessonDetailOpen ? "hidden md:block" : ""}`}>
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          {/* Back button */}
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0 text-slate-600 hover:bg-transparent hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-xl font-semibold text-slate-900 truncate">{group.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {backToStudent ? "Назад к ученику" : "Назад к списку"}
            </p>
          </div>

          {/* PDF all groups button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-slate-400 hover:bg-transparent hover:text-slate-600"
            disabled={generatingAllCreds}
            title="PDF — доступы всех групп"
            onClick={handlePrintAllGroups}
          >
            {generatingAllCreds ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          </Button>

          {/* Key button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-slate-400 hover:bg-transparent hover:text-slate-600"
            disabled={generatingCreds}
            title="Доступы для этой группы"
            onClick={async () => {
              setGeneratingCreds(true);
              try {
                const creds = await api.generateGroupCredentials(groupId!);
                setPrintCredentials(creds);
              } catch (e) {
                console.error(e);
              } finally {
                setGeneratingCreds(false);
              }
            }}
          >
            {generatingCreds ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`mb-6 w-full sm:w-auto h-auto p-1 bg-slate-100 rounded-xl gap-1 ${lessonDetailOpen ? "hidden md:flex" : ""}`}>
            <TabsTrigger value="lessons" className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Уроки</TabsTrigger>
            <TabsTrigger value="exams" className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Экзамены</TabsTrigger>
            <TabsTrigger value="performance" className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Оценки</TabsTrigger>
            <TabsTrigger value="info" className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">Инфо</TabsTrigger>
          </TabsList>

          <TabsContent value="lessons">
            <LessonsTab groupId={groupId!} groupName={group.name} initialLessonId={openLessonId} onDetailOpen={setLessonDetailOpen} />
          </TabsContent>

          <TabsContent value="exams">
            <ExamsTab groupId={groupId!} groupName={group.name} groupSubject={group.subject.name} />
          </TabsContent>

          <TabsContent value="info">
            <GroupInfoTab group={group} onUpdate={loadGroup} />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab groupId={groupId!} groupName={group.name} />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}