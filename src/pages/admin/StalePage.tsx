import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import {
  FUNCTION_LABELS,
  LENS_LABELS,
  type Move,
} from "@/lib/playbook";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STALE_DAYS = 90;

export default function StalePage() {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const query = useQuery({
    queryKey: ["admin", "playbook", "stale", STALE_DAYS],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outcomes_library")
        .select("id,title,lens,pillar,tier_band,function,active,last_reviewed_at,updated_at")
        .eq("active", true)
        .or(`last_reviewed_at.is.null,last_reviewed_at.lt.${cutoff}`)
        .order("last_reviewed_at", { ascending: true, nullsFirst: true })
        .limit(1000);
      if (error) throw error;
      return data as Move[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Stale Moves</h2>
        <p className="text-sm text-muted-foreground">
          Active Moves not reviewed in the last {STALE_DAYS} days.
          {query.data ? ` (${query.data.length})` : ""}
        </p>
      </div>

      <div className="rounded-lg border bg-card">
        {query.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : query.error ? (
          <div className="px-6 py-10 text-sm text-destructive">
            Failed to load: {(query.error as Error).message}
          </div>
        ) : (query.data ?? []).length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Nothing stale. Nice.
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
                <TableHead className="w-40">Last reviewed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <Link to={`/admin/playbook/${m.id}`} className="hover:underline">
                      {m.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {LENS_LABELS[m.lens as keyof typeof LENS_LABELS] ?? m.lens}
                  </TableCell>
                  <TableCell>P{m.pillar}</TableCell>
                  <TableCell className="text-muted-foreground">{m.tier_band ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.function
                      ? FUNCTION_LABELS[m.function as keyof typeof FUNCTION_LABELS] ?? m.function
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-amber-600">
                    {m.last_reviewed_at
                      ? formatDistanceToNow(new Date(m.last_reviewed_at), { addSuffix: true })
                      : "never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
