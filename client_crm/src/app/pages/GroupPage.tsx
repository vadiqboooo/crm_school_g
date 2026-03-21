import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
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
    if (backToStudent) {
      // Came from a specific student card — go back there preserving state
      navigate(`/students/${navState!.studentId}`, { state: { from: "group", groupId } });
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
  // If returning from a student that was opened from a lesson, force lessons tab
  const [activeTab, setActiveTab] = useState(openLessonId ? "lessons" : "lessons");

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
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 min-h-[72px] sm:min-h-[88px] flex items-center">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {backToStudent ? "Назад к ученику" : "Назад к списку"}
              </Button>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">{group.name}</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={generatingCreds}
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
              className="flex items-center gap-2 shrink-0"
            >
              {generatingCreds ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span className="hidden sm:inline">Выдать доступы</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border mb-6">
            <TabsTrigger value="lessons">Уроки</TabsTrigger>
            <TabsTrigger value="exams">Экзамены</TabsTrigger>
            <TabsTrigger value="performance">Успеваемость</TabsTrigger>
            <TabsTrigger value="info">Информация о группе</TabsTrigger>
          </TabsList>

          <TabsContent value="lessons">
            <LessonsTab groupId={groupId!} groupName={group.name} initialLessonId={openLessonId} />
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