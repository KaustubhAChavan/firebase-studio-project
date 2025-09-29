
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, CalendarIcon, Printer, ImageIcon } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { useAppContext, HoldReleaseData, AdvancePaymentData, LedgerEntry, ContractorBillData, PurchaseOrderData } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 40;

const releaseFormSchema = z.object({
    amount: z.coerce.number().positive('Amount must be positive.')
});

const advanceFormSchema = z.object({
    contractorName: z.string().min(1, 'Please select a contractor'),
    amount: z.coerce.number().positive('Amount must be positive.')
});

export default function LedgerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { contractorBills, purchaseOrders, suppliers, selectedProject, holdReleases, setHoldReleases, advancePayments, setAdvancePayments } = useAppContext();

  const [selectedParty, setSelectedParty] = useState('all');
  const [partyType, setPartyType] = useState<'all' | 'Contractor' | 'Supplier'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  const [isReleaseDialogOpen, setIsReleaseDialogOpen] = useState(false);
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const [contractorToRelease, setContractorToRelease] = useState<{name: string, holdAmount: number} | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<LedgerEntry | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<ContractorBillData | PurchaseOrderData | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);

  const releaseForm = useForm<z.infer<typeof releaseFormSchema>>({
    resolver: zodResolver(releaseFormSchema),
    defaultValues: { amount: 0 }
  });

  const advanceForm = useForm<z.infer<typeof advanceFormSchema>>({
    resolver: zodResolver(advanceFormSchema),
    defaultValues: { contractorName: '', amount: 0 }
  });
  
  const availableParties = useMemo(() => {
    const partySet = new Set<string>();
    suppliers.forEach(s => {
        if (partyType === 'all' || s.supplierType.includes(partyType)) {
            partySet.add(s.supplierName);
        }
    });
    return Array.from(partySet).sort();
  }, [suppliers, partyType]);
  
  const allTransactions = useMemo(() => {
    const transactions: LedgerEntry[] = [];

    contractorBills
      .filter(b => b.projectName === selectedProject)
      .forEach(bill => {
        transactions.push({
          id: bill.id,
          date: bill.date,
          partyName: bill.contractorName,
          partyType: 'Contractor',
          description: `Bill No: ${bill.billNumber}`,
          debit: bill.netPayable,
          credit: 0,
        });
      });

    purchaseOrders
      .filter(po => po.projectName === selectedProject && po.status === 'Approved')
      .forEach(po => {
        const totalAmount = po.items.reduce((acc, item) => acc + item.quantity * item.rate, 0);
        transactions.push({
          id: po.id,
          date: po.date,
          partyName: po.supplierName,
          partyType: 'Supplier',
          description: `PO No: ${po.poNumber}`,
          debit: 0,
          credit: totalAmount,
        });
      });
      
    holdReleases
      .filter(hr => hr.projectName === selectedProject)
      .forEach(release => {
          transactions.push({
              id: release.id,
              date: release.date,
              partyName: release.contractorName,
              partyType: 'Contractor',
              description: 'Hold Amount Released',
              debit: release.amount,
              credit: 0
          });
      });

    advancePayments
      .filter(adv => adv.projectName === selectedProject)
      .forEach(advance => {
          transactions.push({
              id: advance.id,
              date: advance.date,
              partyName: advance.contractorName,
              partyType: 'Contractor',
              description: 'Advance Paid',
              debit: 0,
              credit: advance.amount
          });
      });
      
    return transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [contractorBills, purchaseOrders, holdReleases, advancePayments, selectedProject]);
  
  const partyData = useMemo(() => {
    if (selectedParty === 'all') return null;
    
    let runningBalance = 0;
    const entries: (LedgerEntry & { balance: number })[] = [];
    
    allTransactions
      .filter(t => t.partyName === selectedParty)
      .filter(e => !dateRange?.from || (e.date >= dateRange.from! && e.date <= (dateRange.to || dateRange.from!)))
      .forEach(t => {
        runningBalance += t.credit - t.debit;
        entries.push({ ...t, balance: runningBalance });
      });

    const finalBalance = allTransactions
        .filter(t => t.partyName === selectedParty)
        .reduce((balance, t) => balance + t.credit - t.debit, 0);
        
    let currentHold = 0;
    let currentAdvance = 0;

    if (suppliers.find(s => s.supplierName === selectedParty)?.supplierType.includes('Contractor')) {
        const totalHold = contractorBills.filter(b => b.projectName === selectedProject && b.contractorName === selectedParty).reduce((sum, bill) => sum + bill.holdAmount, 0);
        const totalReleased = holdReleases.filter(hr => hr.projectName === selectedProject && hr.contractorName === selectedParty).reduce((sum, release) => sum + release.amount, 0);
        currentHold = totalHold - totalReleased;

        const totalAdvanceGiven = advancePayments.filter(adv => adv.projectName === selectedProject && adv.contractorName === selectedParty).reduce((sum, adv) => sum + adv.amount, 0);
        const totalAdvanceDeducted = contractorBills.filter(b => b.projectName === selectedProject && b.contractorName === selectedParty).reduce((sum, bill) => sum + bill.advancePayment, 0);
        currentAdvance = totalAdvanceGiven - totalAdvanceDeducted;
    }

    return { entries, finalBalance, currentHold, currentAdvance };
  }, [selectedParty, allTransactions, suppliers, contractorBills, holdReleases, advancePayments, selectedProject, dateRange]);

  const totalPages = Math.ceil((partyData?.entries.length || 0) / PAGE_SIZE);
  const paginatedEntries = useMemo(() => {
    if (!partyData) return [];
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return partyData.entries.slice(startIndex, startIndex + PAGE_SIZE).reverse();
  }, [partyData, currentPage]);
  
  const onReleaseSubmit = (data: z.infer<typeof releaseFormSchema>) => {
    if (!contractorToRelease || !selectedProject) return;

    if (data.amount > contractorToRelease.holdAmount) {
        releaseForm.setError("amount", { message: "Cannot release more than the hold amount."});
        return;
    }

    const newRelease: HoldReleaseData = {
        id: crypto.randomUUID(),
        contractorName: contractorToRelease.name,
        projectName: selectedProject,
        date: new Date(),
        amount: data.amount,
    };

    setHoldReleases(prev => [...prev, newRelease]);
    toast({ title: 'Success!', description: 'Hold amount has been released.' });
    setIsReleaseDialogOpen(false);
    setContractorToRelease(null);
    releaseForm.reset();
  };

  const onAdvanceSubmit = (data: z.infer<typeof advanceFormSchema>) => {
    if (!selectedProject) return;
    const newAdvance: AdvancePaymentData = {
        id: crypto.randomUUID(),
        contractorName: data.contractorName,
        projectName: selectedProject,
        date: new Date(),
        amount: data.amount,
    };
    setAdvancePayments(prev => [...prev, newAdvance]);
    toast({ title: 'Success!', description: 'Advance payment has been recorded.' });
    setIsAdvanceDialogOpen(false);
    advanceForm.reset();
  };

  const handleRowClick = (entry: LedgerEntry) => {
    setSelectedTransaction(entry);
    if (entry.description.startsWith('Bill No:')) {
      const bill = contractorBills.find(b => b.id === entry.id);
      setTransactionDetails(bill || null);
    } else if (entry.description.startsWith('PO No:')) {
      const po = purchaseOrders.find(p => p.id === entry.id);
      setTransactionDetails(po || null);
    } else {
      setTransactionDetails(null);
    }
    setIsDetailDialogOpen(true);
  };


  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4 print:hidden"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <Card>
        <CardHeader className="print:hidden">
           <div className="flex justify-between items-start">
            <div>
              <CardTitle>Party Ledger</CardTitle>
              <CardDescription>
                View financial transactions for suppliers and contractors on project: {selectedProject}.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Button onClick={() => setIsAdvanceDialogOpen(true)}>Give Advance</Button>
                <Button variant="outline" onClick={() => window.print()} disabled={selectedParty === 'all'}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           <div className="flex flex-col gap-4 mb-6 print:hidden">
              <div className="flex flex-wrap items-center gap-4">
                 <Select value={partyType} onValueChange={(v) => {
                     setPartyType(v as any);
                     setSelectedParty('all');
                 }}>
                  <SelectTrigger className="flex-1 min-w-[200px]"><SelectValue placeholder="Filter by Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Contractor">Contractor</SelectItem>
                    <SelectItem value="Supplier">Supplier</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedParty} onValueChange={setSelectedParty}>
                  <SelectTrigger className="flex-1 min-w-[200px]"><SelectValue placeholder="Select a Party" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Select a Party</SelectItem>
                    {availableParties.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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
            
            {selectedParty !== 'all' && partyData && (
                 <div className="border rounded-md p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <h3 className="text-lg font-semibold md:col-span-4">
                            Ledger for: {selectedParty}
                        </h3>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Current Hold:</span>
                            <span className="font-semibold">₹{partyData.currentHold.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Current Advance:</span>
                            <span className="font-semibold">₹{partyData.currentAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Closing Balance:</span>
                            <span className="font-bold">
                                ₹{Math.abs(partyData.finalBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-muted-foreground ml-1 font-medium">{partyData.finalBalance > 0 ? 'Cr' : partyData.finalBalance < 0 ? 'Dr' : ''}</span>
                            </span>
                        </div>
                         {partyData.currentHold > 0 && (
                            <Button size="sm" variant="outline" onClick={() => {
                                setContractorToRelease({ name: selectedParty, holdAmount: partyData.currentHold });
                                releaseForm.reset({ amount: partyData.currentHold });
                                setIsReleaseDialogOpen(true);
                            }}>Release Hold</Button>
                        )}
                    </div>
                    <Separator className="my-4" />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Date</TableHead>
                                <TableHead>Particulars</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                                <TableHead className="text-right w-[150px]">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedEntries.length > 0 ? (
                                paginatedEntries.map(entry => (
                                    <TableRow key={entry.id} onClick={() => handleRowClick(entry)} className="cursor-pointer">
                                        <TableCell>{format(entry.date, 'PP')}</TableCell>
                                        <TableCell>{entry.description}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            ₹{Math.abs(entry.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            <span className="text-muted-foreground ml-1">{entry.balance > 0 ? 'Cr' : 'Dr'}</span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center">No transactions for this party in the selected period.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                     <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                      />
                 </div>
            )}
        </CardContent>
      </Card>
      
      <Dialog open={isReleaseDialogOpen} onOpenChange={setIsReleaseDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Release Hold Amount</DialogTitle>
                  <DialogDescription>
                      For {contractorToRelease?.name}. Current hold is ₹{contractorToRelease?.holdAmount.toFixed(2)}.
                  </DialogDescription>
              </DialogHeader>
              <Form {...releaseForm}>
                  <form onSubmit={releaseForm.handleSubmit(onReleaseSubmit)} className="space-y-4">
                      <FormField
                          control={releaseForm.control}
                          name="amount"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Amount to Release</FormLabel>
                                  <FormControl><Input type="number" {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <DialogFooter>
                          <Button type="submit">Release</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>
      <Dialog open={isAdvanceDialogOpen} onOpenChange={setIsAdvanceDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Give Advance Payment</DialogTitle>
                  <DialogDescription>
                    Record an advance payment to a contractor. This will appear as a debit in their ledger.
                  </DialogDescription>
              </DialogHeader>
              <Form {...advanceForm}>
                  <form onSubmit={advanceForm.handleSubmit(onAdvanceSubmit)} className="space-y-4">
                      <FormField
                          control={advanceForm.control}
                          name="contractorName"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Contractor</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a contractor" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {suppliers.filter(s => s.supplierType.includes('Contractor')).map(c => 
                                        <SelectItem key={c.supplierName} value={c.supplierName}>{c.supplierName}</SelectItem>
                                        )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={advanceForm.control}
                          name="amount"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Advance Amount</FormLabel>
                                  <FormControl><Input type="number" {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <DialogFooter>
                          <Button type="submit">Record Advance</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>

       <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
                 <DialogDescription>
                    {selectedTransaction?.description} for {selectedTransaction?.partyName} on {selectedTransaction ? format(selectedTransaction.date, 'PP') : ''}
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
            {transactionDetails && 'billNumber' in transactionDetails ? (
                <>
                    <Table>
                        <TableHeader><TableRow><TableHead>Task</TableHead><TableHead className="text-right">Rate</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {transactionDetails.billedItems.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <div className="font-medium">{item.taskLabel}</div>
                                    <div className="text-sm text-muted-foreground">{item.workTile} - Flat {item.flatNo}</div>
                                </TableCell>
                                <TableCell className="text-right">₹{item.rate.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    <div className="space-y-2 rounded-md border p-4 mt-4">
                        <div className="flex justify-between"><span>Total Amount:</span><span className="font-medium">₹{transactionDetails.totalAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Advance:</span><span>- ₹{transactionDetails.advancePayment.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Penalty:</span><span>- ₹{transactionDetails.penalty.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Hold Amount:</span><span>- ₹{transactionDetails.holdAmount.toFixed(2)}</span></div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg"><span>Net Payable:</span><span>₹{transactionDetails.netPayable.toFixed(2)}</span></div>
                    </div>
                </>
            ) : transactionDetails && 'poNumber' in transactionDetails ? (
                <Table>
                    <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {transactionDetails.items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{item.materialName}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">₹{item.rate.toFixed(2)}</TableCell>
                                <TableCell className="text-right">₹{(item.quantity * item.rate).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                         <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={3} className="text-right">Total Amount</TableCell>
                            <TableCell className="text-right">₹{transactionDetails.items.reduce((acc, item) => acc + item.quantity * item.rate, 0).toFixed(2)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            ) : (
                 <div className="p-4 rounded-md border">
                    <p><strong>Date:</strong> {selectedTransaction && format(selectedTransaction.date, 'PP')}</p>
                    <p><strong>Description:</strong> {selectedTransaction?.description}</p>
                    <p><strong>Amount:</strong> ₹{selectedTransaction && Math.abs(selectedTransaction.debit - selectedTransaction.credit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
            )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
