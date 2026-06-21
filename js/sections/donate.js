import { getState, subscribe } from "../store.js";
import { t } from "../language.js";
import { chargeDonation } from "../service/donaryPaymentService.js";

export function initDonate() {
  const title = document.getElementById("donateTitle");
  const form = document.getElementById("donaryPaymentForm");
  const amountInput = document.getElementById("donaryAmount");
  const amountButtons = document.querySelectorAll("[data-donary-amount]");

  if (!title) return;

  subscribe((state) => {
    if (state.donationContext === "pidyon") {
      title.innerText = t("donate.pidyonTitle");
    } else if (state.donationContext === "pushka") {
      title.innerText = t("donate.pushkaTitle");
    } else {
      title.innerText = t("donate.title");
    }
  });

  amountButtons.forEach((button) => {
    button.addEventListener("click", () => {
      amountInput.value = button.dataset.donaryAmount;

      amountButtons.forEach(item => {
        item.classList.remove("bg-amber-600", "text-white");
        item.classList.add("bg-white");
      });

      button.classList.add("bg-amber-600", "text-white");
      button.classList.remove("bg-white");
    });
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = document.getElementById("donarySubmit");
    const formData = Object.fromEntries(new FormData(form));
    const amount = Number(formData.amount);

    if (!amount || amount <= 0) {
      alert(t("donate.amountError"));
      return;
    }

    submitButton.disabled = true;
    submitButton.innerText = t("donate.processing");

    const result = await chargeDonation({
      ...formData,
      amount,
      donationContext: getState().donationContext || "general"
    });

    if (result.success) {
      alert(t("donate.success"));
      form.reset();
      amountButtons.forEach(button => {
        button.classList.remove("bg-amber-600", "text-white");
        button.classList.add("bg-white");
      });
    } else {
      alert(t("donate.error"));
    }

    submitButton.disabled = false;
    submitButton.innerText = t("donate.pay");
  });
}
