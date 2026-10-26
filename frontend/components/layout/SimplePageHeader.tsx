export default function SimplePageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-base leading-6 text-slate-600">{description}</p> : null}
    </header>
  );
}
