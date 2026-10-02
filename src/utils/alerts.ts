type AlertListener = (title: string, message: string, type?: "success" | "error" | "info") => void;
type ConfirmListener = (title: string, message: string, onConfirm: () => void, confirmText?: string) => void;

let alertListener: AlertListener | null = null;
let confirmListener: ConfirmListener | null = null;

export const setAlertListener = (listener: AlertListener) => { alertListener = listener; };
export const setConfirmListener = (listener: ConfirmListener) => { confirmListener = listener; };

export const customAlert = (title: string, message: string, type: "success" | "error" | "info" = "info") => {
  if (alertListener) {
    alertListener(title, message, type);
  } else {
    console.warn("Global modal provider not mounted.");
  }
};

export const customConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Confirm") => {
  if (confirmListener) {
    confirmListener(title, message, onConfirm, confirmText);
  } else {
    console.warn("Global modal provider not mounted.");
  }
};