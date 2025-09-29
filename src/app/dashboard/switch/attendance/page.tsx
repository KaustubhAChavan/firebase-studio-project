
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserCheck, Users, MoreVertical, Edit, CalendarIcon, PlusCircle, Trash2, Search } from 'lucide-react';
import { useAppContext, ContractorAttendanceData, CompanyAttendanceData, ContractorRateData, CompanyLaborData } from '@/context/AppContext';
import { useState, useMemo, useEffect } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/hooks/use-permissions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter } from '@/components/ui/alert-dialog';


const contractorAttendanceSchema = z.object({
  date: z.date(),
  contractorName: z.string().min(1, "Please select a contractor."),
  laborCount: z.object({
    mistri: z.coerce.number().min(0).default(0),
    helper: z.coerce.number().min(0).default(0),
    female: z.coerce.number().min(0).default(0),
  }),
});

const contractorRateSchema = z.object({
  mistri: z.coerce.number().min(0).default(0),
  helper: z.coerce.number().min(0).default(0),
  female: z.coerce.number().min(0).default(0),
});

const companyLaborSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Laborer name is required.'),
  phoneNo: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  wages: z.coerce.number().min(0, 'Daily wages must be a positive number.'),
});

const companyAttendanceSchema = z.object({
  date: z.date(),
  attendance: z.record(z.enum(['Present', 'Absent', 'Half Day'])),
});

export default function AttendancePage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    selectedProject,
    suppliers,
    contractorAttendance,
    setContractorAttendance,
    companyAttendance,
    setCompanyAttendance,
    contractorRates,
    setContractorRates,
    companyLaborers,
    setCompanyLaborers,
  } = useAppContext();
  const { hasPermission } = usePermissions();

  const [isContractorAttendanceDialogOpen, setIsContractorAttendanceDialogOpen] = useState(false);
  const [isContractorRateDialogOpen, setIsContractorRateDialogOpen] = useState(false);
  const [isCompanyLaborDialogOpen, setIsCompanyLaborDialogOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState<CompanyLaborData | null>(null);
  const [deletingLaborId, setDeletingLaborId] = useState<string | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [contractorSearchTerm, setContractorSearchTerm] = useState('');

  const isPastDate = startOfDay(selectedDate) < startOfDay(new Date());
  const canEditPast = hasPermission('full_access');
  const isAttendanceDisabled = isPastDate && !canEditPast;

  const projectContractors = useMemo(() => suppliers.filter(s => s.supplierType.includes('Contractor')), [suppliers]);

  const contractorAttendanceForm = useForm<z.infer<typeof contractorAttendanceSchema>>({
    resolver: zodResolver(contractorAttendanceSchema),
    defaultValues: { date: new Date(), laborCount: { mistri: 0, helper: 0, female: 0 } },
  });
  
  const contractorRateForm = useForm<z.infer<typeof contractorRateSchema>>({
    resolver: zodResolver(contractorRateSchema),
    defaultValues: { mistri: 0, helper: 0, female: 0 },
  });

  const companyLaborForm = useForm<z.infer<typeof companyLaborSchema>>({
    resolver: zodResolver(companyLaborSchema),
  });

  const companyAttendanceForm = useForm<z.infer<typeof companyAttendanceSchema>>({
    resolver: zodResolver(companyAttendanceSchema),
    defaultValues: {
      date: startOfDay(new Date()),
      attendance: companyLaborers.reduce((acc, labor) => {
        acc[labor.id] = 'Absent';
        return acc;
      }, {} as Record<string, 'Present' | 'Absent' | 'Half Day'>),
    },
  });

  const watchedCompanyDate = companyAttendanceForm.watch('date');

  useEffect(() => {
    const startOfWatchedDate = startOfDay(watchedCompanyDate);
    const existing = companyAttendance.find(att => att.projectName === selectedProject && startOfDay(att.date).getTime() === startOfWatchedDate.getTime());
    
    const defaultAttendance = companyLaborers.reduce((acc, labor) => {
        acc[labor.id] = existing?.attendance[labor.id] || 'Absent';
        return acc;
    }, {} as Record<string, 'Present' | 'Absent' | 'Half Day'>);
    
    companyAttendanceForm.setValue('attendance', defaultAttendance);
  }, [watchedCompanyDate, companyLaborers, companyAttendance, selectedProject, companyAttendanceForm]);

  const onContractorAttendanceSubmit = (data: z.infer<typeof contractorAttendanceSchema>) => {
    if (!selectedProject || !selectedContractor) return;
    
    const recordDate = startOfDay(data.date);
    const existingRecordIndex = contractorAttendance.findIndex(
      (att) =>
        att.projectName === selectedProject &&
        att.contractorName === selectedContractor &&
        startOfDay(att.date).getTime() === recordDate.getTime()
    );

    if (existingRecordIndex !== -1) {
        const updatedAttendance = [...contractorAttendance];
        updatedAttendance[existingRecordIndex] = {
            ...updatedAttendance[existingRecordIndex],
            laborCount: data.laborCount,
        };
        setContractorAttendance(updatedAttendance);
        toast({ title: 'Success!', description: 'Attendance has been updated.' });
    } else {
        const newRecord: ContractorAttendanceData = {
          id: crypto.randomUUID(),
          projectName: selectedProject,
          ...data,
          date: recordDate,
          contractorName: selectedContractor,
        };
        setContractorAttendance(prev => [...prev, newRecord]);
        toast({ title: 'Success!', description: 'Contractor attendance recorded.' });
    }

    setIsContractorAttendanceDialogOpen(false);
  };
  
  const onContractorRateSubmit = (data: z.infer<typeof contractorRateSchema>) => {
      if (!selectedProject || !selectedContractor) return;

      const existingRateIndex = contractorRates.findIndex(
        r => r.projectName === selectedProject && r.contractorName === selectedContractor
      );

      let newRates: ContractorRateData = {
        projectName: selectedProject,
        contractorName: selectedContractor,
        rates: data,
      };

      if (existingRateIndex !== -1) {
          const updatedRates = [...contractorRates];
          updatedRates[existingRateIndex] = newRates;
          setContractorRates(updatedRates);
      } else {
          setContractorRates(prev => [...prev, newRates]);
      }
      
      toast({ title: 'Success!', description: `Rates for ${selectedContractor} have been updated.` });
      setIsContractorRateDialogOpen(false);
  }

  const onCompanyLaborSubmit = (data: z.infer<typeof companyLaborSchema>) => {
    if (editingLabor) {
      setCompanyLaborers(prev => prev.map(l => l.id === editingLabor.id ? data : l));
      toast({ title: 'Success!', description: 'Laborer details updated.' });
    } else {
      setCompanyLaborers(prev => [...prev, data]);
      toast({ title: 'Success!', description: 'New laborer added.' });
    }
    setIsCompanyLaborDialogOpen(false);
    setEditingLabor(null);
  };

  const handleCompanyLaborDelete = () => {
    if (!deletingLaborId) return;
    setCompanyLaborers(prev => prev.filter(l => l.id !== deletingLaborId));
    setCompanyAttendance(prev => prev.map(att => {
        const newAttendance = { ...att.attendance };
        delete newAttendance[deletingLaborId];
        return { ...att, attendance: newAttendance };
    }));
    toast({ variant: 'destructive', title: 'Deleted!', description: 'Laborer has been removed.' });
    setDeletingLaborId(null);
  };
  
  const onCompanyAttendanceSubmit = (data: z.infer<typeof companyAttendanceSchema>) => {
    if (!selectedProject) return;
    const recordDate = startOfDay(data.date);
    const existingCompanyAttendanceForDate = companyAttendance.find(att => att.projectName === selectedProject && startOfDay(att.date).getTime() === recordDate.getTime());

    if (existingCompanyAttendanceForDate) {
      setCompanyAttendance(prev => prev.map(rec => 
        rec.id === existingCompanyAttendanceForDate.id ? { ...rec, attendance: data.attendance } : rec
      ));
      toast({ title: 'Success!', description: 'Company attendance updated.' });
    } else {
      const newRecord: CompanyAttendanceData = {
        id: crypto.randomUUID(),
        projectName: selectedProject,
        date: recordDate,
        attendance: data.attendance,
      };
      setCompanyAttendance(prev => [...prev, newRecord]);
      toast({ title: 'Success!', description: 'Company attendance recorded.' });
    }
  };

  const openAttendanceDialog = (contractorName: string) => {
      setSelectedContractor(contractorName);
      const existingRecord = contractorAttendance.find(att => 
        att.projectName === selectedProject &&
        att.contractorName === contractorName &&
        startOfDay(att.date).getTime() === startOfDay(selectedDate).getTime()
      );
      contractorAttendanceForm.reset({
          date: selectedDate,
          contractorName: contractorName,
          laborCount: existingRecord?.laborCount || { mistri: 0, helper: 0, female: 0 }
      });
      setIsContractorAttendanceDialogOpen(true);
  };
  
  const openRateDialog = (contractorName: string) => {
      setSelectedContractor(contractorName);
      const existingRate = contractorRates.find(r => r.projectName === selectedProject && r.contractorName === selectedContractor);
      contractorRateForm.reset(existingRate?.rates || { mistri: 0, helper: 0, female: 0 });
      setIsContractorRateDialogOpen(true);
  }

  const openLaborDialog = (labor: CompanyLaborData | null) => {
      setEditingLabor(labor);
      if (labor) {
          companyLaborForm.reset(labor);
      } else {
          companyLaborForm.reset({ id: crypto.randomUUID(), name: '', phoneNo: '', wages: 0 });
      }
      setIsCompanyLaborDialogOpen(true);
  };

  const getAttendanceForDate = (contractorName: string, date: Date) => {
    const record = contractorAttendance.find(att =>
      att.projectName === selectedProject &&
      att.contractorName === contractorName &&
      startOfDay(att.date).getTime() === startOfDay(date).getTime()
    );
    return record?.laborCount || { mistri: 0, helper: 0, female: 0 };
  }

  const filteredCompanyLaborers = useMemo(() =>
    companyLaborers.filter(l => l.name.toLowerCase().includes(companySearchTerm.toLowerCase())),
    [companyLaborers, companySearchTerm]
  );
  
  const filteredContractors = useMemo(() =>
    projectContractors.filter(c => c.supplierName.toLowerCase().includes(contractorSearchTerm.toLowerCase())),
    [projectContractors, contractorSearchTerm]
  );
  
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

       <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company"><UserCheck className="mr-2" /> Company Labor</TabsTrigger>
            <TabsTrigger value="contractor"><Users className="mr-2" /> Contractor Labor</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Company Labor Attendance</CardTitle>
                            <CardDescription>Mark daily attendance for your company's laborers on project: {selectedProject}.</CardDescription>
                        </div>
                        <Button onClick={() => openLaborDialog(null)}><PlusCircle className="mr-2 h-4 w-4" /> Add Labor</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...companyAttendanceForm}>
                    <form onSubmit={companyAttendanceForm.handleSubmit(onCompanyAttendanceSubmit)} className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end">
                            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                                <FormField
                                control={companyAttendanceForm.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Select Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={'outline'}
                                            className={cn('w-full sm:w-[240px] pl-3 text-left font-normal',!field.value && 'text-muted-foreground')}>
                                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={(date) => field.onChange(date || new Date())}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <div className="relative w-full sm:w-auto">
                                    <FormLabel>Search</FormLabel>
                                    <Search className="absolute left-3 top-[calc(1.75rem+8px)] -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name..."
                                        value={companySearchTerm}
                                        onChange={(e) => setCompanySearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={isAttendanceDisabled}>Save Attendance</Button>
                        </div>
                         <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                             <Table>
                                 <TableHeader><TableRow><TableHead>Laborer Name</TableHead><TableHead>Daily Wage</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                 <TableBody>
                                    {filteredCompanyLaborers.map(labor => (
                                        <TableRow key={labor.id}>
                                            <TableCell>{labor.name}</TableCell>
                                            <TableCell>₹{labor.wages}</TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={companyAttendanceForm.control}
                                                    name={`attendance.${labor.id}`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <RadioGroup
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                    className="flex justify-center space-x-4"
                                                                    disabled={isAttendanceDisabled}
                                                                >
                                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Present" /></FormControl><FormLabel className="font-normal">P</FormLabel></FormItem>
                                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Absent" /></FormControl><FormLabel className="font-normal">A</FormLabel></FormItem>
                                                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Half Day" /></FormControl><FormLabel className="font-normal">HD</FormLabel></FormItem>
                                                                </RadioGroup>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => openLaborDialog(labor)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setDeletingLaborId(labor.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                 </TableBody>
                             </Table>
                         </div>
                    </form>
                    </Form>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="contractor">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div>
                            <CardTitle>Contractor Labor Management</CardTitle>
                            <CardDescription>Log daily attendance or edit labor rates for each contractor on project: {selectedProject}.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name..."
                                    value={contractorSearchTerm}
                                    onChange={(e) => setContractorSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={'outline'}
                                    className={cn('w-full sm:w-[240px] pl-3 text-left font-normal', !selectedDate && 'text-muted-foreground')}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => setSelectedDate(startOfDay(date || new Date()))}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Contractor</TableHead><TableHead className="text-center">Mistri</TableHead><TableHead className="text-center">Helper</TableHead><TableHead className="text-center">Female</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredContractors.map(contractor => {
                                const attendance = getAttendanceForDate(contractor.supplierName, selectedDate);
                                return (
                                <TableRow key={contractor.supplierName}>
                                    <TableCell>
                                        <Button variant="link" className="p-0 h-auto" onClick={() => openAttendanceDialog(contractor.supplierName)} disabled={isAttendanceDisabled}>
                                            {contractor.supplierName}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-center">{attendance.mistri}</TableCell>
                                    <TableCell className="text-center">{attendance.helper}</TableCell>
                                    <TableCell className="text-center">{attendance.female}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => openRateDialog(contractor.supplierName)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit Rates
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
       </Tabs>

       {/* Contractor Attendance Dialog */}
       <Dialog open={isContractorAttendanceDialogOpen} onOpenChange={setIsContractorAttendanceDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Attendance for {selectedContractor}</DialogTitle>
                </DialogHeader>
                <Form {...contractorAttendanceForm}>
                    <form onSubmit={contractorAttendanceForm.handleSubmit(onContractorAttendanceSubmit)} className="space-y-4">
                        <FormField control={contractorAttendanceForm.control} name="date" render={({ field }) => (
                           <FormItem><FormLabel>Date</FormLabel><FormControl><Input value={format(field.value, 'PPP')} disabled /></FormControl></FormItem>
                        )}/>
                        <div className="grid grid-cols-3 gap-4">
                            <FormField control={contractorAttendanceForm.control} name="laborCount.mistri" render={({ field }) => (
                                <FormItem><FormLabel>Mistri</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={contractorAttendanceForm.control} name="laborCount.helper" render={({ field }) => (
                                <FormItem><FormLabel>Helper</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={contractorAttendanceForm.control} name="laborCount.female" render={({ field }) => (
                                <FormItem><FormLabel>Female</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <DialogFooter><Button type="submit">Save Attendance</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
       </Dialog>
       
       {/* Contractor Rate Dialog */}
       <Dialog open={isContractorRateDialogOpen} onOpenChange={setIsContractorRateDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Rates for {selectedContractor}</DialogTitle>
                    <DialogDescription>Set the daily wage for each labor type. This will be used in billing.</DialogDescription>
                </DialogHeader>
                 <Form {...contractorRateForm}>
                    <form onSubmit={contractorRateForm.handleSubmit(onContractorRateSubmit)} className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <FormField control={contractorRateForm.control} name="mistri" render={({ field }) => (
                                <FormItem><FormLabel>Mistri Rate</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={contractorRateForm.control} name="helper" render={({ field }) => (
                                <FormItem><FormLabel>Helper Rate</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={contractorRateForm.control} name="female" render={({ field }) => (
                                <FormItem><FormLabel>Female Rate</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <DialogFooter><Button type="submit">Save Rates</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
       </Dialog>

       {/* Company Labor Dialog */}
       <Dialog open={isCompanyLaborDialogOpen} onOpenChange={(open) => {
           if (!open) setEditingLabor(null);
           setIsCompanyLaborDialogOpen(open);
       }}>
           <DialogContent>
               <DialogHeader>
                   <DialogTitle>{editingLabor ? 'Edit' : 'Add'} Company Laborer</DialogTitle>
                   <DialogDescription>Enter the details for the company laborer.</DialogDescription>
               </DialogHeader>
               <Form {...companyLaborForm}>
                   <form onSubmit={companyLaborForm.handleSubmit(onCompanyLaborSubmit)} className="space-y-4">
                       <FormField control={companyLaborForm.control} name="name" render={({ field }) => (
                           <FormItem><FormLabel>Laborer Name</FormLabel><FormControl><Input placeholder="e.g. Ramesh" {...field} /></FormControl><FormMessage/></FormItem>
                       )} />
                       <FormField control={companyLaborForm.control} name="phoneNo" render={({ field }) => (
                           <FormItem><FormLabel>Phone No.</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage/></FormItem>
                       )} />
                       <FormField control={companyLaborForm.control} name="wages" render={({ field }) => (
                           <FormItem><FormLabel>Daily Wages (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g. 800" {...field} /></FormControl><FormMessage/></FormItem>
                       )} />
                       <DialogFooter>
                           <Button type="submit">{editingLabor ? 'Save Changes' : 'Add Laborer'}</Button>
                       </DialogFooter>
                   </form>
               </Form>
           </DialogContent>
       </Dialog>
        
        {/* Delete Confirmation */}
        <AlertDialog open={deletingLaborId !== null} onOpenChange={() => setDeletingLaborId(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent>
                    <AlertDialogDescriptionComponent>
                        This action cannot be undone. This will permanently delete the laborer and all their associated attendance data.
                    </AlertDialogDescriptionComponent>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeletingLaborId(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCompanyLaborDelete} className="bg-destructive hover:bg-destructive/90">Yes, delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

    