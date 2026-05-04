import './globals.css';
import type { Metadata } from 'next';
import Script from "next/script";
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
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&family=Inter:wght@300..700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-X6KYR46TNZ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-X6KYR46TNZ');
          `}
        </Script>
      </head>
      <body className="antialiased w-full max-w-full overflow-x-hidden">
        <PaymentListener />
        {children}
      </body>
    </html>
  );
}
