const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS; // Contraseña de aplicación de 16 caracteres

// Configurar el transporte de Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Helper to prevent sending real emails to mock/test addresses or when SMTP is not configured
function sendMailHelper(mailOptions) {
  const toEmail = mailOptions.to;
  const isMockAddress = toEmail.endsWith('@example.com') || toEmail.includes('test_') || toEmail.includes('mock');
  
  if (isMockAddress || !EMAIL_USER || !EMAIL_PASS) {
    console.log(`[MAILER] Evitando envío de email real a "${toEmail}" (dirección de prueba detectada).`);
    return Promise.resolve({ messageId: 'mock-id-' + Date.now() });
  }
  return transporter.sendMail(mailOptions);
}

/**
 * Envía un correo con el código de verificación (OTP)
 * @param {string} toEmail - Destinatario
 * @param {string} code - Código de 6 dígitos
 */
function sendVerificationEmail(toEmail, code) {
  const mailOptions = {
    from: `"Reproductor Multimedia" <${EMAIL_USER}>`,
    to: toEmail,
    subject: 'Verificación de Cuenta - Código de Seguridad',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1DB954; text-align: center;">Verifica tu Cuenta</h2>
        <p>Hola,</p>
        <p>Gracias por registrarte. Para completar la activación de tu cuenta en el Reproductor Multimedia, utiliza el siguiente código de verificación de un solo uso (OTP):</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background-color: #f5f5f5; padding: 10px 20px; border-radius: 5px; border: 1px dashed #ccc;">
            ${code}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">Este código es válido por 15 minutos. Si no solicitaste este registro, puedes ignorar este correo.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
        <p style="text-align: center; color: #999; font-size: 12px;">© 2026 Reproductor Multimedia local</p>
      </div>
    `,
  };

  return sendMailHelper(mailOptions);
}

/**
 * Envía un correo con el código para restablecer la contraseña
 * @param {string} toEmail - Destinatario
 * @param {string} code - Código de 6 dígitos
 */
function sendPasswordResetEmail(toEmail, code) {
  const mailOptions = {
    from: `"Reproductor Multimedia" <${EMAIL_USER}>`,
    to: toEmail,
    subject: 'Recuperación de Contraseña - Código de Seguridad',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #e11d48; text-align: center;">Recuperación de Contraseña</h2>
        <p>Hola,</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Reproductor Multimedia.</p>
        <p>Utiliza el siguiente código de seguridad para continuar con el proceso:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background-color: #f5f5f5; padding: 10px 20px; border-radius: 5px; border: 1px dashed #ccc;">
            ${code}
          </span>
        </div>
        <p style="color: #666; font-size: 14px;">Este código es válido por 15 minutos. Si no solicitaste este cambio, te recomendamos asegurar tu cuenta.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;">
        <p style="text-align: center; color: #999; font-size: 12px;">© 2026 Reproductor Multimedia local</p>
      </div>
    `,
  };

  return sendMailHelper(mailOptions);
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
