import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnnouncements, type APIAnnouncement } from "@/services/api";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, AlertTriangle, Inbox } from "lucide-react";
import { motion } from "framer-motion";
import { timeAgo } from "@/lib/utils";

// --- Sub-Component for a single announcement in the timeline ---
const AnnouncementNode = ({ announcement, index }: { announcement: APIAnnouncement, index: number }) => {
  return (
    <motion.div
      key={announcement.id}
      className="relative pl-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
    >
      {/* Timeline Dot and Icon */}
      <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand/15 ring-8 ring-background">
        <Megaphone className="h-4 w-4 text-brand" />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
            <h3 className="font-semibold text-foreground">{announcement.title}</h3>
        </div>
        <time className="text-xs font-medium text-muted-foreground">
            {timeAgo(announcement.created_at)}
        </time>
        <p className="mt-2 text-sm text-muted-foreground">{announcement.message}</p>
      </div>
    </motion.div>
  );
};

// --- Sub-Component for the loading state ---
const AnnouncementsSkeleton = () => (
  <div className="space-y-8">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-4 w-full mt-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// --- Sub-Component for displaying an empty state ---
const EmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card-foreground/5 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
            <Inbox className="h-8 w-8 text-brand" />
        </div>
        <h3 className="mt-6 text-xl font-semibold">No Announcements Yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">Check back later for new updates and announcements.</p>
    </div>
);

// --- Sub-Component for displaying an error ---
const ErrorState = ({ error }: { error: Error }) => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/50 bg-destructive/5 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="mt-6 text-xl font-semibold text-destructive">Failed to Load Announcements</h3>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
);


// --- Main Page Component ---
export default function AnnouncementsPage() {
  const { data, isLoading, isError, error } = useQuery<APIAnnouncement[], Error>({
    queryKey: ["announcements"],
    queryFn: ({ signal }) => getAnnouncements(signal),
  });

  const renderContent = () => {
    if (isLoading) {
      return <AnnouncementsSkeleton />;
    }

    if (isError) {
      return <ErrorState error={error} />;
    }

    if (!data || data.length === 0) {
      return <EmptyState />;
    }

    return (
      <div className="relative pl-2">
        {/* The main timeline bar */}
        <div className="absolute left-5 top-2 h-full w-0.5 bg-border" aria-hidden="true" />
        <div className="space-y-10">
            {data.map((announcement, i) => (
                <AnnouncementNode key={announcement.id} announcement={announcement} index={i} />
            ))}
        </div>
      </div>
    );
  };

  return (
    <AppShell title="Announcements" subtitle="Latest updates and news from the administration.">
      <div className="mt-6">
        {renderContent()}
      </div>
    </AppShell>
  );
}