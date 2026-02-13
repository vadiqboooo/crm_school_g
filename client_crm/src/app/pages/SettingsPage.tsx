import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { School, Mail, Phone, MapPin } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Настройки</h1>
        <p className="text-slate-600 mt-1">
          Управление настройками школы и системы
        </p>
      </div>

      <div className="space-y-6">
        {/* School Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="w-5 h-5" />
              Информация о школе
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">Название школы</Label>
              <Input
                id="schoolName"
                defaultValue="ШКОЛА ГАРРИ"
                placeholder="Введите название школы"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                placeholder="Описание школы..."
                rows={4}
                defaultValue="Образовательная платформа для подготовки к экзаменам по различным предметам."
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Контактная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                defaultValue="info@school-harry.ru"
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Телефон
              </Label>
              <Input
                id="phone"
                type="tel"
                defaultValue="+7 (999) 123-45-67"
                placeholder="+7 (___) ___-__-__"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Адрес
              </Label>
              <Input
                id="address"
                defaultValue="г. Москва, ул. Примерная, д. 1"
                placeholder="Введите адрес"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Настройки оплаты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultRate">Стандартная ставка за урок (₽)</Label>
              <Input
                id="defaultRate"
                type="number"
                defaultValue="1500"
                placeholder="1500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentFee">Стандартная стоимость для студента (₽)</Label>
              <Input
                id="studentFee"
                type="number"
                defaultValue="8000"
                placeholder="8000"
              />
            </div>
          </CardContent>
        </Card>

        {/* Grading System */}
        <Card>
          <CardHeader>
            <CardTitle>Система оценивания</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Используемые системы оценивания</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="5point"
                    defaultChecked
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <label htmlFor="5point" className="text-sm text-slate-700">
                    5-балльная система
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tasks"
                    defaultChecked
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <label htmlFor="tasks" className="text-sm text-slate-700">
                    По количеству заданий
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="passfall"
                    defaultChecked
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <label htmlFor="passfall" className="text-sm text-slate-700">
                    Зачет/Незачет
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline">Отменить</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Сохранить изменения
          </Button>
        </div>
      </div>
    </div>
  );
}
