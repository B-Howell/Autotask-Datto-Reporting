import { forwardRef } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import type { DataGridProps, GridValidRowModel } from '@mui/x-data-grid';
import type { SxProps, Theme } from '@mui/material/styles';

// DataGrid v8 draws its own floating scrollbar, clamped to 14px, over the
// rightmost column whenever the native scrollbar measures 0 (styled or overlay
// scrollbars). Reserving the same 14px as a gutter keeps cells clear of it.
const SCROLLBAR_PX = 14;

const scrollbarFixSx = {
  '--DataGrid-scrollbarSize': `${SCROLLBAR_PX}px`,
  '& .MuiDataGrid-main': {
    paddingRight: 'calc(var(--DataGrid-hasScrollY) * var(--DataGrid-scrollbarSize))',
    paddingBottom: 'calc(var(--DataGrid-hasScrollX) * var(--DataGrid-scrollbarSize))',
  },
} as const;

const toSxArray = (sx: SxProps<Theme> | undefined): ReadonlyArray<SxProps<Theme>> => {
  if (!sx) return [];
  return Array.isArray(sx) ? (sx as ReadonlyArray<SxProps<Theme>>) : [sx];
};

function AppDataGridInner<R extends GridValidRowModel>(
  { sx, ...rest }: DataGridProps<R>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  return (
    <DataGrid<R>
      ref={ref}
      scrollbarSize={SCROLLBAR_PX}
      {...rest}
      sx={[scrollbarFixSx, ...toSxArray(sx)] as SxProps<Theme>}
    />
  );
}

const AppDataGrid = forwardRef(AppDataGridInner) as <R extends GridValidRowModel>(
  props: DataGridProps<R> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

export default AppDataGrid;
