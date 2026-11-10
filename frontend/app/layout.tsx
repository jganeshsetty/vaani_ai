import './globals.css';
import { AppShell } from './components/AppShell';

export const metadata = {
  title: 'VaaniCall AI — Autonomous Voice Calling Assistant',
  description: 'Multilingual autonomous voice calling assistant in Kannada and English',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#faf9f6] text-[#1a1c1a] font-sans antialiased selection:bg-[#eaf2ec] selection:text-[#28543e]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
