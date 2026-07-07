import { useMemo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import {
  DataGrid,
  type DataGridProps,
  type GridColDef,
  type GridRowIdGetter,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { EmptyState, ErrorState } from './StateViews';
import { glassSx } from '../theme';

export interface TableEmpty {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

interface DataTableProps<R extends GridValidRowModel> {
  rows: R[] | undefined;
  columns: GridColDef<R>[];
  getRowId: GridRowIdGetter<R>;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: TableEmpty;
  initialState?: DataGridProps['initialState'];
  pageSizeOptions?: number[];
  minHeight?: number | string;
  'aria-label'?: string;
}

// Thin, opinionated DataGrid: divider-bordered flat surface, skeleton rows while
// loading, a teaching empty overlay, inline error handling. Scrolls inside its own
// container so the page body never scrolls horizontally.
export function DataTable<R extends GridValidRowModel>({
  rows,
  columns,
  getRowId,
  loading = false,
  error,
  onRetry,
  empty,
  initialState,
  pageSizeOptions = [10, 25, 50, 100],
  minHeight = 360,
  'aria-label': ariaLabel,
}: DataTableProps<R>) {
  const slots = useMemo<DataGridProps['slots']>(
    () =>
      empty
        ? {
            noRowsOverlay: () => (
              <EmptyState
                title={empty.title}
                description={empty.description}
                action={empty.action}
                icon={empty.icon}
              />
            ),
          }
        : undefined,
    [empty],
  );

  if (error) {
    return (
      <Box sx={(theme) => ({ borderRadius: 2.5, ...glassSx(theme.palette.mode) })}>
        <ErrorState error={error} onRetry={onRetry} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight,
        width: '100%',
        display: 'flex',
        '@media (prefers-reduced-motion: no-preference)': {
          '& .MuiDataGrid-root': { animation: 'ats-grid-fade 220ms cubic-bezier(0.22,1,0.36,1)' },
        },
        '@keyframes ats-grid-fade': { from: { opacity: 0 }, to: { opacity: 1 } },
      }}
    >
      <DataGrid<R>
        aria-label={ariaLabel}
        rows={rows ?? []}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        disableRowSelectionOnClick
        disableColumnMenu
        columnHeaderHeight={44}
        rowHeight={52}
        pageSizeOptions={pageSizeOptions}
        slots={slots}
        slotProps={{
          loadingOverlay: { variant: 'skeleton', noRowsVariant: 'skeleton' },
        }}
        initialState={{
          pagination: { paginationModel: { pageSize: 25, page: 0 } },
          ...initialState,
        }}
        sx={(theme) => ({
          flex: 1,
          borderRadius: 2.5,
          ...glassSx(theme.palette.mode),
          '--DataGrid-overlayHeight': '260px',
          // Keep the grid's own inner surfaces transparent so the glass shows through.
          '& .MuiDataGrid-main, & .MuiDataGrid-virtualScroller, & .MuiDataGrid-filler': {
            backgroundColor: 'transparent',
          },
          '& .MuiDataGrid-columnHeaders': { backgroundColor: 'transparent' },
          '& .MuiDataGrid-columnHeader': { bgcolor: 'action.hover' },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 600,
            color: 'text.secondary',
            fontSize: '0.8125rem',
          },
          '& .MuiDataGrid-cell': {
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
          },
          '& .MuiDataGrid-columnSeparator': { display: 'none' },
          '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
          '& .MuiDataGrid-footerContainer': { borderColor: 'divider' },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '-2px',
          },
          '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '-2px',
          },
        })}
      />
    </Box>
  );
}
