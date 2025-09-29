import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnnouncements, type APIAnnouncement } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { motion } from "framer-motion";
import { timeAgo } from "@/lib/utils";

export default function AnnouncementsPage() {
  const { data, isLoading, isError, error } = useQuery<APIAnnouncement[], Error>({
    queryKey: ["announcements"],
    queryFn: ({ signal }) => getAnnouncements(signal),
  });

  return (
    <AppShell title="Announcements">
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading announcements...</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : (
          data?.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="overflow-hidden border-none shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-8 w-8 rounded-lg bg-brand/15 text-brand inline-flex items-center justify-center shrink-0">
                      <Megaphone className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base truncate">{a.title}</CardTitle>
                        <Badge variant="secondary" className="shrink-0">
                          {timeAgo(a.created_at)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 pl-14">
                  <p className="text-sm text-muted-foreground">{a.message}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </AppShell>
  );
}