import type { FieldErrorProps, InputProps, LabelProps, TextFieldProps, TextProps } from "react-aria-components";

export interface TextFieldRootProps extends TextFieldProps {}

export interface TextFieldLabelProps extends LabelProps {}

export interface TextFieldInputProps extends InputProps {}

export interface TextFieldDescriptionProps extends Omit<TextProps, "slot"> {}

export interface TextFieldErrorProps extends FieldErrorProps {}
