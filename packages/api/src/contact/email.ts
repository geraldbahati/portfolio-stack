export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

export function inquiryEmailHtml(input: {
  name: string;
  email: string;
  message: string;
  submissionId: string;
  submittedAt: string;
}) {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const message = escapeHtml(input.message).replaceAll("\n", "<br>");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:32px;">
          <img src="https://www.geraldbahati.dev/logo.webp" alt="GB" width="48" height="48" style="display:block;filter:invert(1);">
        </td></tr>
        <tr><td style="background-color:#141414;border-radius:12px 12px 0 0;padding:32px 32px 24px;border-top:3px solid #d97706;">
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#d97706;font-weight:600;">New Submission</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Message from ${name}</h1>
        </td></tr>
        <tr><td style="background-color:#141414;padding:0 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:8px;border:1px solid #262626;">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #262626;">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#737373;">Name</p>
                <p style="margin:4px 0 0;font-size:15px;color:#e5e5e5;font-weight:500;">${name}</p>
              </td>
              <td style="padding:16px 20px;border-bottom:1px solid #262626;border-left:1px solid #262626;">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#737373;">Email</p>
                <p style="margin:4px 0 0;font-size:15px;color:#d97706;font-weight:500;">${email}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#737373;">Submitted</p>
                <p style="margin:4px 0 0;font-family:'JetBrains Mono','SF Mono',monospace;font-size:13px;color:#a3a3a3;">${escapeHtml(input.submittedAt)}</p>
              </td>
              <td style="padding:16px 20px;border-left:1px solid #262626;">
                <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#737373;">ID</p>
                <p style="margin:4px 0 0;font-family:'JetBrains Mono','SF Mono',monospace;font-size:12px;color:#a3a3a3;">${escapeHtml(input.submissionId)}</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background-color:#141414;padding:0 32px 32px;">
          <p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#737373;font-weight:600;">Message</p>
          <div style="background-color:#1a1a1a;border-radius:8px;border:1px solid #262626;padding:20px;">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#d4d4d4;">${message}</p>
          </div>
        </td></tr>
        <tr><td style="background-color:#141414;padding:0 32px 32px;border-radius:0 0 12px 12px;">
          <a href="mailto:${email}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#000000;text-decoration:none;background-color:#d97706;border-radius:6px;">Reply to ${name}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function confirmationEmailHtml(name: string) {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td align="center" style="padding-bottom:32px;">
          <img src="https://www.geraldbahati.dev/logo.webp" alt="GB" width="48" height="48" style="display:block;filter:invert(1);">
        </td></tr>
        <tr><td style="background-color:#141414;border-radius:12px;border-top:3px solid #d97706;padding:40px 32px;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Thanks for reaching out!</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#a3a3a3;">Hi ${safeName},</p>
          <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#d4d4d4;">Thanks for getting in touch. I've received your message and will get back to you shortly.</p>
          <hr style="border:none;border-top:1px solid #262626;margin:0 0 24px;">
          <p style="margin:0;font-size:15px;color:#d4d4d4;line-height:1.6;">Talk soon,<br><strong style="color:#ffffff;">Gerald Bahati</strong></p>
          <p style="margin:8px 0 0;font-size:13px;color:#737373;">Software Engineer</p>
        </td></tr>
        <tr><td align="center" style="padding:24px 32px;">
          <a href="https://www.geraldbahati.dev" style="font-size:13px;color:#d97706;text-decoration:none;font-weight:500;">geraldbahati.dev</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
