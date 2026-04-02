export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-3 border-white/20 border-t-white/80 rounded-full animate-spin" />
      {message && <p className="text-white/50 text-sm">{message}</p>}
    </div>
  );
}
