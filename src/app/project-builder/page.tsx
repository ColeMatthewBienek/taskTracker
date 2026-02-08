import ProjectBuilderClient from "./ui";

export default function ProjectBuilderPage() {
  return (
    <div className="min-h-screen bg-[var(--bg0)] text-[var(--text0)]">
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <div className="mb-4">
          <a href="/" className="text-sm text-[var(--text2)] hover:text-[var(--text0)]">
            ← Back to board
          </a>
          <h2 className="mt-2 text-xl font-semibold">Project Builder</h2>
          <p className="mt-1 text-sm text-[var(--text2)]">Draft or save a detailed project spec.</p>
        </div>
        <ProjectBuilderClient />
      </div>
    </div>
  );
}
