import { RoundIconButton } from './RoundIconButton';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label: string;
  disabled?: boolean;
}

export function Pagination({ page, totalPages, onChange, label, disabled = false }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label={`${label} pages`}>
      <RoundIconButton
        icon="turn_left"
        label="Previous page"
        size="small"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      />
      <span aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <RoundIconButton
        icon="turn_right"
        label="Next page"
        size="small"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
      />
    </nav>
  );
}
