
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, Search, CalendarIcon, FileDown } from 'lucide-react';
import { useAppContext, PurchaseOrderData } from '@/context/AppContext';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from 'xlsx';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 10;

const poItemSchema = z.object({
  materialName: z.string().min(1, "Please select a material."),
  quantity: z.coerce.number().positive("Quantity must be positive."),
  rate: z.coerce.number().positive("Rate must be positive."),
});

const formSchema = z.object({
  supplierName: z.string().min(1, "Please select a supplier."),
  expectedDeliveryDate: z.date({ required_error: 'Please select a delivery date.' }),
  items: z.array(poItemSchema).min(1, "Please add at least one material to the PO."),
});

export default function PurchaseOrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { purchaseOrders, setPurchaseOrders, suppliers, materials, selectedProject, indents, setIndents } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIndentId, setSelectedIndentId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<PurchaseOrderData['status'] | 'all'>('all');
  const [filterMaterial, setFilterMaterial] = useState('all');
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderData | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);


  const filteredPOs = useMemo(() => {
    return purchaseOrders
      .filter(po => po.projectName === selectedProject)
      .filter(po => {
        if (filterStatus === 'all') return true;
        return po.status === filterStatus;
      })
      .filter(po => {
        if (!dateRange?.from) return true;
        const from = dateRange.from;
        const to = dateRange.to || from;
        const poDate = new Date(po.date).setHours(0, 0, 0, 0);
        return poDate >= new Date(from).setHours(0, 0, 0, 0) && poDate <= new Date(to).setHours(0, 0, 0, 0);
      })
      .filter(po => {
        if (filterMaterial === 'all') return true;
        return po.items.some(item => item.materialName === filterMaterial);
      })
      .filter(po =>
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [purchaseOrders, selectedProject, searchTerm, filterStatus, dateRange, filterMaterial]);
  
  const totalPages = Math.ceil(filteredPOs.length / PAGE_SIZE);
  const paginatedPOs = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredPOs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredPOs, currentPage]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const projectSuppliers = useMemo(
    () => suppliers.filter(s => s.supplierType.includes('Material')),
    [suppliers]
  );

  const approvedIndentsForPO = useMemo(() =>
    indents.filter(indent => 
        indent.requestingProject === selectedProject && 
        indent.status === 'Approved' && 
        !indent.poCreated
    ),
    [indents, selectedProject]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierName: '',
      items: [{ materialName: '', quantity: 0, rate: 0 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const handleIndentSelect = (indentId: string) => {
    const indent = approvedIndentsForPO.find(i => i.id === indentId);
    if (indent) {
      setSelectedIndentId(indent.id);
      const poItems = indent.items.map(item => ({
        materialName: item.materialName,
        quantity: item.quantity,
        rate: 0 // User must fill this in
      }));
      replace(poItems);
    } else {
      setSelectedIndentId(null);
      replace([{ materialName: '', quantity: 0, rate: 0 }]);
    }
  };

  const calculateTotal = (items: z.infer<typeof poItemSchema>[]) => {
    return items.reduce((total, item) => total + item.quantity * item.rate, 0);
  };

  const getStatusColor = (status: PurchaseOrderData['status']) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Partially Received': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!selectedProject) {
      toast({ variant: 'destructive', title: 'Error', description: 'No project selected.' });
      return;
    }

    const newPO: PurchaseOrderData = {
      id: crypto.randomUUID(),
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      supplierName: data.supplierName,
      date: new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate,
      items: data.items,
      status: 'Approved', // Changed from 'Pending'
      projectName: selectedProject,
    };
    
    setPurchaseOrders(prev => [...prev, newPO]);
    
    if (selectedIndentId) {
      setIndents(prevIndents => 
        prevIndents.map(indent => 
          indent.id === selectedIndentId ? { ...indent, poCreated: true } : indent
        )
      );
    }

    toast({
      title: 'PO Created & Approved',
      description: `Purchase Order ${newPO.poNumber} has been created.`,
    });

    form.reset({ supplierName: '', expectedDeliveryDate: undefined, items: [{ materialName: '', quantity: 0, rate: 0 }] });
    setSelectedIndentId(null);
    setIsDialogOpen(false);
  };

  const handleExport = () => {
    const dataToExport = filteredPOs.flatMap(po => 
        po.items.map(item => ({
            'PO No.': po.poNumber,
            'Date': format(po.date, 'yyyy-MM-dd'),
            'Supplier': po.supplierName,
            'Status': po.status,
            'Material': item.materialName,
            'Quantity': item.quantity,
            'Rate': item.rate,
            'Total': item.quantity * item.rate,
        }))
    );
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders');
    XLSX.writeFile(workbook, `purchase_orders_${selectedProject}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };


  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Purchase Order</TabsTrigger>
          <TabsTrigger value="history">PO History</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
            <div className="flex justify-end p-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Create New PO</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Create New Purchase Order</DialogTitle>
                        <DialogDescription>Create a PO for project: {selectedProject}. You can optionally source items from an approved indent.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormItem>
                                <FormLabel>Source (Optional)</FormLabel>
                                <Select onValueChange={handleIndentSelect}>
                                    <SelectTrigger><SelectValue placeholder="Create from approved indent" /></SelectTrigger>
                                    <SelectContent>
                                        {approvedIndentsForPO.map(indent => (<SelectItem key={indent.id} value={indent.id}>{indent.indentNumber}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                            <FormField control={form.control} name="supplierName" render={({ field }) => (
                                <FormItem><FormLabel>Supplier</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} ><FormControl><SelectTrigger><SelectValue placeholder="Select a supplier" /></SelectTrigger></FormControl>
                                <SelectContent>{projectSuppliers.map(s => <SelectItem key={s.supplierName} value={s.supplierName}>{s.supplierName}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="expectedDeliveryDate" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Expected Delivery Date</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl>
                                <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover><FormMessage />
                            </FormItem>
                        )}/>
                        
                        <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
                            {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md">
                                <FormField control={form.control} name={`items.${index}.materialName`} render={({ field }) => (
                                <FormItem className="col-span-5"><FormLabel>Material</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedIndentId}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger></FormControl>
                                    <SelectContent>{materials.map(m => <SelectItem key={m.id} value={m.materialName}>{m.materialName}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                                </FormItem>
                                )} />
                                <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                <FormItem className="col-span-3"><FormLabel>Quantity</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`items.${index}.rate`} render={({ field }) => (
                                <FormItem className="col-span-3"><FormLabel>Rate</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <div className="col-span-1 flex items-end h-full">
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1 || !!selectedIndentId}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            ))}
                        </div>
                        <div className="flex justify-between">
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ materialName: '', quantity: 0, rate: 0 })} disabled={!!selectedIndentId}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                            <Button type="submit">Create PO</Button>
                        </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            </div>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Purchase Orders</CardTitle>
                        <CardDescription>A list of all purchase orders for project: {selectedProject}.</CardDescription>
                    </div>
                    <Button onClick={handleExport} variant="outline"><FileDown className="mr-2 h-4 w-4" /> Download Excel</Button>
                </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-wrap items-center gap-4">
                      <div className="relative flex-1 min-w-[250px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                          placeholder="Search by PO no. or supplier..."
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
                              <span>Filter by date range</span>
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
                      <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                          <SelectTrigger className="flex-1 min-w-[180px]"><SelectValue placeholder="Filter by Status" /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Partially Received">Partially Received</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Rejected">Rejected</SelectItem>
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
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPOs.length > 0 ? paginatedPOs.map(po => (
                    <TableRow
                      key={po.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedPO(po);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>{format(po.date, 'PP')}</TableCell>
                      <TableCell>{format(po.expectedDeliveryDate, 'PP')}</TableCell>
                      <TableCell>₹{calculateTotal(po.items).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(po.status)}>{po.status}</Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">No purchase orders match the current filters.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>PO Details: {selectedPO?.poNumber}</DialogTitle>
            {selectedPO && (
              <DialogDescription>
                Supplier: {selectedPO.supplierName} | Date: {format(selectedPO.date, 'PP')} | Expected: {format(selectedPO.expectedDeliveryDate, 'PP')}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedPO?.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.materialName}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{item.rate.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{(item.quantity * item.rate).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={3} className="text-right">Total</TableCell>
                    <TableCell className="text-right">₹{selectedPO ? calculateTotal(selectedPO.items).toLocaleString() : '0'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
