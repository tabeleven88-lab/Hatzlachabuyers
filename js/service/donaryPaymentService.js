const DONARY_CHARGE_ENDPOINT = "/api/donary/charge";

export async function chargeDonation(paymentDetails) {
  try {
    const response = await fetch(DONARY_CHARGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(paymentDetails)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        error: result.error || "Payment failed"
      };
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error("Donary payment error:", error);
    return {
      success: false,
      error
    };
  }
}
