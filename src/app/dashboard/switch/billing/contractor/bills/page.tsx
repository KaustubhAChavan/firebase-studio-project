
'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarIcon, ImageIcon, Search, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext, ContractorBillData, PhotoWithMetaData } from '@/context/AppContext';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { Pagination } from '@/components/ui/pagination';
import React from 'react';

const PAGE_SIZE = 10;

const PrintableBill = React.memo(function PrintableBill({ bill }: { bill: ContractorBillData }) {
  const { companies } = useAppContext();
  const company = companies[0];

  return (
    <div id="printable-bill" className="hidden print:block p-8 font-sans bg-white text-black text-xs">
        <header className="pb-4 mb-4 border-b-2 border-black">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold">{company.companyName}</h1>
                    <p className="text-xs">{company.companyAddress}</p>
                    <p className="text-xs">Email: {company.email} | Contact: {company.contactNo}</p>
                    <p className="text-xs">GSTIN: {company.gstNo}</p>
                </div>
                <h2 className="text-3xl font-bold text-gray-700">BILL</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                <div>
                    <h3 className="font-bold mb-1">Bill To:</h3>
                    <p>{bill.contractorName}</p>
                </div>
                <div className="text-right">
                    <p><span className="font-bold">Bill No:</span> {bill.billNumber}</p>
                    <p><span className="font-bold">Date:</span> {format(bill.date, 'PP')}</p>
                    <p><span className="font-bold">Project:</span> {bill.projectName}</p>
                </div>
            </div>
        </header>

        <main>
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
                                <div className="text-[10px] text-gray-500">{item.workTile} - Flat {item.flatNo}</div>
                            </td>
                            <td className="py-0.5 px-1 border border-gray-300 text-right font-mono align-top">₹{item.rate.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </main>

        <footer className="mt-4 pt-4 border-t-2 border-black">
            <div className="flex justify-end">
                <table className="w-2/5 text-xs">
                    <tbody>
                        <tr className="bg-gray-50">
                            <td className="p-1 font-medium">Total Amount</td>
                            <td className="p-1 text-right font-mono font-medium">₹{bill.totalAmount.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td className="p-1">Advance</td>
                            <td className="p-1 text-right font-mono">- ₹{bill.advancePayment.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td className="p-1">Penalty</td>
                            <td className="p-1 text-right font-mono">- ₹{bill.penalty.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td className="p-1">Hold Amount</td>
                            <td className="p-1 text-right font-mono">- ₹{bill.holdAmount.toFixed(2)}</td>
                        </tr>
                        <tr className="font-bold text-sm border-t border-black">
                            <td className="p-1 pt-2">Net Payable</td>
                            <td className="p-1 pt-2 text-right font-mono">₹{bill.netPayable.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="mt-8 text-center text-[10px] text-gray-500">
                <p>This is a computer-generated bill.</p>
            </div>
        </footer>
    </div>
  );
});


export default function BillHistoryPage() {
  const router = useRouter();
  const { contractorBills, selectedProject } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedContractor, setSelectedContractor] = useState('all');
  const [selectedBill, setSelectedBill] = useState<ContractorBillData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [photosToShow, setPhotosToShow] = useState<string[]>([]);
  const [billToPrint, setBillToPrint] = useState<ContractorBillData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (billToPrint) {
      const timer = setTimeout(() => {
        window.print();
        setBillToPrint(null);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [billToPrint]);

  const projectBills = useMemo(() => 
    contractorBills.filter(b => b.projectName === selectedProject),
  [contractorBills, selectedProject]);
  
  const uniqueContractors = useMemo(() => {
    const names = new Set(projectBills.map(b => b.contractorName));
    return Array.from(names);
  }, [projectBills]);

  const filteredBills = useMemo(() => {
      return projectBills
        .filter(bill => {
            if (selectedContractor === 'all') return true;
            return bill.contractorName === selectedContractor;
        })
        .filter(bill => {
            if (!dateRange?.from) return true;
            const from = dateRange.from;
            const to = dateRange.to || from;
            // set hours to compare dates correctly
            const billDate = new Date(bill.date).setHours(0,0,0,0);
            return billDate >= new Date(from).setHours(0,0,0,0) && billDate <= new Date(to).setHours(0,0,0,0);
        })
        .filter(bill =>
            bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            bill.contractorName.toLowerCase().includes(searchTerm.toLowerCase())
        );
  }, [projectBills, searchTerm, selectedContractor, dateRange]);
  
  const totalPages = Math.ceil(filteredBills.length / PAGE_SIZE);
  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredBills.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredBills, currentPage]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  return (
    <>
      <Button variant="outline" onClick={() => router.back()} className="mb-4 print:hidden">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <div className="space-y-8">
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="print:hidden">
            <CardTitle>Contractor Bill History</CardTitle>
            <CardDescription>
              A log of all generated bills for contractors on project: {selectedProject}.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col gap-4 mb-6 print:hidden">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Search by bill no. or contractor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        />
                    </div>
                     <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                        <SelectTrigger className="flex-1 min-w-[200px]"><SelectValue placeholder="Filter by Contractor" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Contractors</SelectItem>
                            {uniqueContractors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Net Payable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBills.length > 0 ? paginatedBills.map(bill => (
                  <TableRow 
                    key={bill.id} 
                    className="cursor-pointer"
                    onClick={() => {
                        setSelectedBill(bill);
                        setIsDetailsOpen(true);
                    }}
                  >
                    <TableCell>{bill.billNumber}</TableCell>
                    <TableCell>{format(bill.date, 'PP')}</TableCell>
                    <TableCell>{bill.contractorName}</TableCell>
                    <TableCell>₹{bill.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>₹{bill.netPayable.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      No bills match the current filters.
                    </TableCell>
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
      </div>

       <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Bill Details: {selectedBill?.billNumber}</DialogTitle>
                <DialogDescription>
                    Contractor: {selectedBill?.contractorName} | Date: {selectedBill ? format(selectedBill.date, 'PP') : ''}
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh]">
                <div className="md:col-span-1 space-y-2">
                    <h3 className="font-semibold">Billed Items</h3>
                    <div className="border rounded-md h-[calc(70vh-150px)] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead className="text-right">Rate</TableHead>
                                    <TableHead className="text-right">Photos</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedBill?.billedItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <div className="font-medium">{item.taskLabel}</div>
                                            <div className="text-sm text-muted-foreground">{item.workTile} - Flat {item.flatNo}</div>
                                        </TableCell>
                                        <TableCell className="text-right">₹{item.rate.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline" size="sm"
                                                disabled={!item.photos || item.photos.length === 0}
                                                onClick={() => {
                                                    setPhotosToShow(item.photos || []);
                                                    setIsPhotoDialogOpen(true);
                                                }}
                                            >
                                                <ImageIcon className="mr-2 h-4 w-4" /> ({item.photos?.length || 0})
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <div className="md:col-span-1 space-y-4">
                    <h3 className="font-semibold">Financial Summary</h3>
                    <div className="space-y-2 rounded-md border p-4">
                        <div className="flex justify-between"><span>Total Amount:</span><span className="font-medium">₹{selectedBill?.totalAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Advance:</span><span>- ₹{selectedBill?.advancePayment.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Penalty:</span><span>- ₹{selectedBill?.penalty.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Hold Amount:</span><span>- ₹{selectedBill?.holdAmount.toFixed(2)}</span></div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg"><span>Net Payable:</span><span>₹{selectedBill?.netPayable.toFixed(2)}</span></div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button
                    variant="outline"
                    onClick={() => {
                        if (selectedBill) {
                            setBillToPrint(selectedBill);
                        }
                    }}
                >
                    <Printer className="mr-2 h-4 w-4" /> Print Bill
                </Button>
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
                               <Image src={photo} alt={`Task Photo ${index + 1}`} fill style={{objectFit: 'contain'}} />
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
