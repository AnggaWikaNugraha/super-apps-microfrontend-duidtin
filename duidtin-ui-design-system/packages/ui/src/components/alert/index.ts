import { Content, Description, Icon, Root, Title } from "./root";

export const Alert = Object.assign(Root, {
  Root,
  Icon,
  Content,
  Title,
  Description,
});

export type { AlertRootProps, AlertSectionProps, AlertVariants } from "../../types/alert/alert.types";
