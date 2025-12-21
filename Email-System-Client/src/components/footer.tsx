'use client';

import { useI18n } from '@/contexts/i18n-context';

export function Footer() {
  const { t, language } = useI18n();

  return (
    <footer className="border-t py-4 text-center text-sm text-muted-foreground">
      <p>
        {t.footer.copyright}{' '}
        <span className="font-semibold text-orange-500">
          {language === 'vi' ? 'Hoàn' : 'Hoan'}
        </span>
      </p>
    </footer>
  );
}
