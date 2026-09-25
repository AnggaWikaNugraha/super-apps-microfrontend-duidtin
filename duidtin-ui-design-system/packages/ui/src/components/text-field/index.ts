import { Description, ErrorMessage, Input, Label, Root } from "./root";

export const TextField = Object.assign(Root, {
  Root,
  Label,
  Input,
  Description,
  Error: ErrorMessage,
});

export type { TextFieldDescriptionProps, TextFieldErrorProps, TextFieldInputProps, TextFieldLabelProps, TextFieldRootProps } from "../../types/text-field/text-field.types";
