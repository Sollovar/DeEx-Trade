import React from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { useTheme } from "./ThemeContext";

const DYNAMIC_SETTINGS = {
  environmentId: "b64ba473-3830-4799-9a51-dce3c18b33be",
  walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors],
};

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const settings = React.useMemo(() => DYNAMIC_SETTINGS, []);

  return (
    <DynamicContextProvider
      theme={isDark ? "dark" : "light"}
      settings={settings}
    >
      {children}
    </DynamicContextProvider>
  );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <WalletProviderInner>{children}</WalletProviderInner>;
}
