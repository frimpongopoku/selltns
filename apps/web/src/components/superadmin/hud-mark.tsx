// The one signature flourish of the superadmin console: a viewfinder frame
// around the brand icon, echoing a surveillance/control-room readout.
// Used exactly once (the sidebar brand block) so it stays a mark, not a
// motif repeated into decoration.
export function HudMark({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center">
      <span className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-primary" />
      <span className="pointer-events-none absolute right-0 top-0 h-2 w-2 border-r border-t border-primary" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-2 w-2 border-b border-l border-primary" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-primary" />
      {children}
    </span>
  );
}
