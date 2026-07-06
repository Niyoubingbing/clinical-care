export default function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/50 px-6 py-12 text-center">
      <p className="text-[14px] font-medium text-main">{title}</p>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
