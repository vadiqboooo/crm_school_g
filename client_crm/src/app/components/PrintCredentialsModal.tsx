import { Printer, X } from "lucide-react";
import type { PortalCredential } from "../types/api";

interface Props {
  title: string;
  credentials: PortalCredential[];
  onClose: () => void;
}

export function PrintCredentialsModal({ title, credentials, onClose }: Props) {
  const handlePrint = () => {
    const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

    const cards = credentials.map((c) => `
      <div class="card">
        <div class="school">Школа Гарри</div>
        <div class="name">${c.student_name}</div>
        <div class="field">
          <span class="label">Логин</span>
          <span class="value">${c.portal_login}</span>
        </div>
        <div class="field">
          <span class="label">Пароль</span>
          <span class="value">${c.plain_password}</span>
        </div>
        <div class="site">web.garryschool.ru · ${date}</div>
      </div>
    `).join("");

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; color: #000; padding: 8mm; background: #fff; }
          .header { font-size: 11px; color: #888; margin-bottom: 6mm; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
          .card {
            border: 1.5px dashed #bbb;
            border-radius: 3mm;
            padding: 4mm 5mm;
            page-break-inside: avoid;
            min-height: 32mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .school { font-size: 8px; color: #aaa; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 3mm; }
          .name { font-size: 13px; font-weight: bold; margin-bottom: 3mm; line-height: 1.3; }
          .field { display: flex; align-items: baseline; gap: 4px; margin-bottom: 1.5mm; }
          .label { font-size: 9px; color: #888; width: 40px; flex-shrink: 0; }
          .value { font-family: monospace; font-size: 12px; font-weight: bold; word-break: break-all; }
          .unchanged { color: #aaa; font-weight: normal; font-style: italic; }
          .site { font-size: 8px; color: #ccc; margin-top: 2mm; }
          @media print {
            body { padding: 6mm; }
            .header { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">${title} · Распечатано: ${date}</div>
        <div class="grid">${cards}</div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const date = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Учётные данные</h2>
              <p className="text-sm text-slate-500 mt-0.5">{title}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Printer className="w-4 h-4" />
                Распечатать
              </button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Preview — card grid */}
          <div className="overflow-y-auto flex-1 p-5">
            <div className="grid grid-cols-2 gap-3">
              {credentials.map((c) => (
                <div
                  key={c.student_id}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col gap-1.5"
                >
                  <div className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Школа Гарри</div>
                  <div className="font-semibold text-slate-900 text-sm leading-tight">{c.student_name}</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 w-10 shrink-0">Логин</span>
                    <span className="font-mono text-sm font-bold text-slate-800 break-all">{c.portal_login}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] text-slate-400 w-10 shrink-0">Пароль</span>
                    <span className="font-mono text-sm font-bold text-slate-800">{c.plain_password}</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1">web.garryschool.ru · {date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <p className="text-xs text-slate-500">
              ⚠️ Новые пароли показаны только один раз. После закрытия восстановить невозможно.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
