"use client";
export default function StatusBadge({ running }: { running: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${running ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
      <span className={`text-sm font-medium ${running ? "text-green-400" : "text-red-400"}`}>
        {running ? "AGENT ACTIVE" : "AGENT STOPPED"}
      </span>
    </div>
  );
}
