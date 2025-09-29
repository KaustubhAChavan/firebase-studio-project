
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, Search, CalendarIcon, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, IndentData } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMemo, useState } from 'react';
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
import * as XLSX from 'xlsx';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 10;

const indentItemSchema = z.object({
  materialName: z.string().min(1, "Please select a material."),
  quantity: z.coerce.number().positive("Quantity must be positive."),
});

const formSchema = z.object({
  items: z.array(indentItemSchema).min(1, "Please add at least one material to the indent."),
});

type IndentStatus = 'Pending' | 'Approved' | 'Rejected' | 'PO Created';

export default function IndentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { indents, setIndents, materials, selectedProject } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedIndent, setSelectedIndent] = useState<IndentData | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<IndentStatus | 'all'>('all');
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const projectIndents = useMemo(
    () => indents.filter(indent => indent.requestingProject === selectedProject).sort((a,b) => b.date.getTime() - a.date.getTime()),
    [indents, selectedProject]
  );

  const getDerivedStatus = (indent: IndentData): IndentStatus => {
    if (indent.status === 'Approved' && indent.poCreated) {
      return 'PO Created';
    }
    return indent.status;
  };
  
  const filteredIndents = useMemo(() => {
    return projectIndents
      .filter(indent => {
        if (filterStatus === 'all') return true;
        return getDerivedStatus(indent) === filterStatus;
      })
      .filter(indent => {
        if (!dateRange?.from) return true;
        const from = dateRange.from;
        const to = dateRange.to || from;
        const indentDate = new Date(indent.date).setHours(0,0,0,0);
        return indentDate >= new Date(from).setHours(0,0,0,0) && indentDate <= new Date(to).setHours(0,0,0,0);
      })
      .filter(indent => {
        if (filterMaterial === 'all') return true;
        return indent.items.some(item => item.materialName === filterMaterial);
      })
      .filter(indent =>
        indent.indentNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [projectIndents, searchTerm, filterStatus, dateRange, filterMaterial]);
  
  const totalPages = Math.ceil(filteredIndents.length / PAGE_SIZE);
  const paginatedIndents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredIndents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredIndents, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      items: [{ materialName: '', quantity: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const getStatusColor = (status: IndentStatus) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'PO Created': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!selectedProject) {
      toast({ variant: 'destructive', title: 'Error', description: 'No project selected.' });
      return;
    }

    const newIndent: IndentData = {
      id: crypto.randomUUID(),
      indentNumber: `IND-${Date.now().toString().slice(-6)}`,
      requestingProject: selectedProject,
      date: new Date(),
      items: data.items,
      status: 'Pending',
      poCreated: false,
    };
    
    setIndents(prev => [...prev, newIndent]);
    toast({
      title: 'Indent Created',
      description: `Indent ${newIndent.indentNumber} has been created and is pending approval.`,
    });

    form.reset({ items: [{ materialName: '', quantity: 0 }] });
    setIsDialogOpen(false);
  };
  
  const getUnitForMaterial = (materialName: string) => {
    return materials.find(m => m.materialName === materialName)?.unit || '';
  };

  const handleExport = () => {
    const dataToExport = filteredIndents.flatMap(indent => 
        indent.items.map(item => ({
            'Indent No.': indent.indentNumber,
            'Date': format(indent.date, 'yyyy-MM-dd'),
            'Status': getDerivedStatus(indent),
            'Material': item.materialName,
            'Quantity': item.quantity,
            'Unit': getUnitForMaterial(item.materialName),
            'Project': indent.requestingProject
        }))
    );
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Indents');
    XLSX.writeFile(workbook, `indents_history_${selectedProject}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

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
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Indent
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                <DialogTitle>Create New Material Indent</DialogTitle>
                <DialogDescription>
                    Request materials from the central store for project: {selectedProject}.
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-12 gap-4 items-start border p-4 rounded-md">
                        <FormField
                            control={form.control}
                            name={`items.${index}.materialName`}
                            render={({ field }) => (
                            <FormItem className="col-span-6">
                                <FormLabel>Material</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select material" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {materials.map(m => <SelectItem key={m.id} value={m.materialName}>{m.materialName}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                            <FormItem className="col-span-4">
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <div className="col-span-2 flex items-end h-full">
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        </div>
                    ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ materialName: '', quantity: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Material
                    </Button>
                    <DialogFooter>
                    <Button type="submit">Submit Indent</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Material Indents</CardTitle>
            <CardDescription>
                A list of all material requests for project: {selectedProject}.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Search by indent no..."
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
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="PO Created">PO Created</SelectItem>
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
                        <TableHead>Indent No.</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedIndents.length > 0 ? paginatedIndents.map(indent => (
                        <TableRow
                          key={indent.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedIndent(indent);
                            setIsDetailsOpen(true);
                          }}
                        >
                            <TableCell className="font-medium">{indent.indentNumber}</TableCell>
                            <TableCell>{format(indent.date, 'PP')}</TableCell>
                            <TableCell>{indent.items.length}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={getStatusColor(getDerivedStatus(indent))}>{getDerivedStatus(indent)}</Badge>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">No indents match the current filters.</TableCell>
                        </TableRow>
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
                <DialogTitle>Indent Details</DialogTitle>
                {selectedIndent && (
                    <DialogDescription>
                        Indent: {selectedIndent.indentNumber} | Project: {selectedIndent.requestingProject} | Date: {format(selectedIndent.date, 'PP')}
                    </DialogDescription>
                )}
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectedIndent?.items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{item.materialName}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{getUnitForMaterial(item.materialName)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
