"use client";

// BlurToggle — sampul di-blur secara default (aman kalau layar terlihat orang lain).
// Pilihan disimpan di localStorage; efeknya dipasang lewat atribut data-blur di <html>
// dan diatur oleh CSS (lihat globals.css).

import { useEffect, useState } from "react";

export function BlurToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    try {
      setOn(localStorage.getItem("blur") !== "off");
    } catch {
      /* abaikan */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.blur = on ? "on" : "off";
  }, [on]);

  function flip() {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem("blur", next ? "on" : "off");
    } catch {
      /* abaikan */
    }
  }

  return (
    <button type="button" className={on ? "on" : ""} onClick={flip}>
      Sampul: blur {on ? "(aktif)" : ""}
    </button>
  );
}
