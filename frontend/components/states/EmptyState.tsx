import type { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
      {icon ? <div className="mx-auto flex w-fit items-center justify-center text-green-700">{icon}</div> : null}
      <h2 className="mt-3 text-lg font-black text-slate-900">{title}</h2>
      {description ? <p className="mx-auto mt-2 max-w-xl text-base leading-6 text-slate-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
