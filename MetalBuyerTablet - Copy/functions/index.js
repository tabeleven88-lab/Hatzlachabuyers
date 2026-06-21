const { onRequest } = require("firebase-functions/v2/https");
const { randomUUID } = require("crypto");

const SANDBOX_DONARY_AUTH_GUID = "96F666B4-587B-4CE3-B4D0-CF04C333794B";
const SANDBOX_DONARY_ORG_GUID = "115e9d3d-baf2-4089-b896-9b2621ffcf1b";
const SANDBOX_CHARGE_URL = "https://sandbox-api.donary.com/v1/External/Charge";

exports.donaryCharge = onRequest(
  {
    cors: true,
    secrets: []
  },
  async (request, response) => {
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }

    const donaryAuthGuid = process.env.DONARY_AUTH_GUID || SANDBOX_DONARY_AUTH_GUID;
    const donaryOrgGuid = process.env.DONARY_ORG_GUID || SANDBOX_DONARY_ORG_GUID;
    const donaryChargeUrl = process.env.DONARY_CHARGE_URL || SANDBOX_CHARGE_URL;
    const payload = buildChargePayload(request.body || {}, {
      orgGUID: donaryOrgGuid,
      currency: process.env.DONARY_CURRENCY || "ILS",
      campaignNum: process.env.DONARY_CAMPAIGN_NUM,
      campaignName: process.env.DONARY_CAMPAIGN_NAME,
      reasonNum: process.env.DONARY_REASON_NUM,
      reasonName: process.env.DONARY_REASON_NAME
    });

    const validationError = validateChargePayload(payload);
    if (validationError) {
      response.status(400).json({ error: validationError });
      return;
    }

    try {
      const donaryResponse = await fetch(donaryChargeUrl, {
        method: "PUT",
        headers: {
          Authorization: donaryAuthGuid,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const rawText = await donaryResponse.text();
      let data = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (error) {
        data = { raw: rawText };
      }

      if (!donaryResponse.ok) {
        response.status(donaryResponse.status).json({
          error: "Donary charge failed",
          details: data
        });
        return;
      }

      response.status(200).json({
        success: true,
        donary: data
      });
    } catch (error) {
      console.error("Donary charge request failed:", error);
      response.status(500).json({ error: "Unable to process payment" });
    }
  }
);

function buildChargePayload(body, settings) {
  const amount = Number(body.amount);
  const donationContext = body.donationContext || "general";
  const now = new Date().toISOString();

  const payload = {
    donor: {
      firstName: cleanString(body.firstName),
      lastName: cleanString(body.lastName),
      phoneNumber: cleanString(body.phoneNumber)
    },
    amount,
    ccNum: digitsOnly(body.ccNum),
    expiry: cleanString(body.expiry),
    cvv: digitsOnly(body.cvv),
    note: `Website donation - ${donationContext}`,
    paymentDate: now,
    paymentMethodId: "Credit_Card",
    uniqueTransactionId: randomUUID(),
    currency: settings.currency,
    orgGUID: settings.orgGUID,
    reasons: null,
    bankAccount: null
  };

  if (settings.campaignNum) {
    payload.campaignNum = Number(settings.campaignNum);
  }

  if (settings.campaignName) {
    payload.campaignName = settings.campaignName;
  }

  if (settings.reasonNum || settings.reasonName) {
    payload.reason = {
      reasonNum: settings.reasonNum ? Number(settings.reasonNum) : undefined,
      reasonName: settings.reasonName
    };
  }

  return payload;
}

function validateChargePayload(payload) {
  if (!payload.amount || payload.amount <= 0) {
    return "Amount is required";
  }

  if (!payload.donor.firstName || !payload.donor.lastName) {
    return "Donor first and last name are required";
  }

  if (!payload.ccNum || payload.ccNum.length < 12) {
    return "Card number is required";
  }

  if (!payload.expiry) {
    return "Card expiry is required";
  }

  if (!payload.cvv || payload.cvv.length < 3) {
    return "CVV is required";
  }

  if (!payload.orgGUID) {
    return "Donary orgGUID is not configured";
  }

  return null;
}

function cleanString(value) {
  return String(value || "").trim();
}

function digitsOnly(value) {
  return cleanString(value).replace(/\D/g, "");
}
