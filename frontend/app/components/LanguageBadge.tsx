/** Language indicator badge for Kannada/English/Kanglish */

interface Props {
  language: 'kannada' | 'english' | 'kanglish' | null;
}

export function LanguageBadge({ language }: Props) {
  const configs: Record<string, { label: string; class: string }> = {
    kannada: { label: 'ಕನ್ನಡ', class: 'badge-kannada' },
    english: { label: 'English', class: 'badge-english' },
    kanglish: { label: 'Kanglish', class: 'badge-kanglish' },
  };

  if (!language) return null;
  const c = configs[language] || configs.kannada;

  return (
    <span className={c.class}>
      {c.label}
    </span>
  );
}