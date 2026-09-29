import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '../ui/Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-[#26262e] bg-white/40 dark:bg-[#141418]/40 transition-colors">
      <div className="p-3.5 bg-zinc-100 dark:bg-[#1a1a20] rounded-2xl text-zinc-500 dark:text-zinc-400 mb-3.5 border border-zinc-200/80 dark:border-[#26262e]">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-black tracking-tight text-zinc-900 dark:text-white mb-1">{title}</h4>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button
          onClick={onAction}
          variant="primary"
          size="sm"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
};
