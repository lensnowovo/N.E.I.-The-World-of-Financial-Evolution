import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Public promotion is withdrawn; /memory/setup remains available to installed clients.
export default function MemoryPage() {
  redirect('/');
}
