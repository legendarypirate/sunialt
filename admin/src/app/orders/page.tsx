'use client';

import { AdminShell } from '@/components/admin-shell';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { mn } from '@/lib/mn';

export default function OrdersPage() {
  const { data, loading } = useAdminQuery(() => api.getOrders());
  const orders = data?.orders || [];

  return (
    <AdminShell title={mn.orders}>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{mn.user}</TableHead>
              <TableHead>{mn.phone}</TableHead>
              <TableHead>{mn.items}</TableHead>
              <TableHead>{mn.total}</TableHead>
              <TableHead>{mn.payment}</TableHead>
              <TableHead>{mn.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">{mn.loading}</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">{mn.noOrders}</TableCell>
              </TableRow>
            ) : orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.user?.displayName || order.user?.email}</TableCell>
                <TableCell>
                  <div>{order.phone || '—'}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{order.address}</div>
                </TableCell>
                <TableCell>{order.items?.map((item) => `${item.title} ×${item.quantity}`).join(', ')}</TableCell>
                <TableCell>{Number(order.total).toLocaleString()}₮</TableCell>
                <TableCell><Badge>{order.paymentStatus || order.status}</Badge></TableCell>
                <TableCell><Badge>{order.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
