"use client";

import { FieldError as FieldErrorPrimitive, Input as InputPrimitive, Label as LabelPrimitive, Text as TextPrimitive, TextField as TextFieldPrimitive } from "react-aria-components";
import { twMerge } from "tailwind-merge";

import { textFieldVariants } from "../../styles/text-field/text-field.styles";
import { composeTwRenderProps } from "../../utils";

import type { TextFieldDescriptionProps, TextFieldErrorProps, TextFieldInputProps, TextFieldLabelProps, TextFieldRootProps } from "../../types/text-field/text-field.types";

const slots = textFieldVariants();

const Root = ({ className, ...rest }: TextFieldRootProps) => {
  return <TextFieldPrimitive className={composeTwRenderProps(className, slots.base())} data-slot="text-field" {...rest} />;
};

const Label = ({ className, ...rest }: TextFieldLabelProps) => {
  return <LabelPrimitive className={twMerge(slots.label(), className)} data-slot="text-field-label" {...rest} />;
};

const Input = ({ className, ...rest }: TextFieldInputProps) => {
  return <InputPrimitive className={composeTwRenderProps(className, slots.input())} data-slot="text-field-input" {...rest} />;
};

const Description = ({ className, ...rest }: TextFieldDescriptionProps) => {
  return <TextPrimitive className={twMerge(slots.description(), className)} data-slot="text-field-description" slot="description" {...rest} />;
};

/**
 * Tanpa `children`, pesannya diambil dari validasi browser/React Aria.
 * Untuk pesan dari server (mis. "Email atau password salah"), isi `children`
 * dan set `isInvalid` di Root — React Aria tidak menimpanya.
 */
const ErrorMessage = ({ className, ...rest }: TextFieldErrorProps) => {
  return <FieldErrorPrimitive className={composeTwRenderProps(className, slots.error())} data-slot="text-field-error" {...rest} />;
};

export { Root, Label, Input, Description, ErrorMessage };
