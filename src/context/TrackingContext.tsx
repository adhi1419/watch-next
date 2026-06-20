import { createContext, useContext, type ReactNode } from "react";
import { useTrackingState } from "../hooks/useTrackingState";

type TrackingContextType = ReturnType<typeof useTrackingState>;

const TrackingContext = createContext<TrackingContextType | null>(null);

export function TrackingProvider({ children }: { children: ReactNode }) {
  const tracking = useTrackingState();
  return <TrackingContext.Provider value={tracking}>{children}</TrackingContext.Provider>;
}

export function useTracking(): TrackingContextType {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error("useTracking must be used within TrackingProvider");
  return ctx;
}
