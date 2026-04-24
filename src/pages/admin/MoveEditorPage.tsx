import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Copy,
  Eye,
  Loader2,
  Save,
  Tag as TagIcon,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  FUNCTION_LABELS,
  FUNCTIONS,
  LENS_LABELS,
  LENSES,
  PILLARS,
  SIZE_BANDS,
  TIER_BAND_LABELS,
  TIER_BANDS,
  type Move,
  type MoveInsert,
} from "@/lib/playbook";
import { PILLAR_NAMES } from "@/lib/assessment";
import { moveFormSchema, type MoveFormValues } from "@/lib/playbook-schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { renderSafeMarkdown } from "@/lib/markdown-lite";
import { cn } from "@/lib/utils";

const DEFAULT_VALUES: MoveFormValues = {
  title: "",
  lens: "organisational",
  pillar: 1,
  applies_to_tier: 1,
  tier_band: "low",
  function: null,
  size_bands: [],
  why_matters: undefined,
  what_to_do: undefined,
  how_to_know: undefined,
  body: "",
  effort: 2,
  impact: 3,
  time_to_value: undefined,
  tags: [],
  cta_type: undefined,
  cta_url: undefined,
  notes: undefined,
  active: true,
};

export default function MoveEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const existing = useQuery({
    enabled: !isNew,
    queryKey: ["admin", "playbook", "move", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outcomes_library")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Move not found");
      return data as Move;
    },
  });

  const form = useForm<MoveFormValues>({
    resolver: zodResolver(moveFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (existing.data) {
      const m = existing.data;
      form.reset({
        title: m.title,
        lens: (m.lens as MoveFormValues["lens"]) ?? "organisational",
        pillar: m.pillar as MoveFormValues["pillar"],
        applies_to_tier: m.applies_to_tier,
        tier_band: (m.tier_band as MoveFormValues["tier_band"]) ?? "low",
        function: (m.function as MoveFormValues["function"]) ?? null,
        size_bands: (m.size_bands ?? []) as MoveFormValues["size_bands"],
        why_matters: m.why_matters ?? undefined,
        what_to_do: m.what_to_do ?? undefined,
        how_to_know: m.how_to_know ?? undefined,
        body: m.body,
        effort: m.effort,
        impact: m.impact,
        time_to_value: m.time_to_value ?? undefined,
        tags: m.tags ?? [],
        cta_type: m.cta_type ?? undefined,
        cta_url: m.cta_url ?? undefined,
        notes: m.notes ?? undefined,
        active: m.active,
      });
    }
  }, [existing.data, form]);

  const save = useMutation({
    mutationFn: async (values: MoveFormValues) => {
      const payload: MoveInsert = {
        title: values.title,
        lens: values.lens,
        pillar: values.pillar,
        applies_to_tier: values.applies_to_tier,
        tier_band: values.tier_band,
        function: values.function,
        size_bands: values.size_bands.length ? values.size_bands : null,
        why_matters: values.why_matters ?? null,
        what_to_do: values.what_to_do ?? null,
        how_to_know: values.how_to_know ?? null,
        body: values.body,
        effort: values.effort,
        impact: values.impact,
        time_to_value: values.time_to_value ?? null,
        tags: values.tags,
        cta_type: values.cta_type ?? null,
        cta_url: values.cta_url ?? null,
        notes: values.notes ?? null,
        active: values.active,
        last_reviewed_at: new Date().toISOString(),
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("outcomes_library")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }

      const { error } = await supabase
        .from("outcomes_library")
        .update(payload)
        .eq("id", id!);
      if (error) throw error;
      return id!;
    },
    onSuccess: (savedId) => {
      qc.invalidateQueries({ queryKey: ["admin", "playbook"] });
      toast({ title: "Saved", description: "Move written to the library." });
      if (isNew) navigate(`/admin/playbook/${savedId}`, { replace: true });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.message,
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => save.mutate(values));

  // Cmd/Ctrl-S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void onSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSubmit]);

  const lens = form.watch("lens");
  const sizeBands = form.watch("size_bands");
  const tags = form.watch("tags");

  const duplicate = () => {
    const v = form.getValues();
    form.reset({ ...v, title: `${v.title} (copy)` });
    navigate("/admin/playbook/new");
  };

  if (!isNew && existing.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isNew && existing.error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load Move: {(existing.error as Error).message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate("/admin/playbook")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h2 className="text-xl font-semibold">{isNew ? "New Move" : "Edit Move"}</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button type="button" variant="outline" size="sm" onClick={duplicate}>
              <Copy className="mr-2 h-4 w-4" /> Duplicate
            </Button>
          )}
          <Button type="submit" disabled={save.isPending} size="sm">
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Title + classification */}
          <Section title="Classification">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldLabel label="Title" error={form.formState.errors.title?.message} className="md:col-span-2">
                <Input {...form.register("title")} placeholder="Action-led, 5-9 words" />
              </FieldLabel>

              <FieldLabel label="Lens" error={form.formState.errors.lens?.message}>
                <Controller
                  control={form.control}
                  name="lens"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (v !== "functional") form.setValue("function", null);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LENSES.map((l) => (
                          <SelectItem key={l} value={l}>{LENS_LABELS[l]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FieldLabel>

              <FieldLabel label="Function" error={form.formState.errors.function?.message}>
                <Controller
                  control={form.control}
                  name="function"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                      disabled={lens !== "functional"}
                    >
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {FUNCTIONS.map((fn) => (
                          <SelectItem key={fn} value={fn}>{FUNCTION_LABELS[fn]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FieldLabel>

              <FieldLabel label="Pillar" error={form.formState.errors.pillar?.message}>
                <Controller
                  control={form.control}
                  name="pillar"
                  render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PILLARS.map((p) => (
                          <SelectItem key={p} value={String(p)}>P{p} · {PILLAR_NAMES[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FieldLabel>

              <FieldLabel label="Tier band" error={form.formState.errors.tier_band?.message}>
                <Controller
                  control={form.control}
                  name="tier_band"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIER_BANDS.map((t) => (
                          <SelectItem key={t} value={t}>{TIER_BAND_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FieldLabel>

              <FieldLabel label="Applies to tier (0-5)" error={form.formState.errors.applies_to_tier?.message}>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  {...form.register("applies_to_tier", { valueAsNumber: true })}
                />
              </FieldLabel>

              <FieldLabel label="Effort (1-4)" error={form.formState.errors.effort?.message}>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  {...form.register("effort", { valueAsNumber: true, setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}
                />
              </FieldLabel>

              <FieldLabel label="Impact (1-4)" error={form.formState.errors.impact?.message}>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  {...form.register("impact", { valueAsNumber: true, setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })}
                />
              </FieldLabel>

              <FieldLabel label="Time to value">
                <Input {...form.register("time_to_value")} placeholder="e.g. 2 weeks" />
              </FieldLabel>

              <div className="md:col-span-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Size bands (optional)</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SIZE_BANDS.map((sb) => {
                    const checked = sizeBands.includes(sb);
                    return (
                      <button
                        type="button"
                        key={sb}
                        onClick={() =>
                          form.setValue(
                            "size_bands",
                            checked ? sizeBands.filter((s) => s !== sb) : [...sizeBands, sb],
                            { shouldDirty: true },
                          )
                        }
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs transition",
                          checked
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {sb}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Voice fields">
            <MarkdownField
              label="Why this matters"
              register={form.register("why_matters")}
              value={form.watch("why_matters") ?? ""}
              error={form.formState.errors.why_matters?.message as string | undefined}
            />
            <MarkdownField
              label="What to do"
              register={form.register("what_to_do")}
              value={form.watch("what_to_do") ?? ""}
              error={form.formState.errors.what_to_do?.message as string | undefined}
              rows={6}
            />
            <MarkdownField
              label="How you'll know it worked"
              register={form.register("how_to_know")}
              value={form.watch("how_to_know") ?? ""}
              error={form.formState.errors.how_to_know?.message as string | undefined}
            />
            <MarkdownField
              label="Body (legacy summary)"
              register={form.register("body")}
              value={form.watch("body")}
              error={form.formState.errors.body?.message as string | undefined}
              rows={4}
            />
          </Section>

          <Section title="Tags & CTA">
            <TagsField
              value={tags}
              onChange={(next) => form.setValue("tags", next, { shouldDirty: true })}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FieldLabel label="CTA type">
                <Input {...form.register("cta_type")} placeholder="e.g. workshop, template" />
              </FieldLabel>
              <FieldLabel label="CTA URL" error={form.formState.errors.cta_url?.message as string | undefined}>
                <Input {...form.register("cta_url")} placeholder="https://…" />
              </FieldLabel>
            </div>
            <FieldLabel label="Internal notes">
              <Textarea rows={3} {...form.register("notes")} placeholder="Not shown to respondents." />
            </FieldLabel>
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border bg-card p-4">
            <Label className="flex items-center justify-between text-sm">
              <span>Active in playbook</span>
              <Controller
                control={form.control}
                name="active"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </Label>
            <p className="mt-2 text-xs text-muted-foreground">
              Archive instead of deleting. Reports keep their snapshot.
            </p>
          </div>

          {!isNew && existing.data && (
            <div className="rounded-lg border bg-card p-4 text-xs text-muted-foreground">
              <div>Updated: {new Date(existing.data.updated_at).toLocaleString()}</div>
              <div>
                Reviewed:{" "}
                {existing.data.last_reviewed_at
                  ? new Date(existing.data.last_reviewed_at).toLocaleString()
                  : "never"}
              </div>
              <div className="mt-2 break-all">ID: {existing.data.id}</div>
            </div>
          )}
        </aside>
      </div>
    </form>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldLabel({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function MarkdownField({
  label,
  register,
  value,
  error,
  rows = 3,
}: {
  label: string;
  register: ReturnType<typeof useForm<MoveFormValues>>["register"] extends (...args: any) => infer R ? R : never;
  value: string;
  error?: string;
  rows?: number;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const html = useMemo(() => renderSafeMarkdown(value || ""), [value]);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")}>
          <TabsList className="h-7">
            <TabsTrigger value="write" className="h-6 px-2 text-xs">Write</TabsTrigger>
            <TabsTrigger value="preview" className="h-6 px-2 text-xs">
              <Eye className="mr-1 h-3 w-3" /> Preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tab === "write" ? (
        <Textarea rows={rows} {...register} className="font-mono text-sm" />
      ) : (
        <div
          className="prose prose-sm max-w-none rounded-md border bg-muted/40 p-3 text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TagsField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().toLowerCase();
    if (!t) return;
    if (value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
        Tags
      </Label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-2">
        {value.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1">
            <TagIcon className="h-3 w-3" /> {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="ml-0.5 text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${t}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={add}
          placeholder={value.length ? "" : "Add tag and press Enter"}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}
