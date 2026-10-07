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
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                className={`group transition-colors duration-100 hover:bg-teal-50/30 ${
                  idx % 2 === 1 ? 'bg-slate-50/25' : 'bg-white'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 align-middle text-slate-700 ${col.className ?? ''}`}
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
