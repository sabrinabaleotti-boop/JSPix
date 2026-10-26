import { SettingsTabs } from "@/components/admin/settings-tabs";

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SettingsTabs />
      {children}
    </>
  );
}
