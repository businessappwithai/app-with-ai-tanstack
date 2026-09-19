/**
 * An icon named at runtime.
 *
 * Dictionary rows carry icon names — `sys_category.icon`, `sys_table.icon` —
 * so the component that renders one cannot know at build time which icons the
 * application will ask for. That is the only hard requirement here, and it used
 * to be met with `import * as LucideIcons from "lucide-react"`, which is a
 * namespace import of a barrel: nothing can be tree-shaken out of it, so the
 * whole set arrived as a 639KB chunk on the dashboard, the one screen that
 * renders a handful of them.
 *
 * It was also wrong. The barrel is keyed by lucide's PascalCase export names
 * (`Receipt`, `LayoutGrid`), and the names the seeds write are lucide's own
 * kebab-case ids (`receipt`, `layout-grid`, `stethoscope`). A raw lookup
 * therefore missed most of what the dictionary actually holds — seven of the
 * nine names in one generated application's own seed data — and every miss fell
 * through to the 📊 placeholder. A bigger download that rendered fewer icons.
 *
 * `dynamicIconImports` is the same set as one lazy import per icon, keyed by
 * those kebab-case ids. A name is normalised to that form, fetched on demand,
 * and only the icons a screen names are ever downloaded.
 */

import dynamicIconImports from "lucide-react/dynamicIconImports";
import {
  type ComponentType,
  type CSSProperties,
  type HTMLAttributes,
  lazy,
  Suspense,
  useMemo,
} from "react";

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number;
  className?: string;
}

type IconModules = Record<string, () => Promise<{ default: ComponentType<LucideIconProps> }>>;

/**
 * What a call site may pass through to the rendered icon.
 *
 * `style` is on this list because the dashboard colours a category's icon from
 * the category row — dropping it here would silently render every category the
 * same colour.
 */
interface LucideIconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const ICON_IMPORTS = dynamicIconImports as unknown as IconModules;

/**
 * Whatever the dictionary wrote, in lucide's own spelling.
 *
 * Accepts the three forms a row is realistically written in — `LayoutGrid`,
 * `layout_grid`, `layout-grid` — because all three are already in seeded data
 * and none of them is worth a migration. `Table2` has to keep its digit
 * separate (`table-2`), which is why the digit boundary gets its own rule.
 */
export function normalizeIconName(name: string): string {
  return name
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])(\d)/g, "$1-$2")
    .toLowerCase();
}

/**
 * The placeholder, for a name lucide does not have.
 *
 * Kept as its own component so the fallback path and the loading path render
 * the same box: an icon that resolves late must not move the layout when it
 * arrives.
 */
function IconPlaceholder({
  size,
  className,
  style,
  ...props
}: { size: number; className?: string } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={className}
      {...props}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size}px`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      📊
    </span>
  );
}

/**
 * One `lazy()` per icon name, not per render.
 *
 * `React.lazy` returns a new component type on every call, and a new type
 * unmounts and remounts the subtree — building one inside the render would make
 * every icon re-fetch its own chunk on every parent render.
 */
const lazyIcons = new Map<string, ComponentType<LucideIconProps>>();

function getLazyIcon(id: string): ComponentType<LucideIconProps> | null {
  const cached = lazyIcons.get(id);
  if (cached) return cached;

  const loader = ICON_IMPORTS[id];
  if (!loader) return null;

  const component = lazy(loader);
  lazyIcons.set(id, component);
  return component;
}

/** Renders a lucide icon by the name the dictionary holds. */
export function Icon({ name, size = 16, className, style, ...props }: IconProps) {
  const IconComponent = useMemo(() => getLazyIcon(normalizeIconName(name)), [name]);
  const placeholder = (
    <IconPlaceholder size={size} className={className} style={style} {...props} />
  );

  if (!IconComponent) return placeholder;

  return (
    <Suspense fallback={placeholder}>
      <IconComponent size={size} className={className} style={style} />
    </Suspense>
  );
}

/**
 * Every name this component can render, for the icon picker in the dictionary
 * editor. Reading the keys does not import anything — `dynamicIconImports` is a
 * map of loaders, and a loader that is never called never fetches its icon.
 */
export function getAvailableIconNames(): string[] {
  return Object.keys(ICON_IMPORTS);
}
