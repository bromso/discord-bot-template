import { addCollection, Icon as IconifyIcon } from "@iconify/react";
import lucide from "@iconify-json/lucide/icons.json" with { type: "json" };
import type { ComponentProps } from "react";

let initialized = false;
function init() {
  if (initialized) return;
  addCollection(lucide);
  initialized = true;
}

export type IconProps = Omit<ComponentProps<typeof IconifyIcon>, "icon"> & {
  name: string;
  size?: number;
};

export function Icon({ name, size = 16, ...rest }: IconProps) {
  init();
  return (
    <IconifyIcon
      icon={name}
      width={size}
      height={size}
      aria-hidden={rest["aria-label"] ? undefined : true}
      {...rest}
    />
  );
}
