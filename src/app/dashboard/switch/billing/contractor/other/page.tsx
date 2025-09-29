
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Image as ImageIcon, Printer } from 'lucide-react';
import { useAppContext, ContractorBillData, WorkPlanData, WorkRateData, PhotoWithMetaData, ExtraWorkData, ExtraWorkTaskData } from '@/context/AppContext';
import React, { useMemo, useState, useEffect } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

const billFormSchema = z.object({
  advancePayment: z.coerce.number().min(0).default(0),
  penalty: z.coerce.number().min(0).default(0),
  holdAmount: z.coerce.number().min(0).default(0),
});

type BillableTask = {
  id: string; // Composite key: planId-flatNo-taskId for standard, or planId-taskId for extra
  planId: string;
  type: 'standard' | 'extra';
  workTile: string;
  buildingName?: string;
  flatNo?: string;
  flatType?: string;
  taskId: string;
  taskLabel: string;
  rate: number;
  photos: PhotoWithMetaData[];
};

const PrintableBill = React.memo(function PrintableBill({ bill }: { bill: ContractorBillData }) {
  const { companies } = useAppContext();
  const company = companies[0];

  return (
    <div id="printable-bill" className="hidden print:block p-8 font-sans bg-white text-black text-xs">
      <div className="flex flex-col justify-between min-h-[95vh]">
        <header>
          <div className="flex justify-between items-start pb-2 mb-2 border-b-2 border-black">
            <div>
              <h1 className="text-2xl font-bold">{company.companyName}</h1>
              <p className="text-xs">{company.companyAddress}</p>
              <p className="text-xs">Email: {company.email} | Contact: {company.contactNo}</p>
              <p className="text-xs">GSTIN: {company.gstNo}</p>
            </div>
            <h2 className="text-3xl font-bold text-gray-700">BILL</h2>
          </div>

          <section className="grid grid-cols-2 gap-4 my-2 text-xs">
            <div>
              <h3 className="font-bold mb-1">Bill To:</h3>
              <p>{bill.contractorName}</p>
            </div>
            <div className="text-right">
              <p><span className="font-bold">Bill No:</span> {bill.billNumber}</p>
              <p><span className="font-bold">Date:</span> {format(bill.date, 'PP')}</p>
              <p><span className="font-bold">Project:</span> {bill.projectName}</p>
            </div>
          </section>
        </header>

        <main className="flex-grow">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1 border border-gray-300 w-8">#</th>
                <th className="p-1 border border-gray-300">Task Description</th>
                <th className="p-1 border border-gray-300 text-right w-24">Rate</th>
              </tr>
            </thead>
            <tbody>
              {bill.billedItems.map((item, index) => (
                <tr key={index} className="break-inside-avoid">
                  <td className="py-0.5 px-1 border border-gray-300 align-top">{index + 1}</td>
                  <td className="py-0.5 px-1 border border-gray-300">
                    <div className="font-medium">{item.taskLabel}</div>
                    <div className="text-[10px] text-gray-500">{item.workTile} - Flat {item.flatNo || 'N/A'}</div>
                  </td>
                  <td className="py-0.5 px-1 border border-gray-300 text-right font-mono align-top">₹{item.rate.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>

        <footer>
            <section className="flex justify-end mt-2">
                <div className="w-2/5 text-xs">
                <div className="flex justify-between p-1 bg-gray-50">
                    <span>Total Amount</span>
                    <span className="font-mono font-medium">₹{bill.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-1">
                    <span>Advance</span>
                    <span className="font-mono">- ₹{bill.advancePayment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-1">
                    <span>Penalty</span>
                    <span className="font-mono">- ₹{bill.penalty.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-1">
                    <span>Hold Amount</span>
                    <span className="font-mono">- ₹{bill.holdAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-1 mt-1 border-t-2 border-black font-bold text-sm">
                    <span>Net Payable</span>
                    <span className="font-mono">₹{bill.netPayable.toFixed(2)}</span>
                </div>
                </div>
            </section>
            <div className="mt-4 text-center text-[10px] text-gray-500">
                <p>This is a computer-generated bill.</p>
            </div>
        </footer>
      </div>
    </div>
  );
});


export default function ContractorOtherBillingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    selectedProject,
    workPlans,
    setWorkPlans,
    extraWorkPlans,
    setExtraWorkPlans,
    workRates,
    setContractorBills,
    workTiles,
    flats,
  } = useAppContext();

  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [photosToShow, setPhotosToShow] = useState<PhotoWithMetaData[]>([]);
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [billToPrint, setBillToPrint] = useState<ContractorBillData | null>(null);
  const [editableTasks, setEditableTasks] = useState<BillableTask[]>([]);

  useEffect(() => {
    if (billToPrint) {
      const timer = setTimeout(() => {
        window.print();
        setBillToPrint(null);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [billToPrint]);

  const form = useForm<z.infer<typeof billFormSchema>>({
    resolver: zodResolver(billFormSchema),
    defaultValues: { advancePayment: 0, penalty: 0, holdAmount: 0 },
  });

  const getTaskLabel = (workTileId: string, taskId: string) => {
    const tile = workTiles.find(t => t.id === workTileId);
    const task = tile?.tasks?.find(t => t.id === taskId);
    return task?.label || 'Unknown Task';
  };

  const getRateForTask = (plan: WorkPlanData, taskId: string, flatType: string): number => {
    const workTileId = workTiles.find(t => t.name === plan.workTile)?.id;
    if (!workTileId) return 0;

    const rate = workRates.find(r =>
      r.projectName === plan.projectName &&
      r.buildingName === plan.buildingName &&
      r.contractorName === plan.contractorName &&
      r.workTileId === workTileId &&
      r.taskId === taskId &&
      r.flatType === flatType
    );
    return rate?.rate || 0;
  };

  const billableTasksByContractor = useMemo(() => {
    const tasksByContractor: Record<string, BillableTask[]> = {};

    const addOrInitializeContractor = (name: string) => {
      if (!tasksByContractor[name]) {
        tasksByContractor[name] = [];
      }
    };
    
    // Process standard work plans
    workPlans
      .filter(p => p.projectName === selectedProject)
      .forEach(plan => {
        addOrInitializeContractor(plan.contractorName);

        const workTileId = workTiles.find(t => t.name === plan.workTile)?.id || '';

        plan.flatPlans.forEach(fp => {
          Object.entries(fp.tasks).forEach(([taskId, taskDetails]) => {
            if (taskDetails.finalCheckStatus === 'approved' && !taskDetails.billed) {
              const flatDetails = flats.find(f => f.projectName === plan.projectName && f.buildingName === plan.buildingName && f.flatNo === fp.flatNo);
              if (!flatDetails) return;

              const rate = getRateForTask(plan, taskId, flatDetails.type);
              if (rate > 0) {
                tasksByContractor[plan.contractorName].push({
                  id: `${plan.id}-${fp.flatNo}-${taskId}`,
                  planId: plan.id,
                  type: 'standard',
                  workTile: plan.workTile,
                  buildingName: plan.buildingName,
                  flatNo: fp.flatNo,
                  flatType: flatDetails.type,
                  taskId,
                  taskLabel: getTaskLabel(workTileId, taskId),
                  rate,
                  photos: taskDetails.updates?.flatMap(u => u.photos || []) || [],
                });
              }
            }
          });
        });
      });

    // Process extra work plans
    extraWorkPlans
      .filter(p => p.projectName === selectedProject)
      .forEach(plan => {
          addOrInitializeContractor(plan.contractorName);
          plan.tasks.forEach(task => {
            if (task.finalCheckStatus === 'approved' && !task.billed) {
                tasksByContractor[plan.contractorName].push({
                    id: `${plan.id}-${task.id}`,
                    planId: plan.id,
                    type: 'extra',
                    workTile: 'Extra Work',
                    taskId: task.id,
                    taskLabel: task.taskDescription,
                    rate: task.rate,
                    photos: task.updates?.flatMap(u => u.photos || []) || [],
                });
            }
          });
      });

    Object.keys(tasksByContractor).forEach(contractor => {
      if (tasksByContractor[contractor].length === 0) {
        delete tasksByContractor[contractor];
      }
    });

    return tasksByContractor;
  }, [workPlans, extraWorkPlans, selectedProject, workRates, workTiles, flats]);

  const contractorsWithBillableWork = Object.keys(billableTasksByContractor);

  useEffect(() => {
    if (selectedContractor) {
      setEditableTasks(billableTasksByContractor[selectedContractor] || []);
    } else {
      setEditableTasks([]);
    }
  }, [selectedContractor, billableTasksByContractor]);

  const totalAmount = useMemo(() => {
    if (!selectedContractor) return 0;
    return Array.from(selectedTaskIds).reduce((sum, taskId) => {
        const task = editableTasks.find(t => t.id === taskId);
        return sum + (task?.rate || 0);
    }, 0);
  }, [selectedTaskIds, selectedContractor, editableTasks]);

  const { advancePayment, penalty, holdAmount } = form.watch();
  const netPayable = totalAmount - advancePayment - penalty - holdAmount;

  const handleCreateBill = (contractorName: string) => {
    setSelectedContractor(contractorName);
    setIsBillDialogOpen(true);
  };
  
  const generateBillLogic = (data: z.infer<typeof billFormSchema>): ContractorBillData | null => {
    if (!selectedContractor || !selectedProject || selectedTaskIds.size === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a contractor and at least one task.' });
      return null;
    }

    const tasksToBill = editableTasks.filter(t => selectedTaskIds.has(t.id));

    const newBill: ContractorBillData = {
      id: crypto.randomUUID(),
      billNumber: `BILL-${Date.now().toString().slice(-6)}`,
      contractorName: selectedContractor,
      projectName: selectedProject,
      date: new Date(),
      billedItems: tasksToBill.map(t => ({
          planId: t.planId,
          workTile: t.workTile,
          flatNo: t.flatNo || 'N/A',
          taskId: t.taskId,
          taskLabel: t.taskLabel,
          rate: t.rate,
          photos: t.photos.map(p => p.dataUri),
      })),
      totalAmount,
      advancePayment: data.advancePayment,
      penalty: data.penalty,
      holdAmount: data.holdAmount,
      netPayable,
    };

    setContractorBills(prev => [...prev, newBill]);
    
    // Mark standard tasks as billed
    setWorkPlans(prevPlans => 
      prevPlans.map(plan => {
        const planHasBilledTask = tasksToBill.some(t => t.type === 'standard' && t.planId === plan.id);
        if (!planHasBilledTask) return plan;

        return {
          ...plan,
          flatPlans: plan.flatPlans.map(fp => {
            const flatHasBilledTask = tasksToBill.some(t => t.planId === plan.id && t.flatNo === fp.flatNo);
            if (!flatHasBilledTask) return fp;
            
            const newTasks = { ...fp.tasks };
            tasksToBill.forEach(billedTask => {
              if (billedTask.planId === plan.id && billedTask.flatNo === fp.flatNo) {
                if (newTasks[billedTask.taskId]) {
                  newTasks[billedTask.taskId] = { ...newTasks[billedTask.taskId], billed: true };
                }
              }
            });
            return { ...fp, tasks: newTasks };
          })
        };
      })
    );

    // Mark extra work as billed
    setExtraWorkPlans(prevPlans => prevPlans.map(plan => {
        const planHasBilledTask = tasksToBill.some(t => t.type === 'extra' && t.planId === plan.id);
        if (!planHasBilledTask) return plan;

        return {
            ...plan,
            tasks: plan.tasks.map(task => {
                const wasBilled = tasksToBill.some(bt => bt.planId === plan.id && bt.taskId === task.id);
                return wasBilled ? { ...task, billed: true } : task;
            }),
        };
    }));

    toast({ title: 'Success!', description: `Bill ${newBill.billNumber} has been generated.` });
    
    return newBill;
  };

  const handleGenerateBill = (data: z.infer<typeof billFormSchema>) => {
    generateBillLogic(data);
    setIsBillDialogOpen(false);
    setSelectedContractor(null);
    setSelectedTaskIds(new Set());
    form.reset();
  };

  const handleGenerateAndPrintBill = (data: z.infer<typeof billFormSchema>) => {
    const newBill = generateBillLogic(data);
    if (newBill) {
      setBillToPrint(newBill);
    }
    setIsBillDialogOpen(false);
    setSelectedContractor(null);
    setSelectedTaskIds(new Set());
    form.reset();
  };

  const handleRateChange = (taskId: string, newRate: number) => {
    setEditableTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, rate: newRate } : task))
    );
  };

  return (
    <>
      <div className="space-y-8 print:hidden">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Create Contractor Bill</CardTitle>
            <CardDescription>Select a contractor with verified &amp; completed tasks to generate a bill for project: {selectedProject}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractorsWithBillableWork.length > 0 ? (
                  contractorsWithBillableWork.map(name => (
                    <TableRow key={name}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => handleCreateBill(name)}>Create Bill</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={2} className="text-center h-24">No contractors have verified tasks ready for billing.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isBillDialogOpen} onOpenChange={(open) => {
          if (!open) {
              setSelectedContractor(null);
              setSelectedTaskIds(new Set());
              setEditableTasks([]);
              form.reset();
          }
          setIsBillDialogOpen(open);
      }}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Create Bill for {selectedContractor}</DialogTitle>
            <DialogDescription>Select the verified &amp; completed tasks to include in this bill.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-h-[70vh]">
             <div className="lg:col-span-3">
                <h3 className="font-semibold mb-2">Select Billable Tasks</h3>
                <div className="space-y-2 rounded-md border p-2 h-full overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                             <Checkbox
                                checked={selectedTaskIds.size > 0 && selectedTaskIds.size === editableTasks.length}
                                onCheckedChange={(checked) => {
                                    const newSet = new Set<string>();
                                    if (checked) {
                                        editableTasks.forEach(t => newSet.add(t.id));
                                    }
                                    setSelectedTaskIds(newSet);
                                }}
                            />
                          </TableHead>
                          <TableHead>Work / Flat / Task</TableHead>
                          <TableHead className="w-32">Rate</TableHead>
                          <TableHead>Photos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editableTasks.map(task => (
                           <TableRow key={task.id}>
                              <TableCell>
                                <Checkbox
                                    checked={selectedTaskIds.has(task.id)}
                                    onCheckedChange={(checked) => {
                                        const newSet = new Set(selectedTaskIds);
                                        if (checked) {
                                            newSet.add(task.id);
                                        } else {
                                            newSet.delete(task.id);
                                        }
                                        setSelectedTaskIds(newSet);
                                    }}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{task.workTile}</div>
                                <div className="text-sm text-muted-foreground">
                                    {task.flatNo ? `Flat ${task.flatNo} - ` : ''} 
                                    {task.taskLabel}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={task.rate}
                                  onChange={(e) => handleRateChange(task.id, parseFloat(e.target.value) || 0)}
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell>
                                  <Button type="button" variant="outline" size="sm" disabled={task.photos.length === 0} onClick={() => { setPhotosToShow(task.photos); setIsPhotoDialogOpen(true); }}>
                                      <ImageIcon className="mr-2 h-4 w-4"/> View ({task.photos.length})
                                  </Button>
                              </TableCell>
                           </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                </div>
             </div>
             <div className="lg:col-span-2">
                <h3 className="font-semibold mb-2">Financial Summary</h3>
                <Form {...form}>
                    <form className="space-y-4 rounded-md border p-4">
                        <div className="flex justify-between font-medium"><span>Total Amount:</span><span>₹{totalAmount.toFixed(2)}</span></div>
                        <FormField control={form.control} name="advancePayment" render={({ field }) => (
                            <FormItem><div className="flex items-center justify-between"><FormLabel>Advance</FormLabel><FormControl><Input type="number" className="w-32" {...field} /></FormControl></div><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="penalty" render={({ field }) => (
                            <FormItem><div className="flex items-center justify-between"><FormLabel>Penalty</FormLabel><FormControl><Input type="number" className="w-32" {...field} /></FormControl></div><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="holdAmount" render={({ field }) => (
                            <FormItem><div className="flex items-center justify-between"><FormLabel>Hold Amount</FormLabel><FormControl><Input type="number" className="w-32" {...field} /></FormControl></div><FormMessage /></FormItem>
                        )} />
                        <hr/>
                        <div className="flex justify-between font-bold text-lg"><span>Net Payable:</span><span>₹{netPayable.toFixed(2)}</span></div>
                    </form>
                </Form>
             </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={form.handleSubmit(handleGenerateBill)} disabled={selectedTaskIds.size === 0}>Generate Bill</Button>
            <Button type="button" onClick={form.handleSubmit(handleGenerateAndPrintBill)} disabled={selectedTaskIds.size === 0}>Generate Bill &amp; Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPhotoDialogOpen} onOpenChange={setIsPhotoDialogOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle>Work Photos</DialogTitle></DialogHeader>
            <Carousel className="w-full">
                <CarouselContent>
                    {photosToShow.map((photo, index) => (
                        <CarouselItem key={index}>
                            <div className="p-1"><Card><CardContent className="flex aspect-video items-center justify-center p-6 relative">
                               <Image src={photo.dataUri} alt={`Task Photo ${index + 1}`} fill style={{objectFit: 'contain'}} />
                            </CardContent></Card></div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {photosToShow.length > 1 && <><CarouselPrevious /><CarouselNext /></>}
            </Carousel>
        </DialogContent>
      </Dialog>
      {billToPrint && <PrintableBill bill={billToPrint} />}
    </>
  );
}
