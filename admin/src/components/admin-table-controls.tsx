'use client';

import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from 'cn';

export function AdminTableCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      {children}
    </div>
  );
}

export function AdminTableToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'mb-3 flex min-h-11 items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm',
      className
    )}>
      {children}
    </div>
  );
}

export function AdminTableSearch({
  value,
  onChange,
  onSearch,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder: string;
  label: string;
}) {
  return (
    <AdminTableToolbar>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSearch();
          }}
          placeholder={placeholder}
          className="h-8 border-0 bg-transparent pl-9 text-sm shadow-none focus-visible:ring-0"
        />
      </div>
      <Button type="button" size="sm" onClick={onSearch} className="min-w-20">
        <Search className="size-4" />
        {label}
      </Button>
    </AdminTableToolbar>
  );
}

export function AdminTableActions({
  onEdit,
  onDelete,
  editLabel = 'Засах',
  deleteLabel = 'Устгах',
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {onEdit && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onEdit}
          aria-label={editLabel}
          title={editLabel}
          className="size-8"
        >
          <Pencil className="size-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={onDelete}
          aria-label={deleteLabel}
          title={deleteLabel}
          className="size-8"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

function pageItems(current: number, total: number): Array<number | string> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 4) [2, 3, 4, 5].forEach((page) => pages.add(page));
  if (current >= total - 3) {
    [total - 4, total - 3, total - 2, total - 1].forEach((page) => pages.add(page));
  }

  const sorted = [...pages].filter((page) => page > 0 && page <= total).sort((a, b) => a - b);
  const result: Array<number | string> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push(`ellipsis-${page}`);
    result.push(page);
  });
  return result;
}

export function AdminTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  loading = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [30, 50, 80, 100],
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}) {
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-2 border-t bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Бүгд {total} мэдээлэл, {first}–{last} дугаар / нийт {totalPages} хуудас
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-20 text-sm" aria-label="Нэг хуудсанд харуулах тоо">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
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
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="px-2"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Өмнөх</span>
          </Button>
          {pageItems(page, totalPages).map((item) =>
            typeof item === 'number' ? (
              <Button
                key={item}
                type="button"
                variant={item === page ? 'outline' : 'ghost'}
                size="icon"
                disabled={loading}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`${item}-р хуудас`}
                onClick={() => onPageChange(item)}
                className="size-8 text-sm"
              >
                {item}
              </Button>
            ) : (
              <span key={item} className="flex size-8 items-center justify-center text-muted-foreground">
                …
              </span>
            )
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="px-2"
          >
            <span className="hidden sm:inline">Дараах</span>
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
