import './globals.css';
import { AppShell } from './components/AppShell';

export const metadata = {
  title: 'VaaniCall AI — Autonomous Multilingual Voice Assistant',
  description: 'Autonomous voice calling assistant in Kannada, English, and Kanglish',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface font-sans antialiased selection:bg-primary-container selection:text-on-primary">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
