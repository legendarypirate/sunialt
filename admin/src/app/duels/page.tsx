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

export default function DuelsPage() {
  const { data, loading } = useAdminQuery(() => api.getDuels());
  const duels = data?.duels || [];

  return (
    <AdminShell title={mn.duels}>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{mn.user}</TableHead>
              <TableHead>{mn.opponent}</TableHead>
              <TableHead>{mn.score}</TableHead>
              <TableHead>{mn.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">{mn.loading}</TableCell>
              </TableRow>
            ) : duels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">{mn.noDuels}</TableCell>
              </TableRow>
            ) : duels.map((duel) => (
              <TableRow key={duel.id}>
                <TableCell>{duel.user?.displayName || duel.user?.email}</TableCell>
                <TableCell>{duel.opponentName}</TableCell>
                <TableCell>{duel.userScore} : {duel.opponentScore}</TableCell>
                <TableCell><Badge>{duel.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
