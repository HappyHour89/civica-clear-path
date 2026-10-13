import { Reveal } from "./Reveal";

export function PageHeader(props: { eyebrow?: string; title: string; intro?: string; children?: React.ReactNode }) {
  return (
    <header className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 md:pt-20">
      <Reveal className="max-w-3xl space-y-4">
        {props.eyebrow && (
          <p className="text-xs font-semibold tracking-[0.16em] text-accent-ink uppercase">{props.eyebrow}</p>
        )}
        <h1 className="font-serif text-4xl leading-[1.1] font-semibold tracking-tight text-ink md:text-5xl">
          {props.title}
        </h1>
        {props.intro && <p className="text-lg text-muted">{props.intro}</p>}
        {props.children}
      </Reveal>
    </header>
  );
}
