
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAppContext, PurchaseOrderData, GRNData, SiteTransferData } from '@/context/AppContext';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 40;

type UpcomingDelivery = (PurchaseOrderData & { type: 'PO' }) | (SiteTransferData & { type: 'Transfer' });

export default function UpcomingDeliveriesPage() {
  const router = useRouter();
  const { purchaseOrders, selectedProject, siteTransfers } = useAppContext();
  
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<UpcomingDelivery | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const upcomingDeliveries: UpcomingDelivery[] = useMemo(() => {
    const openPOs: UpcomingDelivery[] = purchaseOrders
      .filter(po => 
        po.projectName === selectedProject && 
        (po.status === 'Approved' || po.status === 'Partially Received')
      )
      .map(po => ({ ...po, type: 'PO' }));

    const openTransfers: UpcomingDelivery[] = siteTransfers
      .filter(st => 
        st.toProject === selectedProject && 
        (st.status === 'In Transit' || st.status === 'Partially Received')
      )
      .map(st => ({ ...st, type: 'Transfer' }));

    return [...openPOs, ...openTransfers].sort((a, b) => {
        const dateA = a.type === 'PO' ? a.expectedDeliveryDate : a.date;
        const dateB = b.type === 'PO' ? b.expectedDeliveryDate : b.date;
        return dateA.getTime() - dateB.getTime();
    });
  }, [purchaseOrders, siteTransfers, selectedProject]);
  
  const totalPages = Math.ceil(upcomingDeliveries.length / PAGE_SIZE);
  const paginatedDeliveries = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return upcomingDeliveries.slice(startIndex, startIndex + PAGE_SIZE);
  }, [upcomingDeliveries, currentPage]);

  const calculateTotal = (items: (PurchaseOrderData['items'] | SiteTransferData['items'])) => {
    return items.reduce((total, item) => total + item.quantity * item.rate, 0);
  };
  
  const getStatusColor = (status: PurchaseOrderData['status'] | SiteTransferData['status']) => {
    switch (status) {
      case 'Approved':
      case 'Completed': 
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Partially Received': 
      case 'In Transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDetailsClick = (delivery: UpcomingDelivery) => {
    setSelectedDelivery(delivery);
    setIsDetailsOpen(true);
  };


  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <Card>
          <CardHeader>
          <CardTitle>Upcoming Deliveries & Transfers</CardTitle>
          <CardDescription>A list of approved purchase orders and incoming site transfers for project: {selectedProject}.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Source No.</TableHead>
                      <TableHead>Supplier / From Project</TableHead>
                      <TableHead>Expected Date</TableHead>
                      <TableHead>Status</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {paginatedDeliveries.length > 0 ? paginatedDeliveries.map(delivery => (
                      <TableRow key={delivery.id} className="cursor-pointer" onClick={() => handleDetailsClick(delivery)}>
                          <TableCell><Badge variant={delivery.type === 'PO' ? 'secondary' : 'default'}>{delivery.type}</Badge></TableCell>
                          <TableCell className="font-medium">{delivery.type === 'PO' ? delivery.poNumber : delivery.transferNumber}</TableCell>
                          <TableCell>{delivery.type === 'PO' ? delivery.supplierName : delivery.fromProject}</TableCell>
                          <TableCell>{format(delivery.type === 'PO' ? delivery.expectedDeliveryDate : delivery.date, 'PP')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(delivery.status)}>
                                {delivery.status}
                            </Badge>
                          </TableCell>
                      </TableRow>
                  )) : (
                      <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">No upcoming deliveries or transfers.</TableCell>
                      </TableRow>
                  )}
                  </TableBody>
              </Table>
              <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => setCurrentPage(page)}
              />
          </CardContent>
      </Card>
      
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Details: {selectedDelivery?.type === 'PO' ? selectedDelivery.poNumber : selectedDelivery?.transferNumber}</DialogTitle>
            {selectedDelivery && (
              <DialogDescription>
                {selectedDelivery.type === 'PO' 
                    ? `Supplier: ${selectedDelivery.supplierName} | Date: ${format(selectedDelivery.date, 'PP')}`
                    : `From: ${selectedDelivery.fromProject} | Date: ${format(selectedDelivery.date, 'PP')}`
                }
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Quantity</TableHead>
              {selectedDelivery?.type === 'PO' && <><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></>}
              </TableRow></TableHeader>
              <TableBody>
                {selectedDelivery?.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.materialName}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    {selectedDelivery.type === 'PO' && <>
                        <TableCell className="text-right">₹{item.rate.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₹{(item.quantity * item.rate).toLocaleString()}</TableCell>
                    </>}
                  </TableRow>
                ))}
                {selectedDelivery?.type === 'PO' &&
                    <TableRow className="font-bold bg-muted/50"><TableCell colSpan={3} className="text-right">Total</TableCell><TableCell className="text-right">₹{calculateTotal(selectedDelivery.items).toLocaleString()}</TableCell></TableRow>
                }
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
