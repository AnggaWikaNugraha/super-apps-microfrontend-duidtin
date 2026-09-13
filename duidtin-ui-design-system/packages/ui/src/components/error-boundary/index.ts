import { Root } from "./root";

export const ErrorBoundary = Object.assign(Root, {
  Root,
});

export type {
  ErrorBoundaryRenderProps,
  ErrorBoundaryRootProps,
  ErrorBoundaryState,
} from "../../types/error-boundary/error-boundary.types";
