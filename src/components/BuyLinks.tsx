type Props = { name: string };

export default function BuyLinks({ name }: Props) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return null;

  const q = encodeURIComponent(trimmed);
  const amazonQ = encodeURIComponent(`${trimmed} supplement`);

  return (
    <>
      <div className="space-y-2">
        <a
          href={`https://www.iherb.com/search?rcode=7113351&q=${q}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors"
        >
          <span className="text-sm font-medium text-stone-700">iHerb</span>
          <span className="text-xs text-emerald-600 font-medium">View →</span>
        </a>
        <a
          href={`https://www.amazon.com/s?k=${amazonQ}&tag=stackritual-20`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors"
        >
          <span className="text-sm font-medium text-stone-700">Amazon</span>
          <span className="text-xs text-emerald-600 font-medium">View →</span>
        </a>
        <a
          href={`https://www.thorne.com/search?q=${q}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 hover:bg-stone-100 transition-colors"
        >
          <span className="text-sm font-medium text-stone-700">Thorne</span>
          <span className="text-xs text-emerald-600 font-medium">View →</span>
        </a>
      </div>
      <p className="text-xs text-stone-400 mt-3 text-center">
        Stack Ritual may earn a commission on purchases
      </p>
    </>
  );
}
