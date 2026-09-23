'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
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

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const { data, loading } = useAdminQuery(
    () => api.getUsers(1, query),
    [query]
  );
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (data?.users) setUsers(data.users);
  }, [data]);

  const updateUserRow = (updated: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
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
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  };

  const columnCount = 12;

  return (
    <AdminShell title={mn.users}>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder={mn.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setQuery(search)} variant="secondary">{mn.search}</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
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
                  <TableCell className="min-w-[140px]">
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
    </AdminShell>
  );
}
