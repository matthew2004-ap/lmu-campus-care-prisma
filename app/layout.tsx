import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = { title: 'LMU Campus Care', description: 'Landmark University Campus Care — student services, arrival management, lost and found, and hostel support.', icons: { icon: '/assets/landmark-logo.jpeg' } };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
