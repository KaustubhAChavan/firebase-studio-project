
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext, WorkRateData } from '@/context/AppContext';

const selectionSchema = z.object({
  workTileId: z.string().min(1, 'Please select a work tile.'),
  buildingName: z.string().min(1, 'Please select a building.'),
  contractorName: z.string().min(1, 'Please select a contractor.'),
  flatType: z.string().min(1, 'Please select a flat type.'),
});

const ratesFormSchema = z.object({
  rates: z.array(z.object({
    taskId: z.string(),
    taskLabel: z.string(),
    rate: z.coerce.number().min(0, 'Rate must be a positive number.'),
  })),
});

export default function OtherWorkAmountPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    selectedProject,
    workTiles,
    buildings,
    suppliers,
    workRates,
    setWorkRates,
    allWorkData,
    defaultTasksByTile,
    flatTypes,
  } = useAppContext();

  const [selection, setSelection] = useState<z.infer<typeof selectionSchema> | null>(null);
  
  const selectionForm = useForm<z.infer<typeof selectionSchema>>({
    resolver: zodResolver(selectionSchema),
  });
  
  const ratesForm = useForm<z.infer<typeof ratesFormSchema>>({
    resolver: zodResolver(ratesFormSchema),
    defaultValues: { rates: [] },
  });

  const { fields, replace } = useFieldArray({
    control: ratesForm.control,
    name: "rates",
  });
  
  const projectBuildings = useMemo(() => buildings.filter(b => b.projectName === selectedProject), [buildings, selectedProject]);
  const projectContractors = useMemo(() => suppliers.filter(s => s.supplierType.includes('Contractor')), [suppliers]);

  const tasksForSelectedTile = useMemo(() => {
    if (!selection?.workTileId) return [];
    
    const allTasks = new Map<string, { id: string; label: string }>();
    const tileId = selection.workTileId;

    if (tileId && defaultTasksByTile[tileId]) {
      defaultTasksByTile[tileId].forEach(task => allTasks.set(task.id, task));
    }
    
    const projectWorkItems = allWorkData.filter((w) => w.projectName === selectedProject && w.workTileId === tileId);

    projectWorkItems.forEach((work) => {
        work.customTasks?.forEach((task) => {
            if (!allTasks.has(task.id)) {
                allTasks.set(task.id, task);
            }
        });
    });

    return Array.from(allTasks.values());
  }, [selection, workTiles, defaultTasksByTile, allWorkData, selectedProject]);
  
  useEffect(() => {
    if (selection) {
      const newRates = tasksForSelectedTile.map(task => {
        const existingRate = workRates.find(r => 
          r.projectName === selectedProject &&
          r.buildingName === selection.buildingName &&
          r.workTileId === selection.workTileId &&
          r.taskId === task.id &&
          r.contractorName === selection.contractorName &&
          r.flatType === selection.flatType
        );
        return {
          taskId: task.id,
          taskLabel: task.label,
          rate: existingRate?.rate || 0,
        };
      });
      replace(newRates);
    }
  }, [selection, tasksForSelectedTile, workRates, replace, selectedProject]);

  const handleShowTasks = (data: z.infer<typeof selectionSchema>) => {
    setSelection(data);
  };
  
  const onRatesSubmit = (data: z.infer<typeof ratesFormSchema>) => {
    if (!selection || !selectedProject) return;

    const newWorkRates: WorkRateData[] = data.rates.map(rateData => ({
      id: `${selectedProject}-${selection.buildingName}-${selection.workTileId}-${selection.contractorName}-${selection.flatType}-${rateData.taskId}`,
      projectName: selectedProject,
      buildingName: selection.buildingName,
      workTileId: selection.workTileId,
      contractorName: selection.contractorName,
      flatType: selection.flatType,
      taskId: rateData.taskId,
      rate: rateData.rate,
    }));

    setWorkRates(prev => {
      const otherRates = prev.filter(r => 
        !(r.projectName === selectedProject &&
          r.buildingName === selection.buildingName &&
          r.workTileId === selection.workTileId &&
          r.contractorName === selection.contractorName &&
          r.flatType === selection.flatType
        )
      );
      return [...otherRates, ...newWorkRates.filter(r => r.rate > 0)];
    });

    toast({
      title: 'Success!',
      description: `Rates for ${workTiles.find(t => t.id === selection.workTileId)?.name} (${selection.flatType}) have been saved.`,
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Set Other Work Amount</CardTitle>
          <CardDescription>Select a tile, building, contractor and flat type to set task rates for project: {selectedProject}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...selectionForm}>
            <form onSubmit={selectionForm.handleSubmit(handleShowTasks)} className="flex flex-col md:flex-row gap-4 items-end">
              <FormField control={selectionForm.control} name="workTileId" render={({ field }) => (
                <FormItem className="flex-1"><FormLabel>Work Tile</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a tile" /></SelectTrigger></FormControl>
                    <SelectContent>{workTiles.map(tile => <SelectItem key={tile.id} value={tile.id}>{tile.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={selectionForm.control} name="buildingName" render={({ field }) => (
                <FormItem className="flex-1"><FormLabel>Building</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a building" /></SelectTrigger></FormControl>
                    <SelectContent>{projectBuildings.map(b => <SelectItem key={b.buildingName} value={b.buildingName}>{b.buildingName}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={selectionForm.control} name="contractorName" render={({ field }) => (
                <FormItem className="flex-1"><FormLabel>Contractor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a contractor" /></SelectTrigger></FormControl>
                    <SelectContent>{projectContractors.map(c => <SelectItem key={c.supplierName} value={c.supplierName}>{c.supplierName}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
               <FormField control={selectionForm.control} name="flatType" render={({ field }) => (
                <FormItem className="flex-1"><FormLabel>Flat Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                    <SelectContent>{flatTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <Button type="submit">Set Rates</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {selection && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Rates for {workTiles.find(t => t.id === selection.workTileId)?.name}</CardTitle>
            <CardDescription>Building: {selection.buildingName} | Contractor: {selection.contractorName} | Flat Type: {selection.flatType}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...ratesForm}>
              <form onSubmit={ratesForm.handleSubmit(onRatesSubmit)} className="space-y-4">
                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader><TableRow><TableHead>Task Name</TableHead><TableHead className="w-[200px]">Rate</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {fields.map((field, index) => (
                        <TableRow key={field.id}>
                            <TableCell><FormLabel>{field.taskLabel}</FormLabel></TableCell>
                            <TableCell>
                            <FormField control={ratesForm.control} name={`rates.${index}.rate`} render={({ field }) => (
                                <FormItem><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </div>
                <Button type="submit">Save All Rates</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
