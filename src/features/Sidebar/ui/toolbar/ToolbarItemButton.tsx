import { Button, Tooltip } from '@mantine/core';
import { cn } from '../../../../shared/lib/cn';

export function ToolbarItemButton({
  children,
  onClick,
  active,
  tooltip,
  disabled,
  ref,
}: {
  tooltip: string;
  ref?: React.RefObject<HTMLButtonElement>;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip label={tooltip} position="right">
      <Button
        ref={ref}
        className={cn(
          'toolbar-item flex items-center justify-center !bg-transparent hover:!bg-blue-900/50 rounded-md !p-1 cursor-pointer text-neutral-100 z-10 !h-fit',
          active && '!bg-blue-900/50',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
