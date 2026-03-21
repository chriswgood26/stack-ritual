export default function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-stone-400 text-center leading-relaxed">
        ⚕️ Nothing on Stack Ritual constitutes medical advice. Always consult your doctor before beginning or changing any vitamin or supplement regimen.
      </p>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 leading-relaxed">
      <span className="font-semibold">⚕️ Medical Disclaimer:</span> Nothing on Stack Ritual constitutes medical advice. The information provided is for educational purposes only. Always consult your doctor or a qualified healthcare provider before beginning, changing, or stopping any vitamin, supplement, or wellness regimen.
    </div>
  );
}
