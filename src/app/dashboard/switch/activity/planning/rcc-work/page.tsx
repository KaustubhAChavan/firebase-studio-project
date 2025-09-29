
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function RccWorkPage() {
  const router = useRouter();

  return (
    <>
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div>
        <h2 className="text-xl font-semibold">RCC Work</h2>
        <p className="text-muted-foreground">Manage RCC work planning here.</p>
      </div>
    </>
  );
}
