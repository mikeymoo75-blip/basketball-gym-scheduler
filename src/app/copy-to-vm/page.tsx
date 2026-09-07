import { existsSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";

export const dynamic = "force-dynamic";

function zipReady() {
  return [
    join(process.cwd(), "deploy-assets", "mp-basketball.zip"),
    join(process.cwd(), "public", "mp-basketball.zip"),
  ].some((file) => existsSync(file));
}

export default function CopyToVmPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const ready = zipReady();

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div className="flex items-center gap-3">
        <BrandMark className="size-8 text-primary" />
        <div>
          <p className="font-heading text-xl font-semibold tracking-[0.06em]">MP Basketball</p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Copy to Proxmox
          </p>
        </div>
      </div>
      <h1 className="font-heading text-3xl font-semibold">Download the app files</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Save this zip on your Windows PC, unzip it, then use WinSCP to copy the
        folder into <code className="text-foreground">/opt/mp-basketball</code> on
        the Ubuntu VM.
      </p>
      {ready ? (
        <a
          href="/api/vm-zip"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground"
        >
          Download mp-basketball.zip
        </a>
      ) : (
        <p className="text-sm text-destructive">The zip file is missing on this preview.</p>
      )}
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Unzip. You should see Dockerfile, docker-compose.yml, and package.json.</li>
        <li>WinSCP → SFTP → the VM’s LAN IP → port 22.</li>
        <li>View → Show hidden files. Drag those files into /opt/mp-basketball.</li>
      </ol>
    </div>
  );
}
