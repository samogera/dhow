export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-8 space-y-3"><div className="skeleton h-9 w-72" /><div className="skeleton h-4 w-96 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="card h-36"><div className="skeleton h-3 w-24" /><div className="skeleton mt-10 h-7 w-32" /></div>)}</div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]"><div className="card h-80"><div className="skeleton h-full" /></div><div className="card h-80"><div className="skeleton h-full" /></div></div>
    </div>
  );
}
