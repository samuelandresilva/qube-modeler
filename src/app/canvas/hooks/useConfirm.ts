import { useCallback, useState } from "react";

export type ConfirmRequest = {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

export function useConfirm() {
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const requestConfirm = useCallback(
    (message: string, onConfirm: () => void, confirmLabel?: string) => {
      setConfirm({ message, onConfirm, confirmLabel });
    },
    [],
  );

  const dismissConfirm = useCallback(() => setConfirm(null), []);

  const acceptConfirm = useCallback(() => {
    if (!confirm) return;
    confirm.onConfirm();
    setConfirm(null);
  }, [confirm]);

  return { confirm, requestConfirm, dismissConfirm, acceptConfirm };
}
