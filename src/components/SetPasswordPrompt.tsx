"use client";

import { useEffect, useState } from "react";
import SetPasswordModal from "./SetPasswordModal";

export default function SetPasswordPrompt() {
  const [showModal, setShowModal] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const response = await fetch("/api/auth/session");

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data.authenticated && data.user && !data.user.hasPassword) {
          setShowModal(true);
        }
      } catch {
        // ignore
      } finally {
        setChecked(true);
      }
    }

    check();
  }, []);

  if (!checked) return null;

  return <SetPasswordModal open={showModal} onClose={() => setShowModal(false)} />;
}
