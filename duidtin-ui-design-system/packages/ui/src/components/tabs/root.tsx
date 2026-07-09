"use client";

import { Tab as TabPrimitive, TabList as TabListPrimitive, TabPanel as TabPanelPrimitive, Tabs as TabsPrimitive } from "react-aria-components";

import { tabsVariants } from "../../styles/tabs/tabs.styles";
import { composeTwRenderProps } from "../../utils";

import type { TabsListProps, TabsPanelProps, TabsRootProps, TabsTabProps } from "../../types/tabs/tabs.types";

const slots = tabsVariants();

const Root = ({ className, ...rest }: TabsRootProps) => {
  return <TabsPrimitive className={composeTwRenderProps(className, slots.root())} data-slot="tabs" {...rest} />;
};

const List = <T extends object>({ className, ...rest }: TabsListProps<T>) => {
  return <TabListPrimitive className={composeTwRenderProps(className, slots.list())} data-slot="tabs-list" {...rest} />;
};

const Tab = ({ className, ...rest }: TabsTabProps) => {
  return <TabPrimitive className={composeTwRenderProps(className, slots.tab())} data-slot="tabs-tab" {...rest} />;
};

const Panel = ({ className, ...rest }: TabsPanelProps) => {
  return <TabPanelPrimitive className={composeTwRenderProps(className, slots.panel())} data-slot="tabs-panel" {...rest} />;
};

export { Root, List, Tab, Panel };
