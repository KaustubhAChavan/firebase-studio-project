
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrintBillPage() {
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
        <h2 className="text-xl font-semibold">Print Bill</h2>
        <p className="text-muted-foreground">Generate and print bills here.</p>
      </div>
    </>
  );
}
