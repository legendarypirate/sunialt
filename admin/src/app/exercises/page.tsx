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
import { api, Exercise, ExerciseSetPlan } from '@/lib/api';
import { adminDrawerWidthClass } from '@/lib/layout';
import { mn } from '@/lib/mn';

const emptyForm = {
  title: '',
  level: 'Анхан шат',
  summary: '',
  description: '',
  muscles: '',
  primaryMuscles: '',
  secondaryMuscles: '',
  profileImageUrl: '',
  coverImageUrl: '',
  videoUrl: '',
  muscleImageUrl: '',
  whyPoints: '',
  howPoints: '',
  setPlans: [
    { label: 'Эхлэх', sets: 3, reps: 8, restSeconds: 60 },
    { label: 'Стандарт', sets: 3, reps: 12, restSeconds: 60 },
    { label: 'Хүчтэй', sets: 4, reps: 15, restSeconds: 90 },
  ] as ExerciseSetPlan[],
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
      profileImageUrl: exercise.profileImageUrl || exercise.imageUrl || '',
      coverImageUrl: exercise.coverImageUrl || exercise.imageUrl || '',
      videoUrl: exercise.videoUrl || '',
      muscleImageUrl: exercise.muscleImageUrl || '',
      whyPoints: lines(exercise.whyPoints),
      howPoints: lines(exercise.howPoints),
      setPlans: exercise.setPlans?.length ? exercise.setPlans : emptyForm.setPlans,
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
        profileImageUrl: form.profileImageUrl || null,
        coverImageUrl: form.coverImageUrl || null,
        imageUrl: form.coverImageUrl || form.profileImageUrl || null,
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
        <SheetContent side="right" className={`flex h-full w-full flex-col gap-0 overflow-hidden p-0 ${adminDrawerWidthClass}`}>
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle>{editing ? mn.editExercise : mn.newExercise}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid gap-4">
              <ImageUploadField
                label={mn.exerciseProfileImage}
                hint={mn.exerciseProfileImageHint}
                value={form.profileImageUrl}
                onChange={(profileImageUrl) => setForm({ ...form, profileImageUrl })}
                folder="sunialt/exercises/profile"
                showUrlInput={false}
              />
              <ImageUploadField
                label={mn.exerciseCoverImage}
                hint={mn.exerciseCoverImageHint}
                value={form.coverImageUrl}
                onChange={(coverImageUrl) => setForm({ ...form, coverImageUrl })}
                folder="sunialt/exercises/cover"
                showUrlInput={false}
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
                <div className="space-y-2">
                  <Label>{mn.setPlans}</Label>
                  <p className="text-xs text-muted-foreground">{mn.setPlansHint}</p>
                  {form.setPlans.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{mn.noSetPlans}</p>
                  ) : (
                    <div className="grid grid-cols-[1fr_4.5rem_4.5rem_6rem_2.25rem] items-center gap-2 text-xs text-muted-foreground">
                      <span>{mn.setPlanLabel}</span>
                      <span>{mn.setPlanSets}</span>
                      <span>{mn.setPlanReps}</span>
                      <span>{mn.setPlanRest}</span>
                      <span />
                    </div>
                  )}
                  {form.setPlans.map((plan, index) => {
                    const update = (patch: Partial<ExerciseSetPlan>) =>
                      setForm({
                        ...form,
                        setPlans: form.setPlans.map((item, i) => (i === index ? { ...item, ...patch } : item)),
                      });
                    return (
                      <div key={index} className="grid grid-cols-[1fr_4.5rem_4.5rem_6rem_2.25rem] items-center gap-2">
                        <Input value={plan.label} onChange={(e) => update({ label: e.target.value })} />
                        <Input type="number" min={1} value={plan.sets} onChange={(e) => update({ sets: Number(e.target.value) })} />
                        <Input type="number" min={1} value={plan.reps} onChange={(e) => update({ reps: Number(e.target.value) })} />
                        <Input type="number" min={0} value={plan.restSeconds} onChange={(e) => update({ restSeconds: Number(e.target.value) })} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setForm({ ...form, setPlans: form.setPlans.filter((_, i) => i !== index) })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm({
                        ...form,
                        setPlans: [...form.setPlans, { label: '', sets: 3, reps: 10, restSeconds: 60 }],
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> {mn.addSetPlan}
                  </Button>
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
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%] whitespace-normal">{mn.title}</TableHead>
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
                <TableCell className="whitespace-normal align-top">
                  <div className="flex min-w-0 items-start gap-3">
                    {(exercise.profileImageUrl || exercise.coverImageUrl || exercise.imageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={exercise.profileImageUrl || exercise.coverImageUrl || exercise.imageUrl || ''}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-md bg-muted" />
                    )}
                    <div className="min-w-0">
                      <div className="break-words font-medium">{exercise.title}</div>
                      <div className="break-words text-xs text-muted-foreground">{exercise.summary}</div>
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
