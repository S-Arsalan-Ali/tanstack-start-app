export function ComingSoon({ page, desc }: { page: string; desc?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded p-12 text-center">
      <h2 className="font-display text-2xl text-zinc-100">{page}</h2>
      {desc && <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">{desc}</p>}
      <p className="text-xs text-orange-400 mt-4 uppercase tracking-wider">Database wired — full CRUD UI coming next iteration</p>
    </div>
  );
}
