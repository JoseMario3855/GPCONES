const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    // Configuración del transporter de email
    // En producción, usar variables de entorno para la configuración
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER || 'gpcones.system@gmail.com',
        pass: process.env.SMTP_PASS || 'your-app-password' // Usar contraseña de aplicación
      }
    });

    // Verificar configuración del transporter
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Servidor de email configurado correctamente');
    } catch (error) {
      console.error('❌ Error configurando servidor de email:', error.message);
      console.log('📧 Para configurar email, actualiza las variables de entorno:');
      console.log('   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
    }
  }

  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: {
          name: 'GPCONES - Sistema de Catastro',
          address: process.env.SMTP_USER || 'gpcones.system@gmail.com'
        },
        to: userEmail,
        subject: 'Recuperación de Contraseña - GPCONES',
        html: this.generatePasswordResetHTML(userName, resetUrl),
        text: this.generatePasswordResetText(userName, resetUrl)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de recuperación enviado:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error enviando email de recuperación:', error);
      return { success: false, error: error.message };
    }
  }

  generatePasswordResetHTML(userName, resetUrl) {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña - GPCONES</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #2E8B57;
            }
            .logo {
                color: #2E8B57;
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .subtitle {
                color: #666;
                font-size: 16px;
            }
            .content {
                margin-bottom: 30px;
            }
            .button {
                display: inline-block;
                background: linear-gradient(135deg, #2E8B57 0%, #1E90FF 100%);
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                text-align: center;
                margin: 20px 0;
                transition: transform 0.2s;
            }
            .button:hover {
                transform: translateY(-2px);
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .expiry {
                color: #e74c3c;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏠 GPCONES</div>
                <div class="subtitle">Sistema de Catastro Integral</div>
            </div>
            
            <div class="content">
                <h2>Hola ${userName},</h2>
                
                <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en GPCONES.</p>
                
                <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Importante:</strong>
                    <ul>
                        <li>Este enlace expirará en <span class="expiry">30 minutos</span></li>
                        <li>Solo puede ser usado una vez</li>
                        <li>Si no solicitaste este cambio, ignora este email</li>
                    </ul>
                </div>
                
                <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
                    ${resetUrl}
                </p>
            </div>
            
            <div class="footer">
                <p><strong>GPCONES</strong> - Sistema de Catastro Integral</p>
                <p>Desarrollado por <strong>BY CONESTUDIOS</strong></p>
                <p>Este es un email automático, por favor no responder.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generatePasswordResetText(userName, resetUrl) {
    return `
GPCONES - Sistema de Catastro Integral
=====================================

Hola ${userName},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en GPCONES.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetUrl}

IMPORTANTE:
- Este enlace expirará en 30 minutos
- Solo puede ser usado una vez
- Si no solicitaste este cambio, ignora este email

Si tienes problemas con el enlace, copia y pégalo directamente en tu navegador.

---
GPCONES - Sistema de Catastro Integral
Desarrollado por BY CONESTUDIOS
Este es un email automático, por favor no responder.
    `;
  }

  // Generar token seguro para recuperación
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new EmailService();
