"use client";

import { Cell as CellPrimitive, Column as ColumnPrimitive, Row as RowPrimitive, Table as TablePrimitive, TableBody as TableBodyPrimitive, TableHeader as TableHeaderPrimitive } from "react-aria-components";

import { tableVariants } from "../../styles/table/table.styles";
import { composeTwRenderProps } from "../../utils";

import type { CellProps, ColumnProps, RowProps, TableBodyProps, TableHeaderProps, TableProps } from "react-aria-components";
import type { TableVariants } from "../../styles/table/table.styles";

interface RootProps extends TableProps, TableVariants {}

const Root = ({ className, size, ...rest }: RootProps) => {
  const slots = tableVariants({ size });
  return <TablePrimitive className={composeTwRenderProps(className, slots.base())} data-slot="table" {...rest} />;
};

const Header = <T extends object>({ className, ...rest }: TableHeaderProps<T>) => {
  const slots = tableVariants();
  return <TableHeaderPrimitive className={composeTwRenderProps(className, slots.header())} data-slot="table-header" {...rest} />;
};

interface ColumnRootProps extends ColumnProps, TableVariants {}

const Column = ({ className, size, ...rest }: ColumnRootProps) => {
  const slots = tableVariants({ size });
  return <ColumnPrimitive className={composeTwRenderProps(className, slots.column())} data-slot="table-column" {...rest} />;
};

const Body = <T extends object>({ className, ...rest }: TableBodyProps<T>) => {
  const slots = tableVariants();
  return <TableBodyPrimitive className={composeTwRenderProps(className, slots.body())} data-slot="table-body" {...rest} />;
};

const Row = <T extends object>({ className, ...rest }: RowProps<T>) => {
  const slots = tableVariants();
  return <RowPrimitive className={composeTwRenderProps(className, slots.row())} data-slot="table-row" {...rest} />;
};

interface CellRootProps extends CellProps, TableVariants {}

const Cell = ({ className, size, ...rest }: CellRootProps) => {
  const slots = tableVariants({ size });
  return <CellPrimitive className={composeTwRenderProps(className, slots.cell())} data-slot="table-cell" {...rest} />;
};

export { Root, Header, Column, Body, Row, Cell };
