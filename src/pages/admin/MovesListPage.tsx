import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import {
  FUNCTION_LABELS,
  FUNCTIONS,
  LENS_LABELS,
  LENSES,
  PILLARS,
  TIER_BAND_LABELS,
  TIER_BANDS,
  type Move,
} from "@/lib/playbook";
import { PILLAR_NAMES } from "@/lib/assessment";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STALE_DAYS = 90;

type Filters = {
  q: string;
  lens: string;
  pillar: string;
  tier_band: string;
  function: string;
  status: "active" | "inactive" | "all";
};

const DEFAULT_FILTERS: Filters = {
  q: "",
  lens: "all",
  pillar: "all",
  tier_band: "all",
  function: "all",
  status: "active",
};

export default function MovesListPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const query = useQuery({
    queryKey: ["admin", "playbook", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outcomes_library")
        .select(
          "id,title,lens,pillar,tier_band,applies_to_tier,function,effort,impact,active,last_reviewed_at,updated_at,tags,why_matters,what_to_do,how_to_know",
        )
        .order("updated_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as (Move & { why_matters: string | null; what_to_do: string | null; how_to_know: string | null })[];
    },
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const list = query.data ?? [];
    const q = filters.q.trim().toLowerCase();
    return list.filter((m) => {
      if (filters.status === "active" && !m.active) return false;
      if (filters.status === "inactive" && m.active) return false;
      if (filters.lens !== "all" && m.lens !== filters.lens) return false;
      if (filters.pillar !== "all" && String(m.pillar) !== filters.pillar) return false;
      if (filters.tier_band !== "all" && m.tier_band !== filters.tier_band) return false;
      if (filters.function !== "all") {
        if (filters.function === "__none__" && m.function) return false;
        if (filters.function !== "__none__" && m.function !== filters.function) return false;
      }
      if (q) {
        const hay = `${m.title} ${(m.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query.data, filters]);

  const total = query.data?.length ?? 0;
  const staleCutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  const incompleteCount = useMemo(() => {
    return (query.data ?? []).filter(
      (m) => m.active && (!m.why_matters?.trim() || !m.what_to_do?.trim() || !m.how_to_know?.trim()),
    ).length;
  }, [query.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Moves</h2>
          <p className="text-sm text-muted-foreground">
            {query.isLoading ? "Loading…" : `${rows.length} of ${total} Moves`}
            {!query.isLoading && incompleteCount > 0 && (
              <>
                {" · "}
                <span className="text-amber-600">
                  {incompleteCount} incomplete (missing why/what/how)
                </span>
              </>
            )}
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/playbook/new">
            <Plus className="mr-2 h-4 w-4" /> New Move
          </Link>
        </Button>
      </div>

      <div className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Search title or tag"
            className="pl-8"
          />
        </div>
        <FilterSelect
          value={filters.lens}
          onChange={(v) => setFilters((f) => ({ ...f, lens: v }))}
          placeholder="Lens"
          options={[{ value: "all", label: "All lenses" }].concat(
            LENSES.map((l) => ({ value: l, label: LENS_LABELS[l] })),
          )}
        />
        <FilterSelect
          value={filters.pillar}
          onChange={(v) => setFilters((f) => ({ ...f, pillar: v }))}
          placeholder="Pillar"
          options={[{ value: "all", label: "All pillars" }].concat(
            PILLARS.map((p) => ({ value: String(p), label: `P${p} · ${PILLAR_NAMES[p]}` })),
          )}
        />
        <FilterSelect
          value={filters.tier_band}
          onChange={(v) => setFilters((f) => ({ ...f, tier_band: v }))}
          placeholder="Tier band"
          options={[{ value: "all", label: "All bands" }].concat(
            TIER_BANDS.map((t) => ({ value: t, label: TIER_BAND_LABELS[t] })),
          )}
        />
        <FilterSelect
          value={filters.function}
          onChange={(v) => setFilters((f) => ({ ...f, function: v }))}
          placeholder="Function"
          options={[
            { value: "all", label: "All functions" },
            { value: "__none__", label: "— None —" },
            ...FUNCTIONS.map((fn) => ({ value: fn, label: FUNCTION_LABELS[fn] })),
          ]}
        />
        <FilterSelect
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v as Filters["status"] }))}
          placeholder="Status"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Archived" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      <div className="rounded-lg border bg-card">
        {query.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : query.error ? (
          <div className="px-6 py-10 text-sm text-destructive">
            Failed to load Moves: {(query.error as Error).message}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No Moves match these filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-28">Lens</TableHead>
                <TableHead className="w-20">Pillar</TableHead>
                <TableHead className="w-24">Band</TableHead>
                <TableHead className="w-36">Function</TableHead>
                <TableHead className="w-20">Effort</TableHead>
                <TableHead className="w-32">Reviewed</TableHead>
                <TableHead className="w-20 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => {
                const reviewedAt = m.last_reviewed_at
                  ? new Date(m.last_reviewed_at).getTime()
                  : 0;
                const stale = !reviewedAt || reviewedAt < staleCutoff;
                return (
                  <TableRow key={m.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link
                        to={`/admin/playbook/${m.id}`}
                        className="hover:underline"
                      >
                        {m.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {LENS_LABELS[m.lens as keyof typeof LENS_LABELS] ?? m.lens}
                    </TableCell>
                    <TableCell>P{m.pillar}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.tier_band ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.function
                        ? FUNCTION_LABELS[m.function as keyof typeof FUNCTION_LABELS] ?? m.function
                        : "—"}
                    </TableCell>
                    <TableCell>{m.effort ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.last_reviewed_at ? (
                        <span className={stale ? "text-amber-600" : ""}>
                          {formatDistanceToNow(new Date(m.last_reviewed_at), {
                            addSuffix: true,
                          })}
                        </span>
                      ) : (
                        <span className="text-amber-600">never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={m.active ? "secondary" : "outline"}>
                        {m.active ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
