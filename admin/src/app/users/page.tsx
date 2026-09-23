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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, User } from '@/lib/api';
import { mn } from '@/lib/mn';

function formatSubscriptionDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('mn-MN');
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data, loading } = useAdminQuery(
    () => api.getUsers(1, query),
    [query]
  );
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (data?.users) setUsers(data.users);
  }, [data]);

  const togglePlus = async (user: User) => {
    const { user: updated } = await api.updateUser(user.id, {
      isPlusSubscriber: !user.isPlusSubscriber,
    });
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const toggleActive = async (user: User) => {
    const { user: updated } = await api.updateUser(user.id, {
      isActive: !user.isActive,
    });
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
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
                    <Switch checked={user.isPlusSubscriber} onCheckedChange={() => togglePlus(user)} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {user.isPlusSubscriber ? user.subscriptionPlan || 'Pro' : '—'}
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
