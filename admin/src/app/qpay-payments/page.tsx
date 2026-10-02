'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import {
  AdminTableCard,
  AdminTablePagination,
} from '@/components/admin-table-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { api, QpayPayment } from '@/lib/api';
import { mn } from '@/lib/mn';

function formatAmount(value: number | string) {
  return `${Number(value).toLocaleString('mn-MN')}₮`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('mn-MN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function paymentType(payment: QpayPayment) {
  if (payment.address?.startsWith('subscription:')) {
    const plan = payment.address.slice('subscription:'.length);
    if (plan === 'quarterly') return mn.subscriptionQuarterly;
    if (plan === 'yearly') return mn.subscriptionYearly;
    return mn.subscriptionMonthly;
  }
  return mn.productOrder;
}

export default function QpayPaymentsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [rowOverrides, setRowOverrides] = useState<Record<string, QpayPayment>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, loading, error } = useAdminQuery(
    () => api.getQpayPayments(page, pageSize),
    [page, pageSize, refreshKey]
  );

  const payments = (data?.payments ?? []).map(
    (payment) => rowOverrides[payment.id] ?? payment
  );
  const pagination = data?.pagination;

  const checkPayment = async (payment: QpayPayment) => {
    setCheckingId(payment.id);
    setActionError(null);
    try {
      const result = await api.checkQpayPayment(payment.id);
      setRowOverrides((current) => ({
        ...current,
        [payment.id]: result.payment,
      }));
      if (result.paid) setRefreshKey((current) => current + 1);
    } catch (checkError) {
      setActionError(
        checkError instanceof Error ? checkError.message : mn.requestFailed
      );
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <AdminShell title={mn.qpayPayments}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{mn.qpayPayments}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {pagination ? `${pagination.total} нэхэмжлэх` : mn.loading}
        </p>
      </div>

      {(error || actionError) && (
        <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {actionError || error}
        </div>
      )}

      <AdminTableCard>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">№</TableHead>
                <TableHead>{mn.qpayInvoice}</TableHead>
                <TableHead>{mn.user}</TableHead>
                <TableHead>{mn.paymentType}</TableHead>
                <TableHead>{mn.total}</TableHead>
                <TableHead>{mn.status}</TableHead>
                <TableHead>{mn.paymentDate}</TableHead>
                <TableHead className="text-right">{mn.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {mn.loading}
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {mn.noQpayPayments}
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment, index) => {
                  const isPaid = payment.paymentStatus === 'paid';
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="text-muted-foreground">
                        {(page - 1) * pageSize + index + 1}
                      </TableCell>
                      <TableCell className="max-w-64 font-mono text-xs">
                        <span className="block truncate" title={payment.qpayInvoiceId || payment.id}>
                          {payment.qpayInvoiceId || payment.id}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {payment.user?.displayName || mn.unknown}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {payment.user?.email || '—'}
                        </div>
                      </TableCell>
                      <TableCell>{paymentType(payment)}</TableCell>
                      <TableCell className="font-medium text-teal-600">
                        {formatAmount(payment.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isPaid
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }
                        >
                          {isPaid ? mn.paid : mn.unpaid}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(payment.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPaid && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={checkingId === payment.id}
                            onClick={() => checkPayment(payment)}
                            className="bg-teal-600 text-white hover:bg-teal-700"
                          >
                            {checkingId === payment.id
                              ? mn.checkingPayment
                              : mn.checkPayment}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {pagination && (
          <AdminTablePagination
            page={page}
            pageSize={pageSize}
            total={pagination.total}
            totalPages={pagination.pages}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </AdminTableCard>
    </AdminShell>
  );
}
