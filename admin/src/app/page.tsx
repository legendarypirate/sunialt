'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { admin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(admin ? '/dashboard' : '/login');
  }, [admin, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}
