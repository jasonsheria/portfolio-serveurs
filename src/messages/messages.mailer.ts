import * as nodemailer from 'nodemailer';

export async function sendMessageReply(to: string, data: {
  senderName: string,
  message: string,
  reply: string
}) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || smtpUser;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const mailOptions = {
    from: fromEmail,
    to,
    subject: 'Réponse à votre message',
    text: `Bonjour ${data.senderName},\n\nVous avez reçu une réponse à votre message :\n"${data.message}"\n\nRéponse :\n"${data.reply}"\n\nCeci est un message automatique.`
  };

  return transporter.sendMail(mailOptions);
}
