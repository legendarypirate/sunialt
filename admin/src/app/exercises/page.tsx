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
import { api, Exercise } from '@/lib/api';
import { mn } from '@/lib/mn';

const emptyForm = {
  title: '',
  level: 'Анхан шат',
  summary: '',
  muscles: '',
  targetReps: 15,
  sortOrder: 0,
  isPublished: true,
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data } = useAdminQuery(() => api.getExercises(), [refreshKey]);

  useEffect(() => {
    if (data?.exercises) setExercises(data.exercises);
  }, [data]);

  const load = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (exercise: Exercise) => {
    setEditing(exercise);
    setForm({
      title: exercise.title,
      level: exercise.level,
      summary: exercise.summary || '',
      muscles: (exercise.muscles || []).join(', '),
      targetReps: exercise.targetReps,
      sortOrder: exercise.sortOrder,
      isPublished: exercise.isPublished,
    });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      muscles: form.muscles.split(',').map((item) => item.trim()).filter(Boolean),
      targetReps: Number(form.targetReps),
      sortOrder: Number(form.sortOrder),
    };
    if (editing) await api.updateExercise(editing.id, payload);
    else await api.createExercise(payload);
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(mn.deleteExercise)) return;
    await api.deleteExercise(id);
    load();
  };

  return (
    <AdminShell title={mn.exercises}>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => { openCreate(); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> {mn.addExercise}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? mn.editExercise : mn.newExercise}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label>{mn.title}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.level}</Label>
                <Input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.summary}</Label>
                <Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.muscles}</Label>
                <Input value={form.muscles} onChange={(e) => setForm({ ...form, muscles: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.targetReps}</Label>
                <Input type="number" value={form.targetReps} onChange={(e) => setForm({ ...form, targetReps: Number(e.target.value) })} />
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
              <TableHead>{mn.level}</TableHead>
              <TableHead>{mn.targetReps}</TableHead>
              <TableHead>{mn.status}</TableHead>
              <TableHead className="text-right">{mn.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exercises.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">{mn.noExercises}</TableCell>
              </TableRow>
            ) : exercises.map((exercise) => (
              <TableRow key={exercise.id}>
                <TableCell>
                  <div className="font-medium">{exercise.title}</div>
                  <div className="text-xs text-muted-foreground">{exercise.summary}</div>
                </TableCell>
                <TableCell>{exercise.level}</TableCell>
                <TableCell>{exercise.targetReps}</TableCell>
                <TableCell>
                  <Badge variant={exercise.isPublished ? 'default' : 'secondary'}>
                    {exercise.isPublished ? mn.published : mn.draft}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(exercise)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(exercise.id)}>
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
