import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Social Ops Studio',
  description: 'Local-first desktop control center for managing and analyzing social content across multiple platforms.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
