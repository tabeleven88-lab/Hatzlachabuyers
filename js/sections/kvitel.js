import { submitKvitel } from "./kvitelService.js";
import { showPage } from "../router.js";
import { setState } from "../store.js";
import { t } from "../language.js";

export function initKvitel() {
  const form = document.getElementById("kvitelForm");
  if (!form) return;

  const pidyonBtn = document.getElementById("pidyonToggle");
  const pidyonNote = document.getElementById("pidyonNote");

  let hasPidyon = false;

  pidyonBtn.addEventListener("click", () => {
    hasPidyon = !hasPidyon;

    if (hasPidyon) {
      pidyonBtn.classList.add("bg-green-500", "text-white");
      pidyonNote.classList.remove("hidden");
    } else {
      pidyonBtn.classList.remove("bg-green-500", "text-white");
      pidyonNote.classList.add("hidden");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = form.querySelector("textarea").value.trim();
    const name = form.querySelector("input[name='name']").value.trim();
    const email = form.querySelector("input[name='email']").value.trim();

    if (!text) {
      alert(t("kvitel.emptyError"));
      return;
    }

    const button = form.querySelector("button[type='submit']");
    const submittedWithPidyon = hasPidyon;

    button.disabled = true;
    button.innerText = t("kvitel.sending");

    try {
      const result = await submitKvitel({
        text,
        name: name || "Anonymous",
        email: email || null,
        hasPidyon: submittedWithPidyon,
        createdAt: Date.now(),
        status: "pending"
      });

      if (result.success) {
        button.innerText = t("kvitel.sent");

        form.reset();
        pidyonBtn.classList.remove("bg-green-500", "text-white");
        pidyonNote.classList.add("hidden");
        hasPidyon = false;

        setTimeout(() => {
          if (submittedWithPidyon) {
            setState({ donationContext: "pidyon" });
            showPage("donate");
          } else {
            showPage("hero");
          }

          button.innerText = t("common.submit");
          button.disabled = false;
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      alert(t("common.error"));

      button.disabled = false;
      button.innerText = t("common.submit");
    }
  });
}
