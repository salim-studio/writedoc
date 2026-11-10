import { el } from './dom.js';
import { icon } from './icons.js';
import { openModal } from './modal.js';

export function openDesktopModal() {
  const content = el('div.desktop-modal-body', { style: 'display: flex; flex-direction: column; gap: 16px; padding: 4px 0;' },
    el('div', { style: 'background: var(--bg-surface, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 10px; padding: 14px 16px;' },
      el('h3', { style: 'margin: 0 0 6px; font-size: 16px; font-weight: 700; color: var(--text-color, #0f172a);' }, 'نسخة الديسكتوب المحمولة (Windows Portable)'),
      el('p', { style: 'margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text-muted, #475569);' },
        'تطبيق مكتبي متكامل بصيغة ملف تنفيذي محمول (.exe) يعمل فوراً بدون الحاجة إلى تثبيت، ويعمل بدون اتصال بالإنترنت مع دعم كامل للغة العربية والخطوط.')),
    
    el('div', { style: 'display: flex; flex-direction: column; gap: 8px;' },
      el('a.btn.btn-primary', {
        href: 'https://github.com/salim-studio/writedoc/releases/download/v1.0.0/writedoc-1.0.0-portable.exe',
        target: '_blank',
        rel: 'noopener noreferrer',
        style: 'display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px 18px; font-size: 14.5px; font-weight: 600; text-decoration: none; border-radius: 8px;',
      },
        el('span', { html: icon('download', 18, 2) }),
        el('span', {}, 'تحميل writedoc Portable (.exe) للويندوز')),
      
      el('a.btn.btn-outline', {
        href: 'https://github.com/salim-studio/writedoc/releases',
        target: '_blank',
        rel: 'noopener noreferrer',
        style: 'display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; font-size: 13.5px; text-decoration: none; border-radius: 8px;',
      },
        el('span', { html: icon('monitor', 16, 2) }),
        el('span', {}, 'عرض جميع إصدارات الديسكتوب على GitHub Releases'))),

    el('div', { style: 'font-size: 13px; color: var(--text-muted, #64748b); line-height: 1.6; padding-top: 4px;' },
      el('div', { style: 'font-weight: 600; margin-bottom: 4px; color: var(--text-color, #1e293b);' }, 'مميزات النسخة المحمولة:'),
      el('ul', { style: 'margin: 0; padding-inline-start: 20px;' },
        el('li', {}, 'جاهزة للتشغيل الفوري دون الحاجة إلى صلاحيات مسؤول (Admin) أو تثبيت.'),
        el('li', {}, 'يمكن تشغيلها من أي فلاش ميموري (USB) ونقلها بين الأجهزة بسهولة.'),
        el('li', {}, 'تحرير مستندات DOCX الأصلية مع الحفاظ التام على الخصوصية محلياً.'),
        el('li', {}, 'دعم الطباعة، التصدير، التدقيق الإملائي، واختصارات لوحة المفاتيح.')))
  );

  openModal({
    title: 'WriteDoc Desktop Portable',
    content,
    wide: false,
  });
}
