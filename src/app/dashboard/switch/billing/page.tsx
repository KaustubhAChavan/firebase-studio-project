
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Calculator,
  HardHat,
  BookText,
  ChevronDown,
  Building,
  Construction,
  FileText,
  ShoppingCart,
  BadgeCheck,
  Warehouse,
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useMemo } from 'react';
import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, Cell, XAxis, YAxis, Legend, Tooltip as RechartsTooltip } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export default function BillingPage() {
  const router = useRouter();
  const { selectedProject, contractorBills, holdReleases, advancePayments } = useAppContext();

  const billingData = useMemo(() => {
    if (!selectedProject) return null;

    const projectBills = contractorBills.filter(b => b.projectName === selectedProject);

    const totalBilled = projectBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalPayable = projectBills.reduce((sum, bill) => sum + bill.netPayable, 0);

    const totalHold = projectBills.reduce((sum, bill) => sum + bill.holdAmount, 0);
    const totalReleased = holdReleases
      .filter(hr => hr.projectName === selectedProject)
      .reduce((sum, release) => sum + release.amount, 0);
    const outstandingHold = totalHold - totalReleased;
    
    const totalAdvanceGiven = advancePayments
      .filter(adv => adv.projectName === selectedProject)
      .reduce((sum, adv) => sum + adv.amount, 0);
    const totalAdvanceDeducted = projectBills.reduce((sum, bill) => sum + bill.advancePayment, 0);
    const outstandingAdvance = totalAdvanceGiven - totalAdvanceDeducted;
    
    const billedByContractor = projectBills.reduce((acc, bill) => {
        if (!acc[bill.contractorName]) {
            acc[bill.contractorName] = 0;
        }
        acc[bill.contractorName] += bill.totalAmount;
        return acc;
    }, {} as Record<string, number>);

    const billedByContractorData = Object.entries(billedByContractor)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a,b) => b.amount - a.amount);

    const billedByWorkType = projectBills.reduce((acc, bill) => {
        bill.billedItems.forEach(item => {
            if (!acc[item.workTile]) {
                acc[item.workTile] = 0;
            }
            acc[item.workTile] += item.rate;
        });
        return acc;
    }, {} as Record<string, number>);

    const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    const billedByWorkTypeData = Object.entries(billedByWorkType)
      .map(([name, value], index) => ({ name, value, fill: COLORS[index % COLORS.length] }))
      .filter(d => d.value > 0);

    return {
      totalBilled,
      totalPayable,
      outstandingHold,
      outstandingAdvance,
      billedByContractorData,
      billedByWorkTypeData
    };
  }, [selectedProject, contractorBills, holdReleases, advancePayments]);
  
  const billedByContractorChartConfig = useMemo(() => ({
    amount: {
      label: "Amount (₹)",
      color: "hsl(var(--chart-1))",
    },
  }), []);

  const billedByWorkTypeChartConfig = useMemo(() => ({
    amount: {
      label: "Amount (₹)",
    },
  }), []);

  if (!billingData) {
    return (
      <div className="space-y-6">
        <p>Loading project data...</p>
      </div>
    );
  }

  const {
      totalBilled, totalPayable, outstandingHold, outstandingAdvance,
      billedByContractorData, billedByWorkTypeData
  } = billingData;

  const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Billing Hub</h2>
          <p className="text-muted-foreground">
            An overview of all billing activities for project: {selectedProject}.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Main Dashboard
        </Button>
      </div>

       <Card>
        <CardContent className="p-6 flex flex-wrap gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <Calculator className="mr-2 h-4 w-4" />
                        Set Work Amount
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/billing/set-work-amount/rcc">
                            <Building className="mr-2 h-4 w-4" />
                            RCC Amount
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/billing/set-work-amount/other">
                            <Construction className="mr-2 h-4 w-4" />
                            Other Work Amount
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <HardHat className="mr-2 h-4 w-4" />
                        Contractor Billing
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/billing/contractor/rcc">
                            <Building className="mr-2 h-4 w-4" />
                            RCC
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/billing/contractor/other">
                            <Construction className="mr-2 h-4 w-4" />
                            Other
                        </Link>
                    </DropdownMenuItem>
                     <DropdownMenuItem asChild>
                        <Link href="/dashboard/switch/billing/contractor/bills">
                            <FileText className="mr-2 h-4 w-4" />
                           Bill History
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            
            <Button asChild variant="outline">
                <Link href="/dashboard/switch/material/approvals">
                    <BadgeCheck className="mr-2 h-4 w-4" />
                    Approvals
                </Link>
            </Button>

            <Button asChild variant="outline">
                <Link href="/dashboard/switch/billing/ledger">
                    <BookText className="mr-2 h-4 w-4" />
                    Ledger
                </Link>
            </Button>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
            <CardHeader><CardTitle>Total Billed</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalBilled)}</p>
                <p className="text-xs text-muted-foreground">Across all contractors</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Total Net Payable</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalPayable)}</p>
                 <p className="text-xs text-muted-foreground">After deductions</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Outstanding Hold</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(outstandingHold)}</p>
                 <p className="text-xs text-muted-foreground">Amount currently on hold</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Outstanding Advance</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(outstandingAdvance)}</p>
                 <p className="text-xs text-muted-foreground">Advance paid but not yet deducted</p>
            </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Billed Amount by Contractor</CardTitle>
            <CardDescription>Total amount billed to each contractor.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={billedByContractorChartConfig} className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={billedByContractorData} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <XAxis type="number" tickFormatter={(value) => formatCurrency(value as number)} />
                        <YAxis dataKey="name" type="category" width={120} tickLine={false} axisLine={false} />
                        <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                        <Bar dataKey="amount" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billed Amount by Work Type</CardTitle>
            <CardDescription>Distribution of billed work across different types.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={billedByWorkTypeChartConfig} className="mx-auto aspect-square h-80">
              <PieChart>
                <RechartsTooltip content={<ChartTooltipContent formatter={(value, name) => `${name}: ${formatCurrency(value as number)}`} hideLabel />} />
                <Pie data={billedByWorkTypeData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                  {billedByWorkTypeData.map((entry) => ( <Cell key={entry.name} fill={entry.fill} /> ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
