'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAdminQuery } from '@/hooks/use-admin-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { ImageUploadField } from '@/components/image-upload-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  description: '',
  muscles: '',
  primaryMuscles: '',
  secondaryMuscles: '',
  imageUrl: '',
  videoUrl: '',
  muscleImageUrl: '',
  whyPoints: '',
  howPoints: '',
  beginnerPlan: '3 × 8',
  standardPlan: '3 × 12',
  advancedPlan: '4 × 15',
  restNote: 'Амралт: сет хооронд 45–60 сек',
  mistakes: '',
  targetReps: 15,
  sortOrder: 0,
  isPublished: true,
};

function lines(value?: string[] | null) {
  return (value || []).join('\n');
}

function splitLines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
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
      description: exercise.description || '',
      muscles: (exercise.muscles || []).join(', '),
      primaryMuscles: exercise.primaryMuscles || '',
      secondaryMuscles: exercise.secondaryMuscles || '',
      imageUrl: exercise.imageUrl || '',
      videoUrl: exercise.videoUrl || '',
      muscleImageUrl: exercise.muscleImageUrl || '',
      whyPoints: lines(exercise.whyPoints),
      howPoints: lines(exercise.howPoints),
      beginnerPlan: exercise.beginnerPlan || '3 × 8',
      standardPlan: exercise.standardPlan || '3 × 12',
      advancedPlan: exercise.advancedPlan || '4 × 15',
      restNote: exercise.restNote || 'Амралт: сет хооронд 45–60 сек',
      mistakes: lines(exercise.mistakes),
      targetReps: exercise.targetReps,
      sortOrder: exercise.sortOrder,
      isPublished: exercise.isPublished,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        muscles: form.muscles.split(',').map((item) => item.trim()).filter(Boolean),
        whyPoints: splitLines(form.whyPoints),
        howPoints: splitLines(form.howPoints),
        mistakes: splitLines(form.mistakes),
        imageUrl: form.imageUrl || null,
        videoUrl: form.videoUrl || null,
        muscleImageUrl: form.muscleImageUrl || null,
        targetReps: Number(form.targetReps),
        sortOrder: Number(form.sortOrder),
      };
      if (editing) await api.updateExercise(editing.id, payload);
      else await api.createExercise(payload);
      setOpen(false);
      load();
    } catch (error) {
      alert(error instanceof Error ? error.message : mn.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(mn.deleteExercise)) return;
    await api.deleteExercise(id);
    load();
  };

  return (
    <AdminShell title={mn.exercises}>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> {mn.addExercise}
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{editing ? mn.editExercise : mn.newExercise}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid gap-4">
              <ImageUploadField
                label={mn.imageUrl}
                value={form.imageUrl}
                onChange={(imageUrl) => setForm({ ...form, imageUrl })}
                folder="sunialt/exercises"
              />
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
                <Label>{mn.longDescription}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{mn.muscles}</Label>
                <Input value={form.muscles} onChange={(e) => setForm({ ...form, muscles: e.target.value })} />
              </div>
              <div className="rounded-lg border p-3 space-y-3">
                <div className="font-medium">{mn.introSection}</div>
                <div className="space-y-2">
                  <Label>{mn.videoUrl}</Label>
                  <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
                </div>
                <ImageUploadField
                  label={mn.muscleImageUrl}
                  value={form.muscleImageUrl}
                  onChange={(muscleImageUrl) => setForm({ ...form, muscleImageUrl })}
                  folder="sunialt/exercises/muscles"
                />
                <div className="space-y-2">
                  <Label>{mn.primaryMuscles}</Label>
                  <Input value={form.primaryMuscles} onChange={(e) => setForm({ ...form, primaryMuscles: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{mn.secondaryMuscles}</Label>
                  <Input value={form.secondaryMuscles} onChange={(e) => setForm({ ...form, secondaryMuscles: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{mn.whyPoints}</Label>
                  <Textarea rows={4} value={form.whyPoints} onChange={(e) => setForm({ ...form, whyPoints: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{mn.howPoints}</Label>
                  <Textarea rows={5} value={form.howPoints} onChange={(e) => setForm({ ...form, howPoints: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>{mn.beginnerPlan}</Label>
                    <Input value={form.beginnerPlan} onChange={(e) => setForm({ ...form, beginnerPlan: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{mn.standardPlan}</Label>
                    <Input value={form.standardPlan} onChange={(e) => setForm({ ...form, standardPlan: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{mn.advancedPlan}</Label>
                    <Input value={form.advancedPlan} onChange={(e) => setForm({ ...form, advancedPlan: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{mn.restNote}</Label>
                  <Input value={form.restNote} onChange={(e) => setForm({ ...form, restNote: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{mn.mistakes}</Label>
                  <Textarea rows={3} value={form.mistakes} onChange={(e) => setForm({ ...form, mistakes: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{mn.targetReps}</Label>
                <Input type="number" value={form.targetReps} onChange={(e) => setForm({ ...form, targetReps: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
                <Label>{mn.publish}</Label>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? mn.saving : editing ? mn.update : mn.create}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
                  <div className="flex items-center gap-3">
                    {exercise.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={exercise.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted" />
                    )}
                    <div>
                      <div className="font-medium">{exercise.title}</div>
                      <div className="text-xs text-muted-foreground">{exercise.summary}</div>
                    </div>
                  </div>
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
