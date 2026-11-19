"use client";
// The Call tab lives in the layout, not the page, so switching to Cost and
// back keeps the call exactly where you left it. Hidden, never unmounted.
import { usePathname } from "next/navigation";
import { CallScreen } from "./CallScreen";

export function PersistentCall() {
  const onCall = usePathname() === "/";
  return (
    <div hidden={!onCall}>
      <CallScreen active={onCall} />
    </div>
  );
}
