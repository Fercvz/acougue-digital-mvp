import type { NotificationStatus, Order } from "../shared/types.js";

export function whatsappConfigured() {
  return (
    process.env.WHATSAPP_ENABLED === "true" &&
    !!process.env.WHATSAPP_ACCESS_TOKEN &&
    !!process.env.WHATSAPP_PHONE_NUMBER_ID &&
    !!process.env.WHATSAPP_TEMPLATE_RECEIVED &&
    !!process.env.WHATSAPP_TEMPLATE_READY
  );
}
/** Only called following the customer's explicit opt-in and order state transitions. */
export async function notifyWhatsApp(
  order: Order,
  trackingUrl: string,
  kind: "received" | "ready",
): Promise<NotificationStatus> {
  if (!order.whatsappOptIn || !order.phone)
    return {
      status: "not_requested",
      message: "Acompanhe pelo QR code ou pelo painel.",
    };
  if (!whatsappConfigured())
    return {
      status: "disabled",
      message:
        "WhatsApp ainda não configurado pela loja. Acompanhe pelo QR code ou pelo painel.",
    };
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  if (
    !/^v\d+\.\d+$/.test(version) ||
    !/^\d+$/.test(process.env.WHATSAPP_PHONE_NUMBER_ID || "")
  )
    return {
      status: "failed",
      message:
        "Configuração do WhatsApp inválida. O pedido continua no painel.",
    };
  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        signal: AbortSignal.timeout(12000),
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: order.phone,
          type: "template",
          template: {
            name:
              kind === "ready"
                ? process.env.WHATSAPP_TEMPLATE_READY
                : process.env.WHATSAPP_TEMPLATE_RECEIVED,
            language: {
              code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR",
            },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: order.ticket },
                  { type: "text", text: trackingUrl },
                ],
              },
            ],
          },
        }),
      },
    );
    const body = (await response.json()) as { messages?: { id: string }[] };
    if (!response.ok || !body.messages?.[0]?.id)
      return {
        status: "failed",
        message:
          "O WhatsApp não aceitou o envio. Acompanhe pelo QR code ou pelo painel.",
      };
    return {
      status: "sent",
      message:
        "Mensagem aceita pelo WhatsApp para envio. A entrega depende do serviço e do celular.",
      providerId: body.messages[0].id,
      sentAt: Date.now(),
    };
  } catch {
    return {
      status: "failed",
      message:
        "Não foi possível enviar pelo WhatsApp. O pedido continua no painel e no QR code.",
    };
  }
}
