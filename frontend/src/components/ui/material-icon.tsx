"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  className?: string;
  size?: number | string;
  fill?: boolean;
}

export function MaterialIcon({
  name,
  className,
  size,
  fill = false,
  style,
  ...props
}: MaterialIconProps) {
  return (
    <span
      className={cn("material-symbols-outlined select-none inline-flex items-center justify-center leading-none", className)}
      style={{
        fontSize: size ? (typeof size === "number" ? `${size}px` : size) : undefined,
        fontVariationSettings: fill ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}

export default MaterialIcon;
