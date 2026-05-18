import { MessageCircle, Mic, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

import TwinChatView from "@/components/creator/TwinChatView";
import VoiceStudioView from "@/components/creator/VoiceStudioView";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Unified creator surface: train voice (Instagram + text) and Twin chat with one active profile. */
export default function DigitalTwinPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "train" ? "train" : "chat";
  const chatLayoutLocked = defaultTab === "chat";

  useEffect(() => {
    if (tabParam && tabParam !== "train") {
      setSearchParams({}, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const onTabChange = (v: string) => {
    if (v === "train") {
      setSearchParams({ tab: "train" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-[#faf6ef] text-foreground dark:bg-background",
        chatLayoutLocked
          ? "h-[100dvh] overflow-hidden"
          : "min-h-dvh overflow-x-hidden pb-6",
      )}
    >
      <div className="pointer-events-none fixed inset-0 -z-20 dark:opacity-55">
        <div className="absolute left-[-15%] top-[-25%] h-[520px] w-[520px] rounded-full bg-amber-200/35 blur-[170px] dark:bg-amber-950/20" />
      </div>

      <header className="relative z-40 mx-auto flex w-full max-w-[90rem] flex-wrap items-center justify-between gap-4 px-4 py-3 md:py-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 text-white shadow-md shadow-rose-300/40">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="truncate">
            Launchy{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
              Digital Twin
            </span>
          </span>
        </Link>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
          <ThemeToggle />
          <Link
            to="/campaigns"
            className="hidden h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-3 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur sm:inline-flex dark:border-border dark:bg-card dark:text-foreground"
          >
            Campaigns
          </Link>
          <Link
            to="/studio"
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 px-3 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur dark:border-border dark:bg-card dark:text-foreground"
          >
            Studio
          </Link>
        </div>
      </header>

      {defaultTab === "train" ? (
        <section className="relative z-10 mx-auto max-w-7xl shrink-0 px-4 pb-4">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border bg-gradient-to-br from-card via-fuchsia-50/35 to-amber-50/25 px-6 py-7 text-center shadow-md dark:from-card dark:via-fuchsia-950/15 dark:to-amber-950/10 sm:py-8">
            <div className="pointer-events-none absolute -left-16 top-0 h-36 w-36 rounded-full bg-fuchsia-300/25 blur-3xl dark:opacity-40" />
            <div className="relative">
              <div className="inline-flex rounded-full border border-border bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Creator hub
              </div>
              <h1 className="font-display mt-4 text-balance text-2xl font-semibold italic tracking-tight text-foreground sm:text-3xl">
                Your voice in the room.
                <span className="mt-1 block bg-gradient-to-r from-fuchsia-500 via-rose-500 to-orange-400 bg-clip-text not-italic text-transparent sm:mt-0 sm:inline sm:px-2">
                  Your twin on demand.
                </span>
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Train your tone — then ask for hooks, rewrites, and launches.</p>
            </div>
          </div>
        </section>
      ) : null}

      <Tabs
        value={defaultTab}
        onValueChange={onTabChange}
        className={cn(
          "relative z-10 mx-auto flex w-full max-w-[90rem] flex-col px-3 pb-4 md:px-5",
          chatLayoutLocked && "min-h-0 flex-1",
        )}
      >
        <TabsList className="mx-auto mb-4 grid h-auto w-full max-w-lg grid-cols-2 gap-1 rounded-full border border-border bg-card/95 p-1.5 shadow-md backdrop-blur-md dark:bg-card md:hidden">
          <TabsTrigger
            value="train"
            className="rounded-full px-3 py-3 text-sm font-semibold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-500 data-[state=active]:to-orange-400 data-[state=active]:text-white data-[state=inactive]:text-zinc-600 data-[state=inactive]:dark:text-muted-foreground"
          >
            <Mic className="mr-1.5 inline h-4 w-4" />
            Train voice
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="rounded-full px-3 py-3 text-sm font-semibold transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-sky-500 data-[state=active]:text-white data-[state=inactive]:text-zinc-600 data-[state=inactive]:dark:text-muted-foreground"
          >
            <MessageCircle className="mr-1.5 inline h-4 w-4" />
            Twin chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="train" className="mt-0 flex flex-col focus-visible:outline-none">
          <VoiceStudioView embedded twinTabLink="?tab=chat" />
        </TabsContent>

        <TabsContent value="chat" className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden focus-visible:outline-none">
          <TwinChatView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
