
'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PlusCircle, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAppContext } from '@/context/AppContext';
import { withAuthorization } from "@/components/with-authorization";


const workTileSchema = z.object({
  name: z.string().min(1, 'Tile name is required'),
});

function AssignWorkTilesPageComponent() {
  const router = useRouter();
  const { workTiles, setWorkTiles, setAllWorkData } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteTileId, setDeleteTileId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof workTileSchema>>({
    resolver: zodResolver(workTileSchema),
    defaultValues: {
      name: '',
    },
  });

  function onSubmit(values: z.infer<typeof workTileSchema>) {
    setWorkTiles((prev) => [...prev, { id: crypto.randomUUID(), name: values.name }]);
    form.reset();
  }

  const handleDelete = (tileId: string) => {
    setWorkTiles((prev) => prev.filter((tile) => tile.id !== tileId));
    setAllWorkData((prev) => prev.filter((data) => data.workTileId !== tileId));
    setDeleteTileId(null);
  };


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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold">Assign Work Tiles</h2>
            <p className="text-muted-foreground">Select a work tile to assign.</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Work Tile
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
           {workTiles.map((tile) => (
            <div key={tile.id} className="relative group">
              <Button
                asChild
                variant="outline"
                className="h-24 w-full whitespace-normal p-4 text-center text-sm"
              >
                <Link href={`/dashboard/assign-work-tiles/custom/${tile.id}`}>{tile.name}</Link>
              </Button>
               <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteTileId(tile.id)}
              >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete {tile.name}</span>
              </Button>
            </div>
          ))}
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Work Tile</DialogTitle>
            <DialogDescription>
              Enter a name to add a new work tile. You can delete tiles by hovering over them on the main page.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormLabel className="sr-only">Tile Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Flooring" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Add Tile</Button>
              </form>
            </Form>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={deleteTileId !== null}
        onOpenChange={() => setDeleteTileId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              work tile and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTileId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(deleteTileId!)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default withAuthorization(AssignWorkTilesPageComponent);
