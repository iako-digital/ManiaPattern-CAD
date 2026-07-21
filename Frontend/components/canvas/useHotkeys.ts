import { useEffect } from "react";

interface HotkeyHandlers {
  onUnfold: () => void;
  onAutoCenter: () => void;
  onAlignmentSnap: () => void;
  onClearStage: () => void;
}

export function useHotkeys({ onUnfold, onAutoCenter, onAlignmentSnap, onClearStage }: HotkeyHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "F2":
          e.preventDefault();
          onUnfold();
          break;
        case "F3":
          e.preventDefault();
          onAutoCenter();
          break;
        case "F4":
          e.preventDefault();
          onAlignmentSnap();
          break;
        case "F10":
          e.preventDefault();
          onClearStage();
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUnfold, onAutoCenter, onAlignmentSnap, onClearStage]);
}
