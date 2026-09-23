import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";

export type LegalSection = { id?: string; heading: string; body: React.ReactNode };

export default async function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-white">
      <Header user={user} />

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm font-bold uppercase text-gray-500">Legal</p>
        <h1 className="mt-1 text-3xl font-bold uppercase sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {updated}</p>

        <div className="mt-8 border-[3px] border-black p-5 text-sm leading-relaxed text-gray-700">
          {intro}
        </div>

        <nav className="mt-8" aria-label="Contents">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {sections.map((section, index) => (
              <li key={section.heading}>
                <a
                  href={`#${section.id ?? `s${index + 1}`}`}
                  className="font-bold underline decoration-2 underline-offset-2 hover:bg-black hover:text-white"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((section, index) => (
            <section key={section.heading} id={section.id ?? `s${index + 1}`} className="scroll-mt-24">
              <h2 className="border-b-[3px] border-black pb-2 text-lg font-bold uppercase">
                {index + 1}. {section.heading}
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-700 [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </article>

      <Footer />
    </main>
  );
}
