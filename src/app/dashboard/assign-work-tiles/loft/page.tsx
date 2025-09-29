'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

export default function LoftRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/assign-work-tiles/custom/loft');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-10">
      <LoaderCircle className="h-8 w-8 animate-spin" />
    </div>
  );
}
