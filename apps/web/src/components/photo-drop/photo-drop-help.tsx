"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, CircleHelp, Images, Inbox, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function HelpSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      <div className="space-y-1.5 pl-6 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export function HelpSteps({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function AdminHelp() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Photo drop is a shared space between you and your photo team. They don&apos;t need an account, only the link.
        Nothing in it shows in your shop until you send it on.
      </p>

      <HelpSection icon={<Users className="size-4" />} title="Team → you: the team uploads photos">
        <HelpSteps
          steps={[
            "Copy the team link on this page and send it to whoever takes the photos.",
            "They take or upload photos from any phone or computer, and group the angles of the same product.",
            "They add a price, sizes, colors and a name. Items with a price show as Ready.",
            "If a product isn't available, they mark it Unavailable instead of filling it in. Those are greyed out here so you can remove them.",
            <>
              You review them here and choose: <b className="text-foreground">Create products</b> (opens Add several,
              already filled in) or <b className="text-foreground">Add to gallery only</b>.
            </>,
          ]}
        />
      </HelpSection>

      <HelpSection icon={<Images className="size-4" />} title="You → team: send gallery photos for details">
        <HelpSteps
          steps={[
            <>
              In the Gallery, tap <b className="text-foreground">Select photos</b>, pick photos, then{" "}
              <b className="text-foreground">Send to photo drop</b>, as separate products or as one product.
            </>,
            "They appear on the team link. The team fills in price, sizes and colors, and can add or remove photos.",
            "You review them here and create products, the same as above.",
          ]}
        />
      </HelpSection>

      <HelpSection icon={<ShieldCheck className="size-4" />} title="What happens to the photos">
        <ul className="list-disc space-y-1.5 pl-4">
          <li>Photos you sent from the gallery stay in your gallery. Removing them from the drop never deletes them.</li>
          <li>While a gallery photo is in the drop, the gallery won&apos;t let it be deleted.</li>
          <li>
            <b className="text-foreground">Clean up drop</b> clears the drop only. It never touches gallery photos or
            photos already used on products.
          </li>
          <li>Team photos join your gallery when you create products or add them to the gallery. Not before.</li>
        </ul>
      </HelpSection>

      <HelpSection icon={<Inbox className="size-4" />} title="Keeping the link safe">
        <ul className="list-disc space-y-1.5 pl-4">
          <li>Anyone with the link can add photos and edit items in the drop, but can&apos;t touch your shop.</li>
          <li>Switch the link off when you&apos;re not using it, and back on any time.</li>
          <li>
            <b className="text-foreground">Make a new link</b> stops the old one for good. Use it if the link was
            shared too widely.
          </li>
        </ul>
      </HelpSection>
    </div>
  );
}

function TeamHelp({ shopName }: { shopName: string }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        This is {shopName}&apos;s photo drop. Add product photos here and the shop will review them. No account needed.
      </p>
      <HelpSection icon={<ArrowRight className="size-4" />} title="How to use it">
        <HelpSteps
          steps={[
            <>
              Tap <b className="text-foreground">Take or choose photos</b> and add as many as you like.
            </>,
            <>
              Several photos of the same product? Tap <b className="text-foreground">Select</b>, tap them, then{" "}
              <b className="text-foreground">Group</b>.
            </>,
            "Tap an item to add its price, sizes and colors. A name is optional. You can also add or remove photos there.",
            <>
              Product not available? Tap <b className="text-foreground">Unavailable</b> on the item (or select several
              and tap it). No details needed. You can undo it any time.
            </>,
            <>
              Items with a price show as <b className="text-foreground">Ready</b>. Use the filters to find ones that
              still need details.
            </>,
          ]}
        />
      </HelpSection>
      <HelpSection icon={<Images className="size-4" />} title="Good to know">
        <ul className="list-disc space-y-1.5 pl-4">
          <li>Some items may already have photos from the shop. Just fill in their details.</li>
          <li>Keep this page open until your uploads finish.</li>
          <li>Nothing here appears in the shop until the shop reviews it.</li>
        </ul>
      </HelpSection>
    </div>
  );
}

// "How Photo drop works": the full version (both directions, what happens to
// photos, link safety) for the admin, a short one for the team link.
export function PhotoDropHelp({
  audience,
  shopName = "This shop",
  trigger = "button",
}: {
  audience: "admin" | "team";
  shopName?: string;
  trigger?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 shrink-0"
          onClick={() => setOpen(true)}
          aria-label="How this works"
        >
          <CircleHelp className="size-5" />
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <CircleHelp className="size-4" />
          How Photo drop works
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{audience === "admin" ? "How Photo drop works" : "How this works"}</DialogTitle>
            <DialogDescription className="sr-only">An explanation of Photo drop.</DialogDescription>
          </DialogHeader>
          {audience === "admin" ? <AdminHelp /> : <TeamHelp shopName={shopName} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
