import { CasinoShell } from "@/components/casino/CasinoShell";

export default function PlayLayout({ children }: LayoutProps<"/play">) {
  return <CasinoShell>{children}</CasinoShell>;
}
