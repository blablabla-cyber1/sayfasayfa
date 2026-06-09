import { cn } from '@/lib/utils';
import { WordCategory, CATEGORY_COLORS, CATEGORY_LABELS } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  );
}

export function CategoryBadge({ category }: { category: WordCategory }) {
  return (
    <Badge color={CATEGORY_COLORS[category]}>
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}
