import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Estado vazio padronizado: ícone + título + descrição + ação opcional.
export default function EmptyState({ icon: Icon = Inbox, title = 'Nada por aqui', description, actionLabel, onAction, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-muted flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <Button className="mt-4" size="sm" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
