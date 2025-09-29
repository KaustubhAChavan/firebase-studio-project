
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function RccWorkInProgressPage() {
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
        <h2 className="text-xl font-semibold">RCC Work In Process</h2>
        <p className="text-muted-foreground">Manage RCC work in process here.</p>
      </div>
    </>
  );
}
