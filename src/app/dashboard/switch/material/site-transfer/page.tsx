
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, FileDown, Search, CalendarIcon } from 'lucide-react';
import { useAppContext, SiteTransferData } from '@/context/AppContext';
import { useState, useMemo } from 'react';
import * as z from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Textarea } from '@/components/ui/textarea';
import { Pagination } from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';


const PAGE_SIZE = 40;

const transferItemSchema = z.object({
  materialName: z.string().min(1, "Please select a material."),
  quantity: z.coerce.number().positive("Quantity must be positive."),
});

const formSchema = z.object({
  fromProject: z.string(),
  toProject: z.string().min(1, 'Please select a destination project.'),
  items: z.array(transferItemSchema).min(1, "Please add at least one material."),
  remarks: z.string().optional(),
}).refine(data => data.fromProject !== data.toProject, {
    message: 'Source and destination projects cannot be the same.',
    path: ['toProject'],
});

export default function SiteTransferPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { selectedProject, inventory, setInventory, projects, siteTransfers, setSiteTransfers, materials } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<SiteTransferData | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterFromProject, setFilterFromProject] = useState('all');
  const [filterToProject, setFilterToProject] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);

  const projectInventory = useMemo(() =>
    inventory.filter(item => item.project === selectedProject && item.currentStock > 0),
    [inventory, selectedProject]
  );
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromProject: selectedProject || '',
      toProject: '',
      items: [{ materialName: '', quantity: 0 }],
      remarks: '',
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  const watchedItems = form.watch('items');

  const getStock = (materialName: string) => {
    const item = projectInventory.find(i => i.materialName === materialName);
    return item ? item.currentStock : 0;
  };
  
  const getUnitForMaterial = (materialName: string) => {
    return materials.find(m => m.materialName === materialName)?.unit || '';
  };

  const filteredTransfers = useMemo(() => {
      return siteTransfers
        .filter(t => filterFromProject === 'all' || t.fromProject === filterFromProject)
        .filter(t => filterToProject === 'all' || t.toProject === filterToProject)
        .filter(t => {
            if (!dateRange?.from) return true;
            const from = dateRange.from;
            const to = dateRange.to || from;
            const transferDate = new Date(t.date).setHours(0,0,0,0);
            return transferDate >= new Date(from).setHours(0,0,0,0) && transferDate <= new Date(to).setHours(0,0,0,0);
        })
        .filter(t => 
            searchTerm === '' ||
            t.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.fromProject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.toProject.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [siteTransfers, searchTerm, dateRange, filterFromProject, filterToProject]);
  
  const totalPages = Math.ceil(filteredTransfers.length / PAGE_SIZE);
  const paginatedTransfers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredTransfers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredTransfers, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    let hasError = false;
    data.items.forEach((item, index) => {
      const stock = getStock(item.materialName);
      if (item.quantity > stock) {
        form.setError(`items.${index}.quantity`, { type: "manual", message: `Cannot transfer more than stock (${stock}).` });
        hasError = true;
      }
    });

    if (hasError) {
      toast({ variant: "destructive", title: "Validation Error", description: "One or more items exceed available stock." });
      return;
    }

    setInventory(prevInventory => {
      const newInventory = [...prevInventory];
      data.items.forEach(transferItem => {
        const fromItemIndex = newInventory.findIndex(i => i.materialName === transferItem.materialName && i.project === data.fromProject);
        if (fromItemIndex !== -1) {
          const updatedFromItem = {...newInventory[fromItemIndex]};
          updatedFromItem.currentStock -= transferItem.quantity;
          newInventory[fromItemIndex] = updatedFromItem;
        }
      });
      return newInventory;
    });

    const newTransfer: SiteTransferData = {
        id: crypto.randomUUID(),
        transferNumber: `TRN-${Date.now().toString().slice(-6)}`,
        date: new Date(),
        fromProject: data.fromProject,
        toProject: data.toProject,
        items: data.items.map(item => ({...item, rate: 0})), // Rate is 0 for transfers
        status: 'In Transit',
        remarks: data.remarks,
    };
    setSiteTransfers(prev => [...prev, newTransfer]);

    toast({
      title: 'Transfer Initiated!',
      description: `Materials are now in transit to ${data.toProject}. The destination project must create a GRN to receive them.`,
    });
    
    form.reset({ fromProject: selectedProject || '', toProject: '', items: [{ materialName: '', quantity: 0 }], remarks: '' });
    setIsDialogOpen(false);
  };
  
  const getStatusColor = (status: SiteTransferData['status']) => {
    switch (status) {
      case 'In Transit': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Partially Received': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleExport = () => {
    const dataToExport = filteredTransfers.flatMap(transfer => 
        transfer.items.map(item => ({
            'Date': format(transfer.date, 'yyyy-MM-dd'),
            'Transfer No.': transfer.transferNumber,
            'From Project': transfer.fromProject,
            'To Project': transfer.toProject,
            'Status': transfer.status,
            'Material': item.materialName,
            'Quantity': item.quantity,
            'Unit': getUnitForMaterial(item.materialName),
            'Remarks': transfer.remarks || '',
        }))
    );
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Site Transfers');
    XLSX.writeFile(workbook, `site_transfers_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!selectedProject) {
    return <p>Please select a project first.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
                <FileDown className="mr-2 h-4 w-4" /> Download Excel
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Transfer
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                <DialogTitle>Site to Site Material Transfer</DialogTitle>
                <DialogDescription>
                    Transfer materials from the current project ({selectedProject}) to another.
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="fromProject" render={({ field }) => (
                        <FormItem>
                        <FormLabel>From Project</FormLabel>
                        <FormControl>
                            <Input {...field} disabled />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="toProject" render={({ field }) => (
                        <FormItem>
                        <FormLabel>To Project</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger></FormControl>
                            <SelectContent>
                            {projects.filter(p => p.projectName !== selectedProject).map(p => 
                                <SelectItem key={p.projectName} value={p.projectName}>{p.projectName}</SelectItem>
                            )}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                    </div>
                    
                    <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md">
                        <FormField control={form.control} name={`items.${index}.materialName`} render={({ field }) => (
                            <FormItem className="col-span-5"><FormLabel>Material</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger></FormControl>
                                <SelectContent>{projectInventory.map(m => <SelectItem key={m.materialName} value={m.materialName}>{m.materialName}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                            <FormItem className="col-span-3"><FormLabel>Transfer Qty</FormLabel>
                            <FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage />
                            </FormItem>
                        )} />
                        <div className="col-span-3 pt-8 text-sm text-muted-foreground">Available: {getStock(watchedItems[index]?.materialName)}</div>
                        <div className="col-span-1 flex items-end h-full">
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        </div>
                    ))}
                    </div>
                    <FormField control={form.control} name="remarks" render={({ field }) => (
                        <FormItem><FormLabel>Remarks</FormLabel>
                            <FormControl><Textarea placeholder="Add any notes about this transfer..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ materialName: '', quantity: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Another Material
                    </Button>
                    <DialogFooter><Button type="submit">Submit Transfer</Button></DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        </div>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>Transfer History</CardTitle>
            <CardDescription>A log of all materials transferred between sites.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="flex flex-col gap-4 mb-6">
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Search by Transfer No. or Project..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        />
                    </div>
                     <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn("flex-1 min-w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Filter by date</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                 </div>
                 <div className="flex flex-wrap items-center gap-4">
                    <Select value={filterFromProject} onValueChange={setFilterFromProject}>
                        <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filter by Source Project" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Source Projects</SelectItem>
                            {projects.map(p => <SelectItem key={p.projectName} value={p.projectName}>{p.projectName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={filterToProject} onValueChange={setFilterToProject}>
                        <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filter by Destination Project" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Destination Projects</SelectItem>
                            {projects.map(p => <SelectItem key={p.projectName} value={p.projectName}>{p.projectName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
             <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Transfer No.</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                    {paginatedTransfers.length > 0 ? (
                        paginatedTransfers.map(record => (
                            <TableRow key={record.id} className="cursor-pointer" onClick={() => { setSelectedTransfer(record); setIsDetailsOpen(true);}}>
                                <TableCell>{format(record.date, 'PP')}</TableCell>
                                <TableCell>{record.transferNumber}</TableCell>
                                <TableCell>{record.fromProject}</TableCell>
                                <TableCell>{record.toProject}</TableCell>
                                <TableCell>{record.items.length}</TableCell>
                                <TableCell><Badge variant="outline" className={getStatusColor(record.status)}>{record.status}</Badge></TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center">No transfers match the current filters.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
        </CardContent>
       </Card>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transfer Details</DialogTitle>
                    {selectedTransfer && (
                        <DialogDescription>
                            From: {selectedTransfer.fromProject} | To: {selectedTransfer.toProject} | Date: {format(selectedTransfer.date, 'PP')}
                        </DialogDescription>
                    )}
                </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-4">
                <Table>
                    <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Unit</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {selectedTransfer?.items.map((item, index) => (
                            <TableRow key={index}><TableCell>{item.materialName}</TableCell><TableCell className="text-right">{item.quantity}</TableCell><TableCell className="text-right">{getUnitForMaterial(item.materialName)}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
                {selectedTransfer?.remarks && (
                    <div>
                        <h4 className="font-semibold">Remarks:</h4>
                        <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">{selectedTransfer.remarks}</p>
                    </div>
                )}
            </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
