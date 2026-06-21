import { showPage } from "../router.js";
import { setState } from "../store.js";
import { addDocument } from "../service/dbService.js";
import { t } from "../language.js";

export function initPushka() {
  const emptyBtn = document.getElementById("emptyPushkaBtn");
  const requestBtn = document.getElementById("requestPushkaBtn");

  const emptyOptions = document.getElementById("emptyOptions");
  const requestForm = document.getElementById("requestPushkaForm");
  const gabaiForm = document.getElementById("gabaiForm");

  const payNowBtn = document.getElementById("payNowBtn");
  const gabaiBtn = document.getElementById("gabaiBtn");

  if (!emptyBtn) return;

  emptyBtn.addEventListener("click", () => {
    emptyOptions.classList.remove("hidden");
    requestForm.classList.add("hidden");
    gabaiForm.classList.add("hidden");
  });

  requestBtn.addEventListener("click", () => {
    requestForm.classList.remove("hidden");
    emptyOptions.classList.add("hidden");
    gabaiForm.classList.add("hidden");
  });

  payNowBtn.addEventListener("click", () => {
    setState({ donationContext: "pushka" });
    showPage("donate");
  });

  gabaiBtn.addEventListener("click", () => {
    gabaiForm.classList.remove("hidden");
  });

  gabaiForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(gabaiForm));
    const result = await addDocument("gabaiRequests", data);

    if (result.success) {
      alert(t("pushka.pickupSuccess"));
      gabaiForm.reset();
      gabaiForm.classList.add("hidden");
    } else {
      alert(t("pushka.submitError"));
    }
  });

  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(requestForm));
    const result = await addDocument("pushkaRequests", data);

    if (result.success) {
      alert(t("pushka.requestSuccess"));
      requestForm.reset();
      requestForm.classList.add("hidden");
    } else {
      alert(t("pushka.submitError"));
    }
  });
}
