import type { ReactNode } from 'react';
import { EmptyState } from './ui';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage = 'No records found',
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
  if (!rows.length) return <EmptyState message={emptyMessage} />;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgb(15_23_42_/_0.04),0_8px_24px_rgb(15_23_42_/_0.05)]">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-50/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                className={`border-t border-slate-100 transition hover:bg-brand-50/40 ${idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 align-middle text-slate-700 ${col.className ?? ''}`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
