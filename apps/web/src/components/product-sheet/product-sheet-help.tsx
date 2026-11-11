"use client";

import { useState } from "react";
import {
  CircleHelp,
  ListChecks,
  PackagePlus,
  PencilLine,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HelpSection,
  HelpSteps,
} from "@/components/photo-drop/photo-drop-help";

function AdminHelp() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        The team sheet lets people help you keep products up to date without an
        admin account. They only need the link. Everything they change waits
        here until you publish it.
      </p>

      <HelpSection
        icon={<ListChecks className="size-4" />}
        title="Which products are on the sheet"
      >
        <ul className="list-disc space-y-1.5 pl-4">
          <li>
            By default, <b className="text-foreground">all your products</b> are
            on it, including hidden ones and ones you add later. You don&apos;t
            need to add them one by one.
          </li>
          <li>
            To limit it, tap{" "}
            <b className="text-foreground">Only some products…</b> and pick
            them. The team then sees only those.
          </li>
        </ul>
      </HelpSection>

      <HelpSection
        icon={<PencilLine className="size-4" />}
        title="How it works"
      >
        <HelpSteps
          steps={[
            <>
              Tap <b className="text-foreground">Turn on team link</b>, copy the
              link and send it to your team.
            </>,
            "They open it on any phone, tap a product and change its name, price, sale price, stock, sizes, colors, description, or whether it shows in the shop.",
            "They can also add new products using photos already in your gallery.",
            <>
              Their changes appear on this page. Each edit shows what&apos;s
              live now next to what they suggested.
            </>,
            <>
              Tap <b className="text-foreground">Publish</b> to put it in your
              shop, or <b className="text-foreground">Discard</b> to drop it.
              Select several to do them at once.
            </>,
          ]}
        />
      </HelpSection>

      <HelpSection
        icon={<PackagePlus className="size-4" />}
        title="Good to know"
      >
        <ul className="list-disc space-y-1.5 pl-4">
          <li>Nothing the team does changes your shop until you publish it.</li>
          <li>
            If a product changed after the team edited it, you&apos;ll see a
            warning with the old value, so you don&apos;t overwrite a newer
            change by accident.
          </li>
          <li>
            Each product has one suggestion at a time. Later edits update it
            instead of piling up.
          </li>
          <li>
            Affiliate prices aren&apos;t on the sheet. Set those yourself.
          </li>
        </ul>
      </HelpSection>

      <HelpSection
        icon={<ShieldCheck className="size-4" />}
        title="Keeping the link safe"
      >
        <ul className="list-disc space-y-1.5 pl-4">
          <li>
            Anyone with the link can suggest changes, but can&apos;t publish
            them.
          </li>
          <li>
            Switch the link off when you&apos;re not using it, and back on any
            time.
          </li>
          <li>
            <b className="text-foreground">Make a new link</b> stops the old one
            for good. Suggestions already made stay here.
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
        This is {shopName}&apos;s product sheet. Fix product details or add new
        products here, and the shop will review them. No account needed.
      </p>
      <HelpSection
        icon={<PencilLine className="size-4" />}
        title="Editing products"
      >
        <HelpSteps
          steps={[
            "Search or scroll, then tap a product.",
            "Change what's needed: price, sale price, stock, sizes, colors, name, description, or whether it shows in the shop.",
            <>
              Tap <b className="text-foreground">Save & next</b> to go straight
              to the next product.
            </>,
            <>
              Products you changed get an{" "}
              <b className="text-foreground">Edited</b> label. Open one and tap{" "}
              <b className="text-foreground">Undo my changes</b> to take them
              back.
            </>,
          ]}
        />
      </HelpSection>
      <HelpSection
        icon={<PackagePlus className="size-4" />}
        title="Adding new products"
      >
        <HelpSteps
          steps={[
            <>
              Open <b className="text-foreground">New products</b> and tap{" "}
              <b className="text-foreground">Add a new product</b>.
            </>,
            "Choose photos from the shop's gallery. The first one you tap is the cover.",
            "Add a price (required) and anything else you know. A name is optional.",
          ]}
        />
      </HelpSection>
      <HelpSection
        icon={<ShieldCheck className="size-4" />}
        title="Good to know"
      >
        <ul className="list-disc space-y-1.5 pl-4">
          <li>
            Nothing here changes the shop until the shop reviews and publishes
            it.
          </li>
          <li>
            Put your name at the top so the shop knows who made each change.
          </li>
          <li>Prices can have pesewas, e.g. 4.99.</li>
        </ul>
      </HelpSection>
    </div>
  );
}

// "How the team sheet works": the full version for the admin, a short one
// for the team link.
export function ProductSheetHelp({
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setOpen(true)}
        >
          <CircleHelp className="size-4" />
          How the team sheet works
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {audience === "admin"
                ? "How the team sheet works"
                : "How this works"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              An explanation of the product sheet.
            </DialogDescription>
          </DialogHeader>
          {audience === "admin" ? (
            <AdminHelp />
          ) : (
            <TeamHelp shopName={shopName} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
