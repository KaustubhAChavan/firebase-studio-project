
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, FileDown, Trash2, Image as ImageIcon, Search, CalendarIcon } from 'lucide-react';
import { useAppContext, PurchaseOrderData, GRNData, SiteTransferData } from '@/context/AppContext';
import { useState, useMemo } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as XLSX from 'xlsx';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Pagination } from '@/components/ui/pagination';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const PAGE_SIZE = 40;

const grnItemSchema = z.object({
  materialName: z.string(),
  orderedQuantity: z.number(),
  alreadyReceived: z.number(),
  receivedQuantity: z.coerce.number().min(0, "Quantity cannot be negative."),
}).refine(data => data.receivedQuantity <= (data.orderedQuantity - data.alreadyReceived), {
    message: "Cannot receive more than remaining quantity.",
    path: ['receivedQuantity'],
});

const formSchema = z.object({
  sourceId: z.string().min(1, 'Please select a source document.'),
  sourceType: z.enum(['PO', 'Transfer']),
  items: z.array(grnItemSchema),
  remarks: z.string().optional(),
  photos: z.array(z.string()).optional(),
});

type OpenOrder = (PurchaseOrderData & { type: 'PO' }) | (SiteTransferData & { type: 'Transfer' });

export default function PurchasePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { selectedProject, purchaseOrders, setPurchaseOrders, siteTransfers, setSiteTransfers, setInventory, materials, grns, setGrns } = useAppContext();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<OpenOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GRNData | null>(null);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  
  // Filters for history
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterSupplier, setFilterSupplier] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);

  const openOrders: OpenOrder[] = useMemo(() => {
    const openPOs: OpenOrder[] = purchaseOrders
      .filter(po => 
        po.projectName === selectedProject && 
        (po.status === 'Approved' || po.status === 'Partially Received')
      )
      .map(po => ({ ...po, type: 'PO' }));

    const openTransfers: OpenOrder[] = siteTransfers
      .filter(st => 
        st.toProject === selectedProject && 
        st.status !== 'Completed'
      )
      .map(st => ({ ...st, type: 'Transfer' }));

    return [...openPOs, ...openTransfers].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [purchaseOrders, siteTransfers, selectedProject]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { sourceId: '', sourceType: 'PO', items: [], remarks: '', photos: [] },
  });

  const getReceivedQty = (sourceId: string, sourceType: 'PO' | 'Transfer', materialName: string) => {
    return grns
      .filter(grn => grn.sourceId === sourceId && grn.sourceType === sourceType)
      .flatMap(grn => grn.items)
      .filter(item => item.materialName === materialName)
      .reduce((sum, item) => sum + item.receivedQuantity, 0);
  };

  const handleOpenDialog = (order: OpenOrder) => {
    setSelectedSource(order);
    setNewPhotos([]);
    form.reset({
        sourceId: order.id,
        sourceType: order.type,
        items: order.items.map(item => ({
            materialName: item.materialName,
            orderedQuantity: item.quantity,
            alreadyReceived: getReceivedQty(order.id, order.type, item.materialName),
            receivedQuantity: 0,
        })),
        remarks: '',
        photos: [],
    });
    setIsDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewPhotos(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const newGrn: GRNData = {
        id: crypto.randomUUID(),
        grnNumber: `GRN-${Date.now().toString().slice(-6)}`,
        sourceId: data.sourceId,
        sourceType: data.sourceType,
        sourceNumber: selectedSource!.type === 'PO' ? selectedSource!.poNumber : selectedSource!.transferNumber,
        supplierName: selectedSource!.type === 'PO' ? selectedSource!.supplierName : `Transfer from ${selectedSource!.fromProject}`,
        date: new Date(),
        items: data.items.filter(item => item.receivedQuantity > 0),
        remarks: data.remarks,
        photos: newPhotos,
        projectName: selectedProject!,
    };

    if (newGrn.items.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter a received quantity for at least one item.' });
        return;
    }

    setGrns(prevGrns => [...prevGrns, newGrn]);

    setInventory(prevInventory => {
      let newInventory = [...prevInventory];
      newGrn.items.forEach(item => {
        const materialDetails = materials.find(m => m.materialName === item.materialName);
        if (!materialDetails) return;

        const itemIndex = newInventory.findIndex(invItem => invItem.materialName === item.materialName && invItem.project === selectedProject);
        if (itemIndex !== -1) {
          const updatedItem = {...newInventory[itemIndex]};
          updatedItem.currentStock += item.receivedQuantity;
          newInventory[itemIndex] = updatedItem;
        } else {
          newInventory.push({
            materialName: item.materialName, category: materialDetails.category, unit: materialDetails.unit,
            project: selectedProject!, currentStock: item.receivedQuantity,
          });
        }
      });
      return newInventory;
    });

    const currentGrns = [...grns, newGrn];

    if (newGrn.sourceType === 'PO') {
      setPurchaseOrders(prevPOs => prevPOs.map(po => {
        if (po.id !== data.sourceId) return po;
        const totalReceivedPerItem = po.items.map(poItem => ({
            materialName: poItem.materialName,
            totalReceived: getReceivedQty(po.id, 'PO', poItem.materialName) + (data.items.find(i => i.materialName === poItem.materialName)?.receivedQuantity || 0),
            ordered: poItem.quantity,
        }));
        const isFullyReceived = totalReceivedPerItem.every(item => item.totalReceived >= item.ordered);
        return { ...po, status: isFullyReceived ? 'Completed' : 'Partially Received' };
      }));
    } else { // It's a Transfer
        setSiteTransfers(prevTransfers => prevTransfers.map(st => {
            if (st.id !== data.sourceId) return st;
            const totalReceivedPerItem = st.items.map(stItem => ({
                materialName: stItem.materialName,
                totalReceived: getReceivedQty(st.id, 'Transfer', stItem.materialName) + (data.items.find(i => i.materialName === stItem.materialName)?.receivedQuantity || 0),
                ordered: stItem.quantity
            }));
            const isFullyReceived = totalReceivedPerItem.every(item => item.totalReceived >= item.ordered);
            return { ...st, status: isFullyReceived ? 'Completed' : 'Partially Received' };
        }));
    }

    toast({ title: "GRN Created", description: `GRN ${newGrn.grnNumber} has been saved.` });
    setIsDialogOpen(false);
    setSelectedSource(null);
    form.reset();
    setNewPhotos([]);
  };

  const projectGrns = useMemo(() => grns.filter(g => g.projectName === selectedProject), [grns, selectedProject]);
  const uniqueSuppliers = useMemo(() => Array.from(new Set(projectGrns.map(g => g.supplierName))), [projectGrns]);

  const filteredGrns = useMemo(() => {
    return projectGrns
      .filter(grn => {
        if (filterSupplier === 'all') return true;
        return grn.supplierName === filterSupplier;
      })
      .filter(grn => {
        if (!dateRange?.from) return true;
        const from = dateRange.from;
        const to = dateRange.to || from;
        const grnDate = new Date(grn.date).setHours(0, 0, 0, 0);
        return grnDate >= new Date(from).setHours(0, 0, 0, 0) && grnDate <= new Date(to).setHours(0, 0, 0, 0);
      })
      .filter(grn =>
        grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.sourceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grn.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [projectGrns, searchTerm, dateRange, filterSupplier]);

  const totalGrnPages = Math.ceil(filteredGrns.length / PAGE_SIZE);
  const paginatedGrns = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredGrns.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredGrns, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const getStatusColor = (status: PurchaseOrderData['status'] | SiteTransferData['status']) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Partially Received': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleExport = () => {
    const dataToExport = filteredGrns.flatMap(grn => 
        grn.items.map(item => ({
            'GRN No.': grn.grnNumber,
            'Date': format(grn.date, 'yyyy-MM-dd'),
            'Source Type': grn.sourceType,
            'Source No.': grn.sourceNumber,
            'Supplier / Source': grn.supplierName,
            'Material': item.materialName,
            'Ordered Quantity': item.orderedQuantity,
            'Received Quantity': item.receivedQuantity,
            'Remarks': grn.remarks || ''
        }))
    );
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GRN History');
    XLSX.writeFile(workbook, `grn_history_${selectedProject}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

       <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create GRN</TabsTrigger>
          <TabsTrigger value="history">GRN History</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create Goods Received Note (GRN)</CardTitle>
              <CardDescription>Select an open Purchase Order or Site Transfer to record a new delivery for project: {selectedProject}.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Source No.</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Supplier / From</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {openOrders.length > 0 ? openOrders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.type === 'PO' ? order.poNumber : order.transferNumber}</TableCell>
                            <TableCell><Badge variant={order.type === 'PO' ? 'secondary' : 'default'}>{order.type}</Badge></TableCell>
                            <TableCell>{order.type === 'PO' ? order.supplierName : order.fromProject}</TableCell>
                            <TableCell>{format(order.date, 'PP')}</TableCell>
                            <TableCell><Badge variant="outline" className={getStatusColor(order.status)}>{order.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button onClick={() => handleOpenDialog(order)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Create GRN
                              </Button>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow><TableCell colSpan={6} className="h-24 text-center">No open orders available to receive against.</TableCell></TableRow>
                    )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                    <CardTitle>GRN History</CardTitle>
                    <CardDescription>A log of all received goods for project: {selectedProject}.</CardDescription>
                </div>
                <Button onClick={handleExport} variant="outline">
                    <FileDown className="mr-2 h-4 w-4" /> Download Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
               <div className="flex flex-col gap-4 mb-6">
                 <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Search by GRN/PO/Transfer No..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        />
                    </div>
                    <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                        <SelectTrigger className="flex-1 min-w-[200px]"><SelectValue placeholder="Filter by Supplier" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Suppliers/Sources</SelectItem>
                            {uniqueSuppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
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
               </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Source No.</TableHead>
                    <TableHead>Supplier/Source</TableHead>
                    <TableHead>Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedGrns.length > 0 ? (
                        paginatedGrns.map(grn => (
                            <TableRow key={grn.id} className="cursor-pointer" onClick={() => { setSelectedGrn(grn); setIsDetailsOpen(true); }}>
                                <TableCell>{grn.grnNumber}</TableCell>
                                <TableCell>{format(grn.date, 'PP')}</TableCell>
                                <TableCell>{grn.sourceNumber}</TableCell>
                                <TableCell>{grn.supplierName}</TableCell>
                                <TableCell>{grn.items.length}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No GRNs match the current filters.</TableCell></TableRow>
                    )}
                </TableBody>
              </Table>
              <Pagination
                currentPage={currentPage}
                totalPages={totalGrnPages}
                onPageChange={handlePageChange}
              />
            </CardContent>
          </Card>
        </TabsContent>
       </Tabs>

       <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setSelectedSource(null); form.reset(); setNewPhotos([]); }
       }}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
            <DialogTitle>Receive Goods for {selectedSource?.type}: {selectedSource?.type === 'PO' ? selectedSource.poNumber : selectedSource?.transferNumber}</DialogTitle>
            <DialogDescription>Enter the quantities received for each item.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
                  <Table>
                      <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Ordered</TableHead><TableHead>Received</TableHead><TableHead>Remaining</TableHead><TableHead className="w-[150px]">Receiving Now</TableHead></TableRow></TableHeader>
                      <TableBody>
                      {form.getValues('items').map((item, index) => (
                          <TableRow key={item.materialName}>
                              <TableCell>{item.materialName}</TableCell>
                              <TableCell>{item.orderedQuantity}</TableCell>
                              <TableCell>{item.alreadyReceived}</TableCell>
                              <TableCell>{item.orderedQuantity - item.alreadyReceived}</TableCell>
                              <TableCell>
                              <FormField control={form.control} name={`items.${index}.receivedQuantity`} render={({ field }) => (
                                  <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                              </TableCell>
                          </TableRow>
                      ))}
                      </TableBody>
                  </Table>
                  <FormField control={form.control} name="remarks" render={({ field }) => (
                    <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea placeholder="Add any notes about the delivery..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <div className="space-y-2">
                        <FormLabel>Attach Photos</FormLabel>
                        <FormControl><Input type="file" accept="image/*" multiple onChange={handleFileChange} /></FormControl>
                         <div className="grid grid-cols-3 gap-2 mt-2">
                            {newPhotos.map((photo, photoIndex) => (
                                <div key={photoIndex} className="relative group">
                                    <Image src={photo} alt={`GRN photo ${photoIndex + 1}`} width={100} height={100} className="rounded-md object-cover w-full aspect-square"/>
                                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setNewPhotos(prev => prev.filter((_, i) => i !== photoIndex))}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                   </div>
                </div>
                <DialogFooter><Button type="submit" disabled={!selectedSource}>Save GRN</Button></DialogFooter>
            </form>
            </Form>
        </DialogContent>
       </Dialog>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>GRN Details: {selectedGrn?.grnNumber}</DialogTitle>
                {selectedGrn && (
                  <DialogDescription>
                    Source: {selectedGrn.sourceNumber} | Supplier/Source: {selectedGrn.supplierName} | Date: {format(selectedGrn.date, 'PP')}
                  </DialogDescription>
                )}
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-4">
                  <Table>
                      <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Quantity Received</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {selectedGrn?.items.map((item, index) => (
                              <TableRow key={index}><TableCell>{item.materialName}</TableCell><TableCell className="text-right">{item.receivedQuantity}</TableCell></TableRow>
                          ))}
                      </TableBody>
                  </Table>
                  {selectedGrn?.remarks && (
                    <div>
                      <h4 className="font-semibold">Remarks:</h4>
                      <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">{selectedGrn.remarks}</p>
                    </div>
                  )}
                  {selectedGrn?.photos && selectedGrn.photos.length > 0 && (
                     <div>
                      <h4 className="font-semibold mb-2">Photos:</h4>
                      <Carousel>
                        <CarouselContent>
                          {selectedGrn.photos.map((photo, index) => (
                            <CarouselItem key={index}>
                              <Image src={photo} alt={`GRN Photo ${index + 1}`} width={500} height={300} className="rounded-md object-contain mx-auto" />
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        {selectedGrn.photos.length > 1 && (<><CarouselPrevious /><CarouselNext /></>)}
                      </Carousel>
                     </div>
                  )}
              </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
