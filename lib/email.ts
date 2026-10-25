
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

const resend = apiKey ? new Resend(apiKey) : null;

const emailFrom =
  process.env.EMAIL_FROM || "CampusCare <onboarding@resend.dev>";

interface SendCampusCareEmailParams {
  to: string;
  recipientName: string;
  senderName: string;
  subject: string;
  message: string;
}

interface SendCampusCareEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export async function sendCampusCareEmail({
  to,
  recipientName,
  senderName,
  subject,
  message,
}: SendCampusCareEmailParams): Promise<SendCampusCareEmailResult> {
  if (!resend) {
    return {
      success: false,
      error: "RESEND_API_KEY is not configured.",
    };
  }

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: [to],
      subject: `CampusCare: ${subject}`,
      text: [
        `Hello ${recipientName},`,
        "",
        `${senderName} sent you a message through LMU CampusCare.`,
        "",
        `Subject: ${subject}`,
        "",
        "Message:",
        message,
        "",
        "Log in to LMU CampusCare to view and respond to your messages.",
        "",
        "LMU CampusCare",
        "Landmark University Student Support Platform",
      ].join("\n"),
    });

    if (result.error) {
      console.error("Resend email error:", result.error.message);

      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      emailId: result.data?.id,
    };
  } catch (error) {
    console.error("CampusCare email error:", error);

    return {
      success: false,
      error: "An unexpected error occurred while sending the email.",
    };
  }
}

