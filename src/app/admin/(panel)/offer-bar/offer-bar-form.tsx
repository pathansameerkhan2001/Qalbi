"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveSettingAction } from "@/lib/admin/actions";
import { isSafeSiteLink } from "@/lib/content/rules";
import { ActionMessage, initialActionState, SubmitButton } from "@/components/admin/form-bits";
import { OfferBarView, type OfferMessage } from "@/components/home/offer-bar-view";

const MAX = 6;

export function OfferBarForm({ initial }: { initial: { enabled: boolean; animate: boolean; messages: OfferMessage[] } }) {
  const [state, action] = useActionState(saveSettingAction, initialActionState);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [animate, setAnimate] = useState(initial.animate);
  const [messages, setMessages] = useState(initial.messages.map((m) => ({ ...m, href: m.href ?? "" })));

  const update = (i: number, patch: Partial<{ text: string; href: string }>) => setMessages((list) => list.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const move = (i: number, d: -1 | 1) =>
    setMessages((list) => {
      const next = [...list];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  const cleaned = messages
    .map((m) => ({ id: m.id, text: m.text.trim(), href: m.href.trim() }))
    .filter((m) => m.text)
    .map(({ href, ...m }) => (href ? { ...m, href } : m));
  const badLink = messages.findIndex((m) => m.href.trim() && !isSafeSiteLink(m.href.trim()));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="key" value="offer_bar" />
      <input type="hidden" name="messages" value={JSON.stringify(cleaned)} />

      <section className="space-y-4 rounded-[3px] border border-line bg-ivory p-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-[var(--color-forest)]" /> Show the offer bar on the homepage
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="animate" checked={animate} onChange={(e) => setAnimate(e.target.checked)} className="accent-[var(--color-forest)]" /> Scroll the messages slowly (only with 2 or more; never for visitors who prefer reduced motion)
        </label>
      </section>

      <section className="space-y-3 rounded-[3px] border border-line bg-ivory p-5">
        <h2 className="font-serif text-xl">Messages</h2>
        <p className="text-sm text-muted">Shown in this order. Only announce offers, prices and delivery terms the store actually provides.</p>
        {messages.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
        <ul className="space-y-3">
          {messages.map((m, i) => (
            <li key={m.id} className="flex gap-3 rounded-[3px] border border-line p-3">
              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_14rem]">
                <input aria-label={`Message ${i + 1} text`} value={m.text} onChange={(e) => update(i, { text: e.target.value })} maxLength={120} placeholder="e.g. New: Radiance Glow Cream is here" className="field" />
                <input
                  aria-label={`Message ${i + 1} link (optional)`}
                  aria-invalid={i === badLink || undefined}
                  value={m.href}
                  onChange={(e) => update(i, { href: e.target.value })}
                  placeholder="Link (optional): /products"
                  className="field"
                />
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move message ${i + 1} up`} className="rounded p-1 hover:bg-sand disabled:opacity-30">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" disabled={i === messages.length - 1} onClick={() => move(i, 1)} aria-label={`Move message ${i + 1} down`} className="rounded p-1 hover:bg-sand disabled:opacity-30">
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" onClick={() => setMessages((l) => l.filter((_, j) => j !== i))} aria-label={`Remove message ${i + 1}`} className="rounded p-1 text-danger hover:bg-danger/10">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {badLink >= 0 && <p className="text-xs text-danger">Message {badLink + 1}: links must be a website path such as /products or a full https:// link.</p>}
        <button type="button" disabled={messages.length >= MAX} onClick={() => setMessages((l) => [...l, { id: `m${Date.now().toString(36)}`, text: "", href: "" }])} className="btn btn-outline btn-sm">
          <Plus className="size-4" aria-hidden /> Add message
        </button>
      </section>

      <section className="space-y-3">
        <p className="label">Preview</p>
        {enabled && cleaned.length ? (
          <div className="overflow-hidden rounded-[3px] ring-1 ring-line">
            <OfferBarView messages={cleaned} animate={animate} />
          </div>
        ) : (
          <p className="rounded-[3px] border border-dashed border-line p-4 text-sm text-muted">{enabled ? "Add a message to preview the bar." : "The bar is switched off and will not appear on the website."}</p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Save offer bar</SubmitButton>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}
