import { Resend } from 'resend';
import { env } from '../config/env.js';

function emailConfigError(message, statusCode = 503) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function deliverEmail({ to, subject, text, html }) {
    if (env.email.provider === 'none') {
        throw emailConfigError('Email delivery is not configured. Set EMAIL_PROVIDER and its credentials before requesting an email.');
    }

    if (env.email.provider !== 'resend') {
        throw emailConfigError('The configured email provider is unsupported.');
    }

    if (!env.email.apiKey) {
        throw emailConfigError('RESEND_API_KEY is not configured.');
    }

    const resend = new Resend(env.email.apiKey);
    const { data, error } = await resend.emails.send({
        from: env.email.from,
        to: [to],
        subject,
        text,
        html
    });

    if (error) {
        throw emailConfigError('The email could not be delivered. Check the Resend configuration and sender verification.', 502);
    }

    return data;
}

export function sendPasswordOtp({ to, code }) {
    return deliverEmail({
        to,
        subject: 'HydroOS password change code',
        text: `Your HydroOS password change code is ${code}. It expires in 10 minutes.`,
        html: `<p>Your HydroOS password change code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`
    });
}

export function sendPasswordResetEmail({ to, resetUrl }) {
    return deliverEmail({
        to,
        subject: 'Reset your HydroOS password',
        text: `We received a request to reset your HydroOS password. Open this link within 15 minutes: ${resetUrl} . If you did not request this, ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Reset your HydroOS password</h2><p>We received a request to reset your HydroOS account password.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#087f8c;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p><p>This link expires in 15 minutes and can only be used once.</p><p>If you did not request a password reset, you can safely ignore this email.</p></div>`
    });
}
