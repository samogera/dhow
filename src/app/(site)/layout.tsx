import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/parts";

/** Public website: dhowpartners.com pages. Every page opens with a navy hero, so the header starts transparent. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader dark />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
