import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// Skeleton de tabela: cabeçalho + N linhas.
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="w-full">
      <div className="flex gap-4 px-4 py-3 border-b border-gray-100 dark:border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-b border-gray-50 dark:border-border/50">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton de linha de KPIs / cards.
export function CardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-7 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
