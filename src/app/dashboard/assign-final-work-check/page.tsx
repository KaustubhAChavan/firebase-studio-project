
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, ChecklistPoint } from '@/context/AppContext';
import { withAuthorization } from '@/components/with-authorization';

const pointSchema = z.object({
  point: z.string().min(1, 'Checklist point cannot be empty.'),
});

function AssignFinalWorkCheckPageComponent() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    workTiles,
    defaultTasksByTile,
    allWorkData,
    selectedProject,
    finalChecklists,
    setFinalChecklists,
  } = useAppContext();

  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof pointSchema>>({
    resolver: zodResolver(pointSchema),
    defaultValues: { point: '' },
  });

  const tasksForSelectedTile = useMemo(() => {
    if (!selectedTileId) return [];
    
    const allTasks = new Map<string, { id: string; label: string }>();

    if (defaultTasksByTile[selectedTileId]) {
      defaultTasksByTile[selectedTileId].forEach(task => allTasks.set(task.id, task));
    }
    
    const projectWorkItems = allWorkData.filter((w) => w.projectName === selectedProject && w.workTileId === selectedTileId);
    projectWorkItems.forEach((work) => {
        work.customTasks?.forEach((task) => {
            if (!allTasks.has(task.id)) allTasks.set(task.id, task);
        });
    });

    return Array.from(allTasks.values());
  }, [selectedTileId, defaultTasksByTile, allWorkData, selectedProject]);

  const handleAddPoint = (data: z.infer<typeof pointSchema>) => {
    if (!selectedTileId || !activeTaskId) return;

    const newPoint: ChecklistPoint = { id: crypto.randomUUID(), point: data.point };

    setFinalChecklists(prev => {
      const tileId = selectedTileId;
      const taskId = activeTaskId;
      const prevTasks = prev[tileId] || {};
      const prevPoints = prevTasks[taskId] || [];

      return {
        ...prev,
        [tileId]: {
          ...prevTasks,
          [taskId]: [...prevPoints, newPoint],
        },
      };
    });

    toast({ title: 'Success!', description: 'Checklist point added.' });
    form.reset();
    setIsDialogOpen(false);
  };
  
  const handleDeletePoint = (taskId: string, pointId: string) => {
    if (!selectedTileId) return;

    setFinalChecklists(prev => {
      const tileId = selectedTileId;
      const prevTasks = prev[tileId];

      if (!prevTasks?.[taskId]) {
        return prev;
      }

      const newPoints = prevTasks[taskId].filter(p => p.id !== pointId);

      return {
        ...prev,
        [tileId]: {
          ...prevTasks,
          [taskId]: newPoints,
        },
      };
    });
     toast({ variant: "destructive", title: 'Deleted!', description: 'Checklist point removed.' });
  }

  return (
    <>
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Assign Final Work Checklists</CardTitle>
          <CardDescription>
            Select a work tile to define checklist points for each of its tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select onValueChange={setSelectedTileId}>
            <SelectTrigger className="w-full md:w-1/2">
              <SelectValue placeholder="Select a Work Tile" />
            </SelectTrigger>
            <SelectContent>
              {workTiles.map(tile => <SelectItem key={tile.id} value={tile.id}>{tile.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {selectedTileId && (
            <Accordion type="single" collapsible className="w-full">
              {tasksForSelectedTile.length > 0 ? tasksForSelectedTile.map(task => (
                <AccordionItem value={task.id} key={task.id}>
                  <AccordionTrigger>{task.label}</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                        {finalChecklists[selectedTileId]?.[task.id]?.length > 0 ? (
                           finalChecklists[selectedTileId][task.id].map(point => (
                             <div key={point.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                               <p className="text-sm">{point.point}</p>
                               <Button variant="ghost" size="icon" onClick={() => handleDeletePoint(task.id, point.id)}>
                                 <Trash2 className="h-4 w-4 text-destructive" />
                               </Button>
                             </div>
                           ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-2">No checklist points defined for this task.</p>
                        )}
                       <Button variant="outline" size="sm" onClick={() => { setActiveTaskId(task.id); setIsDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Checklist Point
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )) : (
                <p className="text-muted-foreground text-center p-4">No tasks found for this work tile.</p>
              )}
            </Accordion>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Checklist Point</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddPoint)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="point"
                render={({ field }) => (
                  <FormItem>
                    <Input {...field} placeholder="e.g., Check for cracks and damages" />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter><Button type="submit">Add Point</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default withAuthorization(AssignFinalWorkCheckPageComponent);
