import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0e1a2e] text-white flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-2">CATAN</h1>
        <p className="text-white/50">Multiplayer Big Screen + Mobile</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/create"
          className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-center text-lg transition-colors"
        >
          Opret Nyt Spil
        </Link>
        <Link
          href="/join"
          className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-center text-lg transition-colors"
        >
          Join Spil
        </Link>
        <Link
          href="/board/preview"
          className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-center text-sm transition-colors"
        >
          Board Preview
        </Link>
      </div>
    </div>
  );
}
