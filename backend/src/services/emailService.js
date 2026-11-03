import { env } from '../config/env.js';

export async function sendPasswordOtp({ to, code }) {
    if (env.email.provider === 'none') {
        const error = new Error('Email delivery is not configured. Set EMAIL_PROVIDER and its credentials before requesting an OTP.');
        error.statusCode = 503;
        throw error;
    }

    if (env.email.provider === 'resend') {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${env.email.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: env.email.from, to: [to], subject: 'HydroOS password change code', text: `Your HydroOS password change code is ${code}. It expires in 10 minutes.` })
        });
        if (!response.ok) {
            const error = new Error('The password OTP email could not be delivered.');
            error.statusCode = 502;
            throw error;
        }
        return;
    }

    const error = new Error('The configured email provider is unsupported.');
    error.statusCode = 503;
    throw error;
}
