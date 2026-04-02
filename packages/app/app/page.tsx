import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function Home() {
  const t = await getTranslations('home');

  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-2">{t('title')}</h1>
        <p className="text-white/50">{t('subtitle')}</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/create"
          className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-center text-lg transition-colors"
        >
          {t('createGame')}
        </Link>
        <Link
          href="/join"
          className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-center text-lg transition-colors"
        >
          {t('joinGame')}
        </Link>
        <Link
          href="/board/preview"
          className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-center text-sm transition-colors"
        >
          {t('boardPreview')}
        </Link>
      </div>
    </div>
  );
}
