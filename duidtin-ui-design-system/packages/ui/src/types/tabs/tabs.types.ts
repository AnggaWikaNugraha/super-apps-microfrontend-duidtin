import type { TabListProps, TabPanelProps, TabProps, TabsProps } from "react-aria-components";

export interface TabsRootProps extends TabsProps {}

export interface TabsListProps<T extends object = object> extends TabListProps<T> {}

export interface TabsTabProps extends TabProps {}

export interface TabsPanelProps extends TabPanelProps {}
