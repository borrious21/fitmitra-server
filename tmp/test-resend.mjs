import dotenv from 'dotenv';
dotenv.config();

const { resend, MAIL_FROM } = await import('../src/config/mailer.config.js');
console.log('Resend client created OK');
console.log('MAIL_FROM:', MAIL_FROM);
process.exit(0);
