
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, FileDown, Search, CalendarIcon } from 'lucide-react';
import { useAppContext, IssueRecordData, MaterialKitItem } from '@/context/AppContext';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Textarea } from '@/components/ui/textarea';
import { Pagination } from '@/components/ui/pagination';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

const issueItemSchema = z.object({
  materialName: z.string().min(1, "Please select a material."),
  quantity: z.coerce.number().positive("Quantity must be positive."),
});

const itemsFormSchema = z.object({
  contractorName: z.string().min(1, 'Please select a contractor.'),
  buildingName: z.string().min(1, 'Please select a building.'),
  flatNo: z.string().min(1, 'Please select a flat.'),
  items: z.array(issueItemSchema).min(1, "Please add at least one material."),
  remarks: z.string().optional(),
});

const kitFormSchema = z.object({
    contractorName: z.string().min(1, 'Please select a contractor.'),
    buildingName: z.string().min(1, 'Please select a building.'),
    flatNo: z.string().min(1, 'Please select a flat.'),
    kitId: z.string().min(1, 'Please select a kit.'),
    quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
    remarks: z.string().optional(),
});

export default function IssueToContractorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { selectedProject, inventory, setInventory, suppliers, materialKits, issueRecords, setIssueRecords, materials, buildings, flats } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("items");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IssueRecordData | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterContractor, setFilterContractor] = useState('all');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterMaterial, setFilterMaterial] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);

  const projectInventory = useMemo(() =>
    inventory.filter(item => item.project === selectedProject && item.currentStock > 0),
    [inventory, selectedProject]
  );
  
  const projectContractors = useMemo(
    () => suppliers.filter((s) => s.supplierType.includes('Contractor')),
    [suppliers]
  );

  const projectBuildings = useMemo(() => buildings.filter(b => b.projectName === selectedProject), [buildings, selectedProject]);
  
  const itemsForm = useForm<z.infer<typeof itemsFormSchema>>({
    resolver: zodResolver(itemsFormSchema),
    defaultValues: { contractorName: '', buildingName: '', flatNo: '', items: [{ materialName: '', quantity: 0 }], remarks: '' },
  });
  const { fields, append, remove } = useFieldArray({
    control: itemsForm.control,
    name: 'items',
  });
  const watchedItems = itemsForm.watch('items');
  const selectedBuildingForItems = itemsForm.watch('buildingName');
  
  const availableFlatsForItems = useMemo(() => {
    if (!selectedBuildingForItems) return [];
    return flats.filter(f => f.projectName === selectedProject && f.buildingName === selectedBuildingForItems);
  }, [flats, selectedProject, selectedBuildingForItems]);


  const kitForm = useForm<z.infer<typeof kitFormSchema>>({
    resolver: zodResolver(kitFormSchema),
    defaultValues: { contractorName: '', buildingName: '', flatNo: '', kitId: '', quantity: 1, remarks: '' }
  });
  const selectedBuildingForKit = kitForm.watch('buildingName');
  
  const availableFlatsForKit = useMemo(() => {
    if (!selectedBuildingForKit) return [];
    return flats.filter(f => f.projectName === selectedProject && f.buildingName === selectedBuildingForKit);
  }, [flats, selectedProject, selectedBuildingForKit]);

  const getStock = (materialName: string) => {
    const item = projectInventory.find(i => i.materialName === materialName);
    return item ? item.currentStock : 0;
  };

  const getUnitForMaterial = (materialName: string) => {
    return materials.find(m => m.materialName === materialName)?.unit || '';
  };

  const projectIssueRecords = useMemo(
    () => issueRecords.filter(r => r.projectName === selectedProject).sort((a,b) => b.date.getTime() - a.date.getTime()),
    [issueRecords, selectedProject]
  );
  
  const filteredRecords = useMemo(() => {
    return projectIssueRecords
        .filter(record => filterContractor === 'all' || record.contractorName === filterContractor)
        .filter(record => filterBuilding === 'all' || record.buildingName === filterBuilding)
        .filter(record => {
            if (!dateRange?.from) return true;
            const from = dateRange.from;
            const to = dateRange.to || from;
            const recordDate = new Date(record.date).setHours(0,0,0,0);
            return recordDate >= new Date(from).setHours(0,0,0,0) && recordDate <= new Date(to).setHours(0,0,0,0);
        })
        .filter(record => filterMaterial === 'all' || record.items.some(i => i.materialName === filterMaterial))
        .filter(record => searchTerm === '' || record.contractorName.toLowerCase().includes(searchTerm.toLowerCase()) || record.buildingName.toLowerCase().includes(searchTerm.toLowerCase()) || record.flatNo.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [projectIssueRecords, searchTerm, dateRange, filterContractor, filterBuilding, filterMaterial]);


  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredRecords, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  const processIssue = (contractorName: string, buildingName: string, flatNo: string, itemsToIssue: { materialName: string; quantity: number }[], remarks?: string) => {
      setInventory(prevInventory => {
        let newInventory = [...prevInventory];
        itemsToIssue.forEach(issuedItem => {
          const itemIndex = newInventory.findIndex(invItem => invItem.materialName === issuedItem.materialName && invItem.project === selectedProject);
          if (itemIndex !== -1) {
            const updatedItem = {...newInventory[itemIndex]};
            updatedItem.currentStock -= issuedItem.quantity;
            newInventory[itemIndex] = updatedItem;
          }
        });
        return newInventory;
      });

    const newRecord: IssueRecordData = {
        id: crypto.randomUUID(),
        date: new Date(),
        contractorName,
        buildingName,
        flatNo,
        items: itemsToIssue,
        remarks,
        projectName: selectedProject!,
    };
    setIssueRecords(prev => [...prev, newRecord]);
  }

  const onItemsSubmit = (data: z.infer<typeof itemsFormSchema>) => {
    let hasError = false;
    data.items.forEach((item, index) => {
      const stock = getStock(item.materialName);
      if (item.quantity > stock) {
        itemsForm.setError(`items.${index}.quantity`, { type: "manual", message: `Stock: ${stock}` });
        hasError = true;
      }
    });

    if (hasError) {
      toast({ variant: "destructive", title: "Not enough stock", description: "One or more items exceed available stock." });
      return;
    }

    processIssue(data.contractorName, data.buildingName, data.flatNo, data.items, data.remarks);
    toast({ title: 'Success!', description: `Materials have been issued to ${data.contractorName}.` });
    itemsForm.reset({ contractorName: '', buildingName: '', flatNo: '', items: [{ materialName: '', quantity: 0 }], remarks: '' });
    setIsDialogOpen(false);
  };

  const onKitSubmit = (data: z.infer<typeof kitFormSchema>) => {
    const selectedKit = materialKits.find(k => k.id === data.kitId);
    if (!selectedKit) {
        toast({ variant: 'destructive', title: 'Error', description: 'Selected kit not found.' });
        return;
    }
    
    let hasError = false;
    const itemsToIssue: { materialName: string, quantity: number }[] = [];
    selectedKit.items.forEach(kitItem => {
        const stock = getStock(kitItem.materialName);
        const requiredQty = kitItem.quantity * data.quantity;
        if (requiredQty > stock) {
            kitForm.setError('quantity', { type: 'manual', message: `Not enough ${kitItem.materialName}. Required: ${requiredQty}, Available: ${stock}` });
            hasError = true;
        }
        itemsToIssue.push({ materialName: kitItem.materialName, quantity: requiredQty });
    });

    if (hasError) {
        toast({ variant: 'destructive', title: 'Not enough stock', description: 'Insufficient stock for one or more items in the kit.' });
        return;
    }

    processIssue(data.contractorName, data.buildingName, data.flatNo, itemsToIssue, data.remarks);
    toast({ title: 'Success!', description: `${data.quantity} x ${selectedKit.name} kit(s) issued to ${data.contractorName}.`});
    kitForm.reset({ contractorName: '', buildingName: '', flatNo: '', kitId: '', quantity: 1, remarks: '' });
    setIsDialogOpen(false);
  };

  const handleExport = () => {
    const dataToExport = filteredRecords.flatMap(record => 
        record.items.map(item => ({
            'Date': format(record.date, 'yyyy-MM-dd'),
            'Contractor': record.contractorName,
            'Building': record.buildingName,
            'Flat': record.flatNo,
            'Material': item.materialName,
            'Quantity': item.quantity,
            'Unit': getUnitForMaterial(item.materialName),
            'Remarks': record.remarks || '',
        }))
    );
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Material Issues');
    XLSX.writeFile(workbook, `material_issues_${selectedProject}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline">
                <FileDown className="mr-2 h-4 w-4" /> Download Excel
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Issue Materials</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                <DialogTitle>Issue Material to Contractor</DialogTitle>
                <DialogDescription>Record materials issued from the store for project: {selectedProject}.</DialogDescription>
                </DialogHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="items">By Items</TabsTrigger>
                    <TabsTrigger value="kit">By Kit</TabsTrigger>
                </TabsList>
                <TabsContent value="items">
                    <Form {...itemsForm}>
                    <form onSubmit={itemsForm.handleSubmit(onItemsSubmit)} className="space-y-6 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={itemsForm.control} name="contractorName" render={({ field }) => (
                                <FormItem><FormLabel>Contractor</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a contractor" /></SelectTrigger></FormControl>
                                    <SelectContent>{projectContractors.map((c) => <SelectItem key={c.supplierName} value={c.supplierName}>{c.supplierName}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={itemsForm.control} name="buildingName" render={({ field }) => (
                                <FormItem><FormLabel>Building</FormLabel>
                                    <Select onValueChange={(value) => { field.onChange(value); itemsForm.resetField('flatNo'); }} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a building" /></SelectTrigger></FormControl>
                                    <SelectContent>{projectBuildings.map((b) => <SelectItem key={b.buildingName} value={b.buildingName}>{b.buildingName}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={itemsForm.control} name="flatNo" render={({ field }) => (
                                <FormItem><FormLabel>Flat</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedBuildingForItems}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a flat" /></SelectTrigger></FormControl>
                                    <SelectContent>{availableFlatsForItems.map((f) => <SelectItem key={f.flatNo} value={f.flatNo}>{f.flatNo}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <div className="max-h-[45vh] overflow-y-auto pr-2 space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md">
                            <FormField control={itemsForm.control} name={`items.${index}.materialName`} render={({ field }) => (
                                <FormItem className="col-span-5"><FormLabel>Material</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger></FormControl>
                                    <SelectContent>{projectInventory.map(m => <SelectItem key={m.materialName} value={m.materialName}>{m.materialName}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={itemsForm.control} name={`items.${index}.quantity`} render={({ field }) => (
                                <FormItem className="col-span-3"><FormLabel>Issue Quantity</FormLabel>
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
                         <FormField control={itemsForm.control} name="remarks" render={({ field }) => (
                            <FormItem><FormLabel>Remarks</FormLabel>
                                <FormControl><Textarea placeholder="Add any notes about this issue..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="flex justify-between">
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ materialName: '', quantity: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                        <Button type="submit">Submit Issue</Button>
                        </div>
                    </form>
                    </Form>
                </TabsContent>
                <TabsContent value="kit">
                    <Form {...kitForm}>
                    <form onSubmit={kitForm.handleSubmit(onKitSubmit)} className="space-y-6 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={kitForm.control} name="contractorName" render={({ field }) => (
                                <FormItem><FormLabel>Contractor</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a contractor" /></SelectTrigger></FormControl>
                                    <SelectContent>{projectContractors.map((c) => <SelectItem key={c.supplierName} value={c.supplierName}>{c.supplierName}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={kitForm.control} name="buildingName" render={({ field }) => (
                                <FormItem><FormLabel>Building</FormLabel>
                                    <Select onValueChange={(value) => { field.onChange(value); kitForm.resetField('flatNo'); }} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a building" /></SelectTrigger></FormControl>
                                    <SelectContent>{projectBuildings.map((b) => <SelectItem key={b.buildingName} value={b.buildingName}>{b.buildingName}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={kitForm.control} name="flatNo" render={({ field }) => (
                                <FormItem><FormLabel>Flat</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedBuildingForKit}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a flat" /></SelectTrigger></FormControl>
                                    <SelectContent>{availableFlatsForKit.map((f) => <SelectItem key={f.flatNo} value={f.flatNo}>{f.flatNo}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={kitForm.control} name="kitId" render={({ field }) => (
                        <FormItem><FormLabel>Material Kit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a kit" /></SelectTrigger></FormControl>
                            <SelectContent>{materialKits.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                        )} />
                        <FormField control={kitForm.control} name="quantity" render={({ field }) => (
                            <FormItem><FormLabel>Number of Kits to Issue</FormLabel>
                            <FormControl><Input type="number" placeholder="1" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={kitForm.control} name="remarks" render={({ field }) => (
                            <FormItem><FormLabel>Remarks</FormLabel>
                                <FormControl><Textarea placeholder="Add any notes about this issue..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="flex justify-end">
                        <Button type="submit">Submit Issue</Button>
                        </div>
                    </form>
                    </Form>
                </TabsContent>
                </Tabs>
            </DialogContent>
            </Dialog>
        </div>
      </div>

       <Card>
        <CardHeader><CardTitle>Issue History</CardTitle><CardDescription>A log of all materials issued to contractors.</CardDescription></CardHeader>
        <CardContent>
            <div className="flex flex-col gap-4 mb-6">
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Search by contractor, building, flat..."
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
                    <Select value={filterContractor} onValueChange={setFilterContractor}>
                        <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filter by Contractor" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Contractors</SelectItem>
                            {projectContractors.map(c => <SelectItem key={c.supplierName} value={c.supplierName}>{c.supplierName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                        <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filter by Building" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Buildings</SelectItem>
                            {projectBuildings.map(b => <SelectItem key={b.buildingName} value={b.buildingName}>{b.buildingName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                        <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filter by Material" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Materials</SelectItem>
                            {materials.map(m => <SelectItem key={m.id} value={m.materialName}>{m.materialName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
            <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Contractor</TableHead><TableHead>Building</TableHead><TableHead>Flat</TableHead><TableHead>Items</TableHead></TableRow></TableHeader>
                <TableBody>
                    {paginatedRecords.length > 0 ? (
                        paginatedRecords.map(record => (
                            <TableRow key={record.id} className="cursor-pointer" onClick={() => { setSelectedRecord(record); setIsDetailsOpen(true);}}>
                                <TableCell>{format(record.date, 'PP')}</TableCell>
                                <TableCell>{record.contractorName}</TableCell>
                                <TableCell>{record.buildingName}</TableCell>
                                <TableCell>{record.flatNo}</TableCell>
                                <TableCell>{record.items.length}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No materials issued yet matching filters.</TableCell></TableRow>
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
                    <DialogTitle>Issue Details</DialogTitle>
                    {selectedRecord && (
                        <DialogDescription>
                            Issued to {selectedRecord.contractorName} for {selectedRecord.buildingName} - Flat {selectedRecord.flatNo} on {format(selectedRecord.date, 'PP')}
                        </DialogDescription>
                    )}
                </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-4">
                <Table>
                    <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Unit</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {selectedRecord?.items.map((item, index) => (
                            <TableRow key={index}><TableCell>{item.materialName}</TableCell><TableCell className="text-right">{item.quantity}</TableCell><TableCell className="text-right">{getUnitForMaterial(item.materialName)}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
                {selectedRecord?.remarks && (
                    <div>
                        <h4 className="font-semibold">Remarks:</h4>
                        <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">{selectedRecord.remarks}</p>
                    </div>
                )}
            </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
