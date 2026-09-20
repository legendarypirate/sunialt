'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, Challenge } from '@/lib/api';
import { mn, challengeKindLabels } from '@/lib/mn';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const emptyForm = {
  name: '',
  kind: 'daily',
  description: '',
  durationDays: 21,
  weeklyGoalDays: 5,
  timeLimitSeconds: '',
  startDate: '',
  endDate: '',
  isActive: true,
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data } = useAdminQuery(() => api.getChallenges(), [refreshKey]);

  useEffect(() => {
    if (data?.challenges) setChallenges(data.challenges);
  }, [data]);

  const load = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Challenge) => {
    setEditing(c);
    setForm({
      name: c.name,
      kind: c.kind || 'daily',
      description: c.description || '',
      durationDays: c.durationDays,
      weeklyGoalDays: c.weeklyGoalDays,
      timeLimitSeconds: c.timeLimitSeconds ? String(c.timeLimitSeconds) : '',
      startDate: c.startDate || '',
      endDate: c.endDate || '',
      isActive: c.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      durationDays: Number(form.durationDays),
      weeklyGoalDays: Number(form.weeklyGoalDays),
      timeLimitSeconds: form.timeLimitSeconds ? Number(form.timeLimitSeconds) : null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    };

    if (editing) {
      await api.updateChallenge(editing.id, payload);
    } else {
      await api.createChallenge(payload);
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(mn.deleteChallenge)) return;
    await api.deleteChallenge(id);
    load();
  };

  return (
    <AdminShell title={mn.challenges}>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => { openCreate(); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> {mn.addChallenge}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? mn.editChallenge : mn.newChallenge}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>{mn.name}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.type}</Label>
                <Select value={form.kind} onValueChange={(v) => v && setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(challengeKindLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{mn.description}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{mn.durationDays}</Label>
                  <Input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>{mn.weeklyGoalDays}</Label>
                  <Input type="number" value={form.weeklyGoalDays} onChange={(e) => setForm({ ...form, weeklyGoalDays: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{mn.timeLimit}</Label>
                <Input type="number" value={form.timeLimitSeconds} onChange={(e) => setForm({ ...form, timeLimitSeconds: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label>{mn.active}</Label>
              </div>
              <Button onClick={save}>{editing ? mn.update : mn.create}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{mn.name}</TableHead>
              <TableHead>{mn.type}</TableHead>
              <TableHead>{mn.durationDays}</TableHead>
              <TableHead>{mn.weeklyGoalDays}</TableHead>
              <TableHead>{mn.status}</TableHead>
              <TableHead className="text-right">{mn.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{c.description}</div>
                </TableCell>
                <TableCell>{challengeKindLabels[c.kind || 'daily'] || c.kind}</TableCell>
                <TableCell>{c.durationDays} {mn.days}</TableCell>
                <TableCell>{c.weeklyGoalDays} {mn.daysPerWeek}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? 'default' : 'secondary'}>
                    {c.isActive ? mn.active : mn.inactive}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminShell>
  );
}
