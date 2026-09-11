export function ComingSoonPage({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <h1 className="font-extrabold text-[26px] text-ink-900">{title}</h1>
      <p className="text-[15px] text-ink-500 mt-1">{desc}</p>
    </div>
  );
}
