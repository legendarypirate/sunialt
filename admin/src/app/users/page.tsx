'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

function paginationItems(current: number, total: number): Array<number | string> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 4) {
    [2, 3, 4, 5].forEach((page) => pages.add(page));
  }
  if (current >= total - 3) {
    [total - 4, total - 3, total - 2, total - 1].forEach((page) => pages.add(page));
  }

  const sorted = [...pages].filter((page) => page > 0 && page <= total).sort((a, b) => a - b);
  const result: Array<number | string> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      result.push(`ellipsis-${page}`);
    }
    result.push(page);
  });
  return result;
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
      <div className="mb-4 flex gap-2">
        <Input
          placeholder={mn.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
          className="max-w-sm"
        />
        <Button onClick={applySearch} variant="secondary">{mn.search}</Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
                      <SelectTrigger className="h-9">
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
                    <Switch checked={user.isActive} onCheckedChange={() => toggleActive(user)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => remove(user)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>

        {pagination && pagination.total > 0 && (
          <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Бүгд {pagination.total} мэдээлэл, {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, pagination.total)} дугаар / нийт {pagination.pages} хуудас
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-20.5" aria-label="Нэг хуудсанд харуулах тоо">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[30, 50, 80, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <nav className="flex items-center gap-1" aria-label="Хуудас сонгох">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="gap-1 px-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Өмнөх</span>
                </Button>

                {paginationItems(page, pagination.pages).map((item) =>
                  typeof item === 'number' ? (
                    <Button
                      key={item}
                      type="button"
                      variant={item === page ? 'outline' : 'ghost'}
                      size="icon"
                      disabled={loading}
                      aria-current={item === page ? 'page' : undefined}
                      aria-label={`${item}-р хуудас`}
                      onClick={() => setPage(item)}
                      className="h-9 w-9"
                    >
                      {item}
                    </Button>
                  ) : (
                    <span key={item} className="flex h-9 w-7 items-center justify-center text-muted-foreground">
                      …
                    </span>
                  )
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={page >= pagination.pages || loading}
                  onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
                  className="gap-1 px-2"
                >
                  <span className="hidden sm:inline">Дараах</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
