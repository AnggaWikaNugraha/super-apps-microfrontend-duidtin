import { Action, Description, Icon, Root, Title } from "./root";

export const EmptyState = Object.assign(Root, {
  Root,
  Icon,
  Title,
  Description,
  Action,
});

export type {
  EmptyStateRootProps,
  EmptyStateSectionProps,
  EmptyStateVariants,
} from "../../types/empty-state/empty-state.types";
