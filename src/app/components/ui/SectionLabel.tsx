interface SectionLabelProps {
  text: string;
  className?: string;
}

export function SectionLabel({ text, className = '' }: SectionLabelProps) {
  return (
    <div className={`section-label ${className}`}>
      <div className="section-label__highlighter" />
      <span>{text}</span>
    </div>
  );
}
