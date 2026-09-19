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
 * `dynamicIconImports` is one lazy import per icon, keyed by those kebab-case
 * ids. A name is normalised to that form, fetched on demand, and only the icons
 * a screen names are ever downloaded.
 *
 * It is not quite the same set as the barrel, and the difference is worth
 * knowing: lucide 0.312 exports 1475 icon components but `dynamicIconImports`
 * lists 1401 ids, so around 74 names the barrel could render are unreachable
 * this way and fall to the placeholder. None of them is a name the dictionary
 * seeds write — those are lucide's own ids, which are exactly the keys of this
 * map — but a hand-typed `sys_table.icon` can land on one.
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
 * Everything the caller did not name explicitly, plus `size`. `style` matters
 * in particular because the dashboard colours a category's icon from the
 * category row — dropping it would silently render every category the same
 * colour — and the rest matters because a `data-testid` or `aria-label` has to
 * survive onto the icon itself, not just the placeholder it replaces.
 *
 * Lucide's own props are `SVGProps<SVGSVGElement>`, which carries all of these;
 * the shape is declared here rather than imported because `ICON_IMPORTS` is a
 * cast over an untyped map either way.
 */
interface LucideIconProps extends Omit<IconProps, "name" | "size"> {
  size?: number;
  style?: CSSProperties;
}

const ICON_IMPORTS = dynamicIconImports as unknown as IconModules;

/**
 * Whatever the dictionary wrote, in lucide's own spelling.
 *
 * Accepts the three forms a row is realistically written in — `LayoutGrid`,
 * `layout_grid`, `layout-grid` — because all three are already in seeded data
 * and none of them is worth a migration.
 *
 * Two rules here exist because the obvious version of this function got them
 * wrong, both ways:
 *
 * - **A name that is already an id is returned untouched.** Without that, the
 *   digit rule split ids that were correct on arrival: `grid-2x2` became
 *   `grid-2x-2` and `grid-3x3` became `grid-3x-3`, so two icons that used to
 *   render stopped. Asking the map first is also simply the right order — the
 *   dictionary writes lucide ids, so the common case needs no transformation
 *   at all.
 * - **A run of capitals splits before the last one, not after the first.**
 *   `AArrowDown` is `a-arrow-down` and `ArrowDownAZ` is `arrow-down-a-z`; a
 *   single `([a-z])([A-Z])` boundary produced `aarrow-down` and
 *   `arrow-down-az`, neither of which is an id. That cost eight names the
 *   barrel had resolved.
 *
 * Verified against lucide 0.312's key list: 0 of the 1401 ids are altered by
 * this function, and it resolves every PascalCase export whose icon the map
 * actually carries.
 */
export function normalizeIconName(name: string): string {
  const trimmed = name.trim();
  // Already one of lucide's own ids — the common case, since that is what the
  // dictionary seeds write.
  if (Object.hasOwn(ICON_IMPORTS, trimmed)) return trimmed;

  return trimmed
    .replace(/[\s_]+/g, "-")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])(\d)/g, "$1-$2")
    .replace(/([A-Z])(?=[A-Z])/g, "$1-")
    .toLowerCase()
    .replace(/-+/g, "-");
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

/**
 * Renders a lucide icon by the name the dictionary holds.
 *
 * `...props` goes to whichever of the two actually renders. Passing it only to
 * the placeholder — which is what the first version of this did — meant a
 * `data-testid`, a `title` or an `aria-label` was present for the moment the
 * chunk was in flight and gone from the icon that replaced it: a test that
 * queried by test id passed or failed on timing.
 */
export function Icon({ name, size = 16, className, style, ...props }: IconProps) {
  const IconComponent = useMemo(() => getLazyIcon(normalizeIconName(name)), [name]);
  const placeholder = (
    <IconPlaceholder size={size} className={className} style={style} {...props} />
  );

  if (!IconComponent) return placeholder;

  return (
    <Suspense fallback={placeholder}>
      <IconComponent size={size} className={className} style={style} {...props} />
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
