import { MainShell } from "@/components/(main)";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return <MainShell>{children}</MainShell>;
}
