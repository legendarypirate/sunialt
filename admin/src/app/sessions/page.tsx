'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { AdminTableActions, AdminTableCard } from '@/components/admin-table-controls';
import { useAdminQuery } from '@/hooks/use-admin-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, WorkoutSession } from '@/lib/api';
import { mn } from '@/lib/mn';

export default function SessionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading } = useAdminQuery(() => api.getSessions(1), [refreshKey]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    if (data?.sessions) setSessions(data.sessions);
  }, [data]);

  const load = useCallback(() => setRefreshKey((k) => k + 1), []);

  const remove = async (id: string) => {
    if (!confirm(mn.deleteSession)) return;
    await api.deleteSession(id);
    load();
  };

  return (
    <AdminShell title={mn.sessions}>
      <AdminTableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{mn.user}</TableHead>
              <TableHead>{mn.title}</TableHead>
              <TableHead>{mn.reps}</TableHead>
              <TableHead>{mn.type}</TableHead>
              <TableHead>{mn.completedAt}</TableHead>
              <TableHead className="text-right">{mn.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">{mn.loading}</TableCell>
              </TableRow>
            ) : sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">{mn.noSessions}</TableCell>
              </TableRow>
            ) : sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <div className="font-medium">{session.user?.displayName || mn.unknown}</div>
                  <div className="text-xs text-muted-foreground">{session.user?.email}</div>
                </TableCell>
                <TableCell>{session.exerciseTitle}</TableCell>
                <TableCell>{session.repCount}</TableCell>
                <TableCell>{session.source}</TableCell>
                <TableCell>{new Date(session.completedAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <AdminTableActions onDelete={() => remove(session.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>
    </AdminShell>
  );
}
