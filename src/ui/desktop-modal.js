import { el } from './dom.js';
import { icon } from './icons.js';
import { openModal } from './modal.js';

export function openDesktopModal() {
  const content = el('div.desktop-modal-body', { style: 'display: flex; flex-direction: column; gap: 16px; padding: 4px 0;' },
    el('div', { style: 'background: var(--bg-surface, #f8fafc); border: 1px solid var(--border-color, #e2e8f0); border-radius: 10px; padding: 14px 16px;' },
      el('h3', { style: 'margin: 0 0 6px; font-size: 16px; font-weight: 700; color: var(--text-color, #0f172a);' }, 'تنزيل WriteDoc (إصدارات الديسكتوب والموبايل)'),
      el('p', { style: 'margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--text-muted, #475569);' },
        'تطبيق متكامل لمعالجة مستندات Word و DOCX بدون إنترنت، بدون تثبيت في النسخ المحمولة، وبحفظ تام للخصوصية على جهازك.')),
    
    el('div', { style: 'display: flex; flex-direction: column; gap: 10px;' },
      // 1. Windows 64-bit Portable
      el('div', { style: 'border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;' },
        el('div', {},
          el('div', { style: 'font-weight: 700; font-size: 14px;' }, 'ويندوز 64 بت (Portable - بدون تثبيت)'),
          el('div', { style: 'font-size: 12px; color: var(--text-muted, #64748b);' }, 'writedoc-1.1.0-portable-x64.exe')),
        el('a.btn.btn-primary', {
          href: 'https://github.com/salim-studio/writedoc/releases/download/v1.1.0/writedoc-1.1.0-portable-x64.exe',
          target: '_blank',
          rel: 'noopener noreferrer',
          style: 'padding: 8px 14px; font-size: 13px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 6px;',
        }, el('span', { html: icon('download', 15) }), el('span', {}, 'تحميل'))),

      // 2. Windows 32-bit Portable
      el('div', { style: 'border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;' },
        el('div', {},
          el('div', { style: 'font-weight: 700; font-size: 14px;' }, 'ويندوز 32 بت (Portable - بدون تثبيت)'),
          el('div', { style: 'font-size: 12px; color: var(--text-muted, #64748b);' }, 'writedoc-1.1.0-portable-ia32.exe (للأجهزة القديمة)')),
        el('a.btn.btn-outline', {
          href: 'https://github.com/salim-studio/writedoc/releases/download/v1.1.0/writedoc-1.1.0-portable-ia32.exe',
          target: '_blank',
          rel: 'noopener noreferrer',
          style: 'padding: 8px 14px; font-size: 13px; text-decoration: none; display: flex; align-items: center; gap: 6px;',
        }, el('span', { html: icon('download', 15) }), el('span', {}, 'تحميل'))),

      // 3. Windows Setup Installer
      el('div', { style: 'border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;' },
        el('div', {},
          el('div', { style: 'font-weight: 700; font-size: 14px;' }, 'ويندوز نسخة التثبيت (Setup Installer)'),
          el('div', { style: 'font-size: 12px; color: var(--text-muted, #64748b);' }, 'writedoc-1.1.0-setup-x64.exe & setup-ia32.exe')),
        el('a.btn.btn-outline', {
          href: 'https://github.com/salim-studio/writedoc/releases/download/v1.1.0/writedoc-1.1.0-setup.exe',
          target: '_blank',
          rel: 'noopener noreferrer',
          style: 'padding: 8px 14px; font-size: 13px; text-decoration: none; display: flex; align-items: center; gap: 6px;',
        }, el('span', { html: icon('download', 15) }), el('span', {}, 'تحميل'))),

      // 4. Android APK
      el('div', { style: 'border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(79, 70, 229, 0.04);' },
        el('div', {},
          el('div', { style: 'font-weight: 700; font-size: 14px;' }, 'أندرويد APK (تطبيق الموبايل)'),
          el('div', { style: 'font-size: 12px; color: var(--text-muted, #64748b);' }, 'writedoc-1.0.0.apk / writedoc-1.1.0.apk')),
        el('a.btn.btn-outline', {
          href: 'https://github.com/salim-studio/writedoc/releases/download/v1.1.0/writedoc-1.0.0.apk',
          target: '_blank',
          rel: 'noopener noreferrer',
          style: 'padding: 8px 14px; font-size: 13px; text-decoration: none; display: flex; align-items: center; gap: 6px;',
        }, el('span', { html: icon('download', 15) }), el('span', {}, 'تحميل APK')))),

    el('div', { style: 'display: flex; justify-content: center; margin-top: 4px;' },
      el('a', {
        href: 'https://github.com/salim-studio/writedoc/releases',
        target: '_blank',
        rel: 'noopener noreferrer',
        style: 'font-size: 13px; color: var(--brand-color, #4f46e5); font-weight: 600; text-decoration: underline;',
      }, 'عرض جميع الإصدارات والتنزيلات على GitHub Releases')),

    el('div', { style: 'font-size: 12.5px; color: var(--text-muted, #64748b); line-height: 1.5; border-top: 1px solid var(--border-color, #e2e8f0); padding-top: 10px;' },
      el('div', { style: 'font-weight: 600; color: var(--text-color, #1e293b); margin-bottom: 2px;' }, 'ملاحظات:'),
      el('div', {}, '• نسخ Portable لا تتطلب تثبيتاً ويمكن تشغيلها مباشرة من فلاش USB.'),
      el('div', {}, '• نسخة 32 بت تدعم معالجات وأنظمة ويندوز القديمة والحديثة.'),
      el('div', {}, '• جميع النسخ تعمل دون اتصال بالإنترنت مع دعم الخطوط العربية كاملة.'))
  );

  openModal({
    title: 'WriteDoc Desktop & Mobile Releases',
    content,
    wide: false,
  });
}
