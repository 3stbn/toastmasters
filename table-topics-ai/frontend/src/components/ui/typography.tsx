import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const typographyVariants = cva("", {
  variants: {
    variant: {
      // Headings - use text-foreground for proper dark mode support
      h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-foreground",
      h2: "scroll-m-20 text-3xl font-semibold tracking-tight text-foreground",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight text-foreground",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight text-foreground",
      // Body text - use text-foreground for proper dark mode support
      p: "leading-7 text-foreground",
      body: "text-base text-foreground",
      "body-lg": "text-lg text-foreground",
      // Semantic text
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold text-foreground",
      small: "text-sm font-medium leading-none text-foreground",
      muted: "text-sm text-muted-foreground",
      "muted-xs": "text-xs text-muted-foreground",
      // Labels
      label: "text-sm font-medium text-foreground",
      "label-muted": "text-sm font-medium text-muted-foreground",
      // Data display
      stat: "text-2xl font-bold text-foreground",
      // Misc
      blockquote: "mt-6 border-l-2 pl-6 italic text-foreground",
      error: "text-sm text-destructive",
      "error-xs": "text-xs text-destructive",
    },
  },
  defaultVariants: {
    variant: "p",
  },
});

type VariantType = NonNullable<VariantProps<typeof typographyVariants>["variant"]>;

type ElementType = "h1" | "h2" | "h3" | "h4" | "p" | "blockquote" | "div" | "small" | "span" | "label";

const variantElementMap: Record<VariantType, ElementType> = {
  // Headings
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  // Body text
  p: "p",
  body: "p",
  "body-lg": "p",
  // Semantic text
  lead: "p",
  large: "div",
  small: "small",
  muted: "p",
  "muted-xs": "span",
  // Labels
  label: "label",
  "label-muted": "label",
  // Data display
  stat: "span",
  // Misc
  blockquote: "blockquote",
  error: "p",
  "error-xs": "p",
};

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: ElementType;
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant = "p", as, children, ...props }, ref) => {
    const Component = as || variantElementMap[variant!];

    return React.createElement(
      Component,
      {
        ref,
        className: cn(typographyVariants({ variant }), className),
        ...props,
      },
      children
    );
  }
);
Typography.displayName = "Typography";

export { Typography, typographyVariants };
