type SectionHeaderProps = {
  en: string;
  th: string;
};

export function SectionHeader({ en, th }: SectionHeaderProps) {
  return (
    <div className="text-center mb-12">
      <p className="text-primary text-xs tracking-[0.25em] uppercase mb-2">{en}</p>
      <h2 className="font-heading text-[clamp(1.8rem,4vw,2.6rem)]">{th}</h2>
      <div className="w-14 h-0.5 bg-primary rounded-full mx-auto mt-3" />
    </div>
  );
}
