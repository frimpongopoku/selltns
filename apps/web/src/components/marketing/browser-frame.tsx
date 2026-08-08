export function BrowserFrame({
  url,
  children,
  className = "",
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#141414]/10 bg-white shadow-xl dark:border-[#F2F1EE]/10 dark:bg-[#1C1C1C] ${className}`}
    >
      <div className="flex items-center gap-3 border-b border-[#141414]/10 bg-[#F8F8F6] px-4 py-2.5 dark:border-[#F2F1EE]/10 dark:bg-[#141414]">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#141414]/15 dark:bg-[#F2F1EE]/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#141414]/15 dark:bg-[#F2F1EE]/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#141414]/15 dark:bg-[#F2F1EE]/20" />
        </div>
        <div className="flex-1 rounded-full bg-[#141414]/5 px-3 py-1 text-center font-mono text-[11px] text-[#66605A] dark:bg-[#F2F1EE]/10 dark:text-[#A8A29B]">
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}
