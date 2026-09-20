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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, Workout } from '@/lib/api';
import { mn, workoutTypeLabels } from '@/lib/mn';

const emptyForm = {
  title: '',
  subtitle: '',
  level: '',
  tags: '',
  type: 'stretching',
  durationMinutes: 15,
  rewardMinutes: 5,
  sortOrder: 0,
  isPublished: true,
};

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data } = useAdminQuery(() => api.getWorkouts(), [refreshKey]);

  useEffect(() => {
    if (data?.workouts) setWorkouts(data.workouts);
  }, [data]);

  const load = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (workout: Workout) => {
    setEditing(workout);
    setForm({
      title: workout.title,
      subtitle: workout.subtitle || '',
      level: workout.level || '',
      tags: workout.tags.join(', '),
      type: workout.type,
      durationMinutes: workout.durationMinutes,
      rewardMinutes: workout.rewardMinutes,
      sortOrder: workout.sortOrder,
      isPublished: workout.isPublished,
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      durationMinutes: Number(form.durationMinutes),
      rewardMinutes: Number(form.rewardMinutes),
      sortOrder: Number(form.sortOrder),
    };

    if (editing) {
      await api.updateWorkout(editing.id, payload);
    } else {
      await api.createWorkout(payload);
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(mn.deleteWorkout)) return;
    await api.deleteWorkout(id);
    load();
  };

  return (
    <AdminShell title={mn.workouts}>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => { openCreate(); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> {mn.addWorkout}
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? mn.editWorkout : mn.newWorkout}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>{mn.title}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.subtitle}</Label>
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.level}</Label>
                <Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.tags}</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{mn.type}</Label>
                  <Select value={form.type} onValueChange={(v) => v && setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stretching">{workoutTypeLabels.stretching}</SelectItem>
                      <SelectItem value="core">{workoutTypeLabels.core}</SelectItem>
                      <SelectItem value="recovery">{workoutTypeLabels.recovery}</SelectItem>
                      <SelectItem value="push_up">{workoutTypeLabels.push_up}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{mn.durationMin}</Label>
                  <Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
                <Label>{mn.publish}</Label>
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
              <TableHead>{mn.title}</TableHead>
              <TableHead>{mn.type}</TableHead>
              <TableHead>{mn.level}</TableHead>
              <TableHead>{mn.duration}</TableHead>
              <TableHead>{mn.status}</TableHead>
              <TableHead className="text-right">{mn.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workouts.map((w) => (
              <TableRow key={w.id}>
                <TableCell>
                  <div className="font-medium">{w.title}</div>
                  <div className="text-xs text-muted-foreground">{w.subtitle}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{workoutTypeLabels[w.type] || w.type}</Badge>
                </TableCell>
                <TableCell className="text-sm">{w.level}</TableCell>
                <TableCell>{w.durationMinutes} {mn.min}</TableCell>
                <TableCell>
                  <Badge variant={w.isPublished ? 'default' : 'secondary'}>
                    {w.isPublished ? mn.published : mn.draft}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(w)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(w.id)}>
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
