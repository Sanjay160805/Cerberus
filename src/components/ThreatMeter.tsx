"use client";
export default function ThreatMeter({ score, action, reasoning }: { score: number; action: string; reasoning: string }) {
  const percentage = Math.round(score * 100);
  const getColor = () => {
    if (score < 0.3) return { bar: "bg-green-500", text: "text-green-400", label: "LOW" };
    if (score < 0.65) return { bar: "bg-yellow-500", text: "text-yellow-400", label: "MEDIUM" };
    if (score < 0.85) return { bar: "bg-orange-500", text: "text-orange-400", label: "HIGH" };
    return { bar: "bg-red-500", text: "text-red-400", label: "CRITICAL" };
  };
  const { bar, text, label } = getColor();
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-lg">Threat Level</h2>
        <span className={`font-bold text-xl ${text}`}>{label}</span>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Threat Score</span>
          <span className={text}>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-4">
          <div className={`${bar} h-4 rounded-full transition-all duration-700`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-400 text-sm">Last Action:</span>
          <span className="text-white font-mono text-sm bg-gray-800 px-2 py-0.5 rounded">{action}</span>
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">{reasoning}</p>
      </div>
    </div>
  );
}
