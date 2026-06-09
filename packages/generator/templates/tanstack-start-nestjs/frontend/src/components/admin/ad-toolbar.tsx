import {
  Plus,
  Save,
  Trash2,
  RotateCcw,
  RefreshCw,
  Copy,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ADToolbarProps {
  onNew?: () => void;
  onCopy?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRefresh?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  hasChanges?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = 'ghost',
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'ghost' | 'destructive';
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={`h-8 w-8 p-0 ${variant === 'destructive' ? 'hover:bg-destructive/10 hover:text-destructive' : 'hover:bg-primary/10 hover:text-primary'}`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function ADToolbar({
  onNew,
  onCopy,
  onSave,
  onDelete,
  onUndo,
  onRefresh,
  searchValue,
  onSearchChange,
  isSaving,
  isDeleting,
  hasChanges,
  canDelete = true,
  canCreate = true,
}: ADToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search records..."
            value={searchValue || ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {canCreate && (
          <ToolbarButton icon={Plus} label="New Record" onClick={onNew} />
        )}
        <ToolbarButton icon={Copy} label="Copy Record" onClick={onCopy} disabled={!onCopy} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          icon={Save}
          label={isSaving ? 'Saving...' : 'Save'}
          onClick={onSave}
          disabled={isSaving || !hasChanges}
        />
        {canDelete && (
          <ToolbarButton
            icon={Trash2}
            label="Delete"
            onClick={onDelete}
            disabled={isDeleting}
            variant="destructive"
          />
        )}
        <ToolbarButton icon={RotateCcw} label="Undo Changes" onClick={onUndo} disabled={!hasChanges} />

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton icon={RefreshCw} label="Refresh" onClick={onRefresh} />
      </div>
    </TooltipProvider>
  );
}
