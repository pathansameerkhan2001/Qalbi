"use client";

import { Monitor, Smartphone } from "lucide-react";
import { saveSettingAction } from "@/lib/admin/actions";
import { ActionMessage, SubmitButton, useAdminForm } from "@/components/admin/form-bits";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import type { HeroFilmSettings } from "@/lib/content/hero";
import { cn } from "@/lib/utils";

/** A video path as the homepage resolves it now, with what the bucket serves there. */
export interface VideoStatus {
  path: string | null;
  builtIn: boolean;
  bytes: number | null;
  problem: string | null;
  heavy: boolean;
}

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

export function HeroFilmForm({
  initial,
  defaults,
  desktop,
  mobile,
  posterDefaults,
}: {
  initial: HeroFilmSettings;
  defaults: { desktop: string; mobile: string | null };
  desktop: VideoStatus;
  mobile: VideoStatus;
  posterDefaults: { desktop: string; mobile: string | null };
}) {
  const { state, pending, formProps } = useAdminForm(saveSettingAction);
  return (
    <form {...formProps} className="space-y-5">
      <input type="hidden" name="key" value="hero" />
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="filmEnabled" defaultChecked={initial.filmEnabled} className="accent-[var(--color-forest)]" /> Play the film first on the homepage
      </label>

      <div className="grid gap-5 lg:grid-cols-2">
        <VideoField
          icon={<Monitor className="size-4" aria-hidden />}
          label="Desktop video"
          name="desktopVideoPath"
          initial={initial.desktopVideoPath}
          fallback={defaults.desktop}
          status={desktop}
          hint="Tablets and computers (640 px and wider). 16:9, about 1280 × 720, H.264 MP4 without sound, ideally under 3 MB."
        />
        <VideoField
          icon={<Smartphone className="size-4" aria-hidden />}
          label="Mobile video"
          name="mobileVideoPath"
          initial={initial.mobileVideoPath}
          fallback={defaults.mobile}
          status={mobile}
          hint="Phones (under 640 px) — they download only this file. 4:5 portrait (the phone hero's shape), about 720 × 900, ideally under 2 MB. Without one, phones get the desktop video."
        />
        <ImageUploadField
          name="posterDesktopPath"
          label="Desktop poster"
          folder="hero"
          defaultPath={initial.posterDesktopPath ?? ""}
          aspectClass="aspect-[16/9]"
          minWidth={1280}
          hint={`Shown at once while the desktop video loads, and whenever it can't play. Use the video's first frame so the start is seamless. Empty = built-in (${posterDefaults.desktop}).`}
        />
        <ImageUploadField
          name="posterMobilePath"
          label="Mobile poster"
          folder="hero"
          defaultPath={initial.posterMobilePath ?? ""}
          aspectClass="aspect-[4/5] max-w-[12rem]"
          minWidth={720}
          hint={`The mobile video's first frame, 4:5. Empty = built-in (${posterDefaults.mobile ?? posterDefaults.desktop}).`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending}>Save film settings</SubmitButton>
        <ActionMessage state={state} />
      </div>
      <p className="text-xs text-muted">
        Videos are not uploaded here: they go into the media bucket with <code>scripts/upload-hero-videos.mjs</code> under a new name (never over a published file, which browsers keep for a year). Then
        paste the new path and save — each path is checked in the bucket before anything changes on the homepage.
      </p>
    </form>
  );
}

function VideoField({ icon, label, name, initial, fallback, status, hint }: { icon: React.ReactNode; label: string; name: string; initial: string | null; fallback: string | null; status: VideoStatus; hint: string }) {
  const id = `hero-film-${name}`;
  return (
    <div>
      <label htmlFor={id} className="label flex items-center gap-1.5">
        {icon} {label}
      </label>
      <input id={id} name={name} defaultValue={initial ?? ""} placeholder={fallback ? `Built-in: ${fallback}` : "No built-in file"} className="field font-mono text-xs" spellCheck={false} />
      <p className="mt-1 text-xs text-muted">{hint}</p>
      {status.path && (
        <p className={cn("mt-1.5 text-xs", status.problem ? "text-danger" : status.heavy ? "text-[#7a5418]" : "text-forest")} role="status">
          Now playing: <span className="font-mono">{status.path}</span>
          {status.builtIn && " (built-in)"}
          {" — "}
          {status.problem ? `not playable: ${status.problem}.` : status.bytes ? `${mb(status.bytes)}${status.heavy ? ", heavy: starts late on mobile data. Replace it with the optimised encode." : ", OK."}` : "OK."}
        </p>
      )}
    </div>
  );
}
