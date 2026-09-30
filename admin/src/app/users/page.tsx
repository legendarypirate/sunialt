'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import {
  AdminTableActions,
  AdminTableCard,
  AdminTablePagination,
  AdminTableSearch,
} from '@/components/admin-table-controls';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, SubscriptionPlanId, User } from '@/lib/api';
import { mn } from '@/lib/mn';

function formatSubscriptionDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('mn-MN');
}

function userPlanValue(user: User): string {
  if (!user.isPlusSubscriber) return 'none';
  const plan = user.subscriptionPlan || '';
  if (plan.includes('3 сар')) return 'quarterly';
  if (plan.includes('1 жил')) return 'yearly';
  return 'monthly';
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const { data, loading } = useAdminQuery(
    () => api.getUsers(page, query, pageSize),
    [page, query, pageSize]
  );
  const [userOverrides, setUserOverrides] = useState<Record<string, User>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const pagination = data?.pagination;
  const users = (data?.users ?? [])
    .filter((user) => !deletedIds.has(user.id))
    .map((user) => userOverrides[user.id] ?? user);

  const applySearch = () => {
    setPage(1);
    setQuery(search.trim());
  };

  const updateUserRow = (updated: User) => {
    setUserOverrides((previous) => ({ ...previous, [updated.id]: updated }));
  };

  const assignPlan = async (user: User, value: string) => {
    setAssigningId(user.id);
    try {
      if (value === 'none') {
        const { user: updated } = await api.revokeUserSubscription(user.id);
        updateUserRow(updated);
        return;
      }
      const { user: updated } = await api.grantUserSubscription(
        user.id,
        value as SubscriptionPlanId,
        true
      );
      updateUserRow(updated);
    } catch (error) {
      alert(error instanceof Error ? error.message : mn.subscriptionGrantFailed);
    } finally {
      setAssigningId(null);
    }
  };

  const togglePlus = async (user: User) => {
    if (user.isPlusSubscriber) {
      await assignPlan(user, 'none');
      return;
    }
    await assignPlan(user, 'monthly');
  };

  const toggleActive = async (user: User) => {
    const { user: updated } = await api.updateUser(user.id, {
      isActive: !user.isActive,
    });
    updateUserRow(updated);
  };

  const remove = async (user: User) => {
    if (!confirm(mn.deleteUser)) return;
    await api.deleteUser(user.id);
    if (users.length === 1 && page > 1) {
      setPage((current) => current - 1);
    } else {
      setDeletedIds((previous) => new Set(previous).add(user.id));
    }
  };

  const columnCount = 12;

  return (
    <AdminShell title={mn.users}>
      <AdminTableSearch
        value={search}
        onChange={setSearch}
        onSearch={applySearch}
        placeholder={mn.searchPlaceholder}
        label={mn.search}
      />

      <AdminTableCard>
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{mn.name}</TableHead>
              <TableHead>{mn.email}</TableHead>
              <TableHead>{mn.google}</TableHead>
              <TableHead>{mn.streak}</TableHead>
              <TableHead>{mn.workouts}</TableHead>
              <TableHead>{mn.reps}</TableHead>
              <TableHead>{mn.plus}</TableHead>
              <TableHead>{mn.subscriptionPlan}</TableHead>
              <TableHead>{mn.subscriptionStart}</TableHead>
              <TableHead>{mn.subscriptionEnd}</TableHead>
              <TableHead>{mn.active}</TableHead>
              <TableHead className="text-right">{mn.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  {mn.loading}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  {mn.noUsersFound}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.displayName || '—'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.googleId ? <Badge>{mn.google}</Badge> : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.streakDays} {mn.days}</Badge>
                  </TableCell>
                  <TableCell>{user.completedWorkouts}</TableCell>
                  <TableCell>{user.totalPushUps || 0}</TableCell>
                  <TableCell>
                    <Switch
                      size="sm"
                      checked={user.isPlusSubscriber}
                      disabled={assigningId === user.id}
                      onCheckedChange={() => togglePlus(user)}
                    />
                  </TableCell>
                  <TableCell className="min-w-35">
                    <Select
                      value={userPlanValue(user)}
                      disabled={assigningId === user.id}
                      onValueChange={(value) => {
                        if (value && value !== userPlanValue(user)) {
                          assignPlan(user, value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{mn.subscriptionNone}</SelectItem>
                        <SelectItem value="monthly">{mn.subscriptionMonthly}</SelectItem>
                        <SelectItem value="quarterly">{mn.subscriptionQuarterly}</SelectItem>
                        <SelectItem value="yearly">{mn.subscriptionYearly}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {user.isPlusSubscriber ? formatSubscriptionDate(user.subscriptionStartedAt) : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {user.isPlusSubscriber ? formatSubscriptionDate(user.subscriptionRenewsAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <Switch size="sm" checked={user.isActive} onCheckedChange={() => toggleActive(user)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminTableActions onDelete={() => remove(user)} />
                  </TableCell>
                </TableRow>
              ))
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
