import { useParams, useNavigate } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LessonsTab } from "../components/LessonsTab";
import { ExamsTab } from "../components/ExamsTab";
import { GroupInfoTab } from "../components/GroupInfoTab";
import { PerformanceTab } from "../components/PerformanceTab";

const mockGroupData = {
  "1": {
    name: "Информатика ЕГЭ Л_ЧТ",
    teacher: "Бочко В.Д.",
    subject: "Информатика",
    level: "ЕГЭ",
  },
  "2": {
    name: "Информатика ЕГЭ Б_СР",
    teacher: "Байкальская",
    subject: "Информатика",
    level: "ЕГЭ",
  },
  "3": {
    name: "Группа для учеников без группы",
    teacher: "Бочко В.Д.",
    subject: "Не указан",
    level: "",
  },
};

export function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const group = mockGroupData[groupId as keyof typeof mockGroupData];

  if (!group) {
    return <div>Группа не найдена</div>;
  }

  return (
    <>
      {/* Group Info Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к списку
            </Button>
            <h2 className="text-xl font-semibold text-slate-900">
              {group.name}
            </h2>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="lessons" className="w-full">
          <TabsList className="bg-white border mb-6">
            <TabsTrigger value="lessons">Уроки</TabsTrigger>
            <TabsTrigger value="exams">Экзамены</TabsTrigger>
            <TabsTrigger value="performance">Успеваемость</TabsTrigger>
            <TabsTrigger value="info">Информация о группе</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lessons">
            <LessonsTab groupId={groupId!} groupName={group.name} />
          </TabsContent>
          
          <TabsContent value="exams">
            <ExamsTab groupId={groupId!} groupName={group.name} groupSubject={group.subject} />
          </TabsContent>
          
          <TabsContent value="info">
            <GroupInfoTab group={group} />
          </TabsContent>
          
          <TabsContent value="performance">
            <PerformanceTab groupId={groupId!} groupName={group.name} />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}