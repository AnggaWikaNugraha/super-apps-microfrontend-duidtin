import type { CellProps, ColumnProps, RowProps, TableBodyProps, TableHeaderProps, TableProps } from "react-aria-components";
import type { VariantProps } from "tailwind-variants";

import type { tableVariants } from "../../styles/table/table.styles";

export type TableVariants = VariantProps<typeof tableVariants>;

export interface TableRootProps extends TableProps, TableVariants {}

export interface TableColumnRootProps extends ColumnProps, TableVariants {}

export interface TableCellRootProps extends CellProps, TableVariants {}

export type { TableBodyProps, TableHeaderProps, RowProps as TableRowProps };
