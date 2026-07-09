import { twMerge } from "tailwind-merge";

export function composeTwRenderProps<T>(className: string | ((renderProps: T) => string) | undefined, tw: string | ((renderProps: T) => string)): (renderProps: T) => string {
  return (renderProps: T) => {
    const resolvedClassName = typeof className === "function" ? className(renderProps) : className;
    const resolvedTw = typeof tw === "function" ? tw(renderProps) : tw;
    return twMerge(resolvedTw, resolvedClassName);
  };
}
