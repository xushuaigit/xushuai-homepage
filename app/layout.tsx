import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const configuredBasePath = process.env.PAGES_BASE_PATH ?? '/xushuai-homepage';
const basePath = configuredBasePath === '/' ? '' : configuredBasePath.replace(/\/$/u, '');

export const metadata: Metadata = {
  icons: { icon: `${basePath}/favicon.svg` },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
