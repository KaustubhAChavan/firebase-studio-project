'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import Link from 'next/link';

const checklistLinks: Record<string, string> = {
  'electrical-work': "/dashboard/switch/activity/checklist/electrical-work",
};


export default function ChecklistPage() {
  const router = useRouter();
  const { workTiles } = useAppContext();

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
       <div className="space-y-6">
        <div>
            <h2 className="text-2xl font-semibold">Checklist</h2>
            <p className="text-muted-foreground">Select a work type to view its checklist.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {workTiles.map((tile) => {
            const href = checklistLinks[tile.id];
            const isEnabled = !!href;

            return isEnabled ? (
              <Button
                asChild
                key={tile.id}
                variant="outline"
                className="h-24 whitespace-normal p-4 text-center text-sm"
              >
                <Link href={href}>{tile.name}</Link>
              </Button>
            ) : (
              <Button
                key={tile.id}
                variant="outline"
                className="h-24 whitespace-normal p-4 text-center text-sm"
                disabled
              >
                {tile.name}
              </Button>
            );
          })}
        </div>
      </div>
    </>
  );
}
