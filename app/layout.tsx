import './globals.css';
import type { Metadata } from 'next';
import PaymentListener from '@/app/components/PaymentListener';

export const metadata: Metadata = {
  title: 'EvalMind AI - Precision Assessment',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Inter:wght@300..700&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className="antialiased">
        <PaymentListener />
        {children}
      </body>
    </html>
  );
}
