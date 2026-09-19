/**
 * The icon that represents an entity, set in the Application Dictionary.
 *
 * `sys_table.icon` holds one of two things and the application decides by
 * looking: a lucide icon id (`stethoscope`), or an image someone uploaded here,
 * carried as a `data:` URI. This is where both are set.
 *
 * Encoded in the browser rather than posted as multipart, because a data URI is
 * what the column stores and what the dashboard renders. Converting at every
 * hop — multipart in, bytes in a table, base64 out — would be three
 * representations of one small image and two more places for it to go wrong.
 *
 * The server validates independently in `SysService.validateIconValue`: nothing
 * checked here is trusted there. The checks below exist to tell the
 * administrator what is wrong before a round trip, not to decide it.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

/** Must match SysService.ICON_MAX_DECODED_BYTES. */
const MAX_BYTES = 64 * 1024;

/** Must match SysService.ICON_MEDIA_TYPES. */
const ACCEPTED = ["image/svg+xml", "image/png", "image/webp", "image/gif", "image/jpeg"];

interface TableRecord {
  sys_table_id: string;
  table_name: string;
  name: string;
  icon: string | null;
}

function isUploaded(icon: string | null): boolean {
  return !!icon && /^data:image\//i.test(icon);
}

export function EntityIconField({ tableId }: { tableId: string }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);

  const { data: table } = useQuery({
    queryKey: ["sys_table", tableId],
    queryFn: () => apiClient.get<TableRecord>(`/sys/tables/${tableId}`),
  });

  // `null` while the record loads, then the stored value — so typing is not
  // thrown away by a refetch.
  const current = name ?? table?.icon ?? "";

  const save = useMutation({
    mutationFn: (icon: string | null) =>
      apiClient.put<TableRecord>(`/sys/tables/${tableId}/icon`, { icon }),
    onSuccess: (updated) => {
      setName(null);
      queryClient.setQueryData(["sys_table", tableId], updated);
      // The dashboard draws these, and it caches the dictionary for minutes.
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(updated.icon ? "Icon saved" : "Icon cleared");
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not save the icon"),
  });

  const onFile = (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error(`${file.type || "That file"} is not an image this accepts — use SVG, PNG, WEBP, GIF or JPEG`);
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(
        `That image is ${Math.ceil(file.size / 1024)}KB; the limit is ${MAX_BYTES / 1024}KB. An icon is drawn at 20 pixels.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast.error("Could not read that file");
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result.startsWith("data:image/")) {
        toast.error("Could not read that file as an image");
        return;
      }
      save.mutate(result);
    };
    reader.readAsDataURL(file);
  };

  const stored = table?.icon ?? null;

  return (
    <div className="swiss-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Entity icon</h3>
        <p className="text-xs text-muted-foreground mt-1">
          A{" "}
          <a
            href="https://lucide.dev/icons"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            lucide icon name
          </a>{" "}
          , or an image you upload. Shown wherever this entity appears — the dashboard card, the
          window heading, the navigation.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          {stored ? (
            <Icon name={stored} size={24} className="text-primary" />
          ) : (
            <span className="text-xs text-muted-foreground">none</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground min-w-0">
          {isUploaded(stored)
            ? `Uploaded image (${Math.ceil((stored?.length ?? 0) / 1024)}KB encoded)`
            : stored
              ? `Lucide icon: ${stored}`
              : "No icon set — a default is drawn"}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={isUploaded(current) ? "" : current}
          placeholder="stethoscope"
          disabled={save.isPending}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save.mutate(event.currentTarget.value.trim() || null);
          }}
          className="swiss-input h-9 w-56 text-sm"
          aria-label="Lucide icon name"
        />
        <Button
          size="sm"
          disabled={save.isPending || isUploaded(current)}
          onClick={() => save.mutate((name ?? "").trim() || null)}
        >
          Save name
        </Button>

        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so choosing the same file twice fires change again.
            event.target.value = "";
            if (file) onFile(file);
          }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={save.isPending}
          onClick={() => fileInput.current?.click()}
        >
          Upload image
        </Button>

        {stored && (
          <Button
            size="sm"
            variant="outline"
            disabled={save.isPending}
            onClick={() => save.mutate(null)}
          >
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        SVG, PNG, WEBP, GIF or JPEG, up to {MAX_BYTES / 1024}KB. The image is stored in the
        dictionary itself, so it travels with a database backup and needs no file storage.
      </p>
    </div>
  );
}
