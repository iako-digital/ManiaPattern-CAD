import dynamic from "next/dynamic";

const PaperCanvas = dynamic(() => import("@/components/PaperCanvas"), {
  ssr: false,
});

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">CloudPattern CAD</h1>
        <p className="text-slate-400">Drafting Canvas</p>
      </header>
      <section className="h-[480px]">
        <PaperCanvas />
      </section>
    </main>
  );
}
