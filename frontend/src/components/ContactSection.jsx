
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Facebook,
  MessageCircle,
} from "lucide-react";

function ContactSection() {
  return (
    <section id="contact" className="py-16 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900">
            Contact Us
          </h2>
          <p className="mt-3 text-slate-600">
            Have questions about HydroOS? Get in touch with us.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm space-y-5">
            <h3 className="text-xl font-semibold">
              Contact Information
            </h3>

            <p className="flex items-center gap-3">
              <Mail size={20} className="text-blue-600" />
              <a href="mailto:derbewmolla14@gmail.com">
                derbewmolla14@gmail.com
              </a>
            </p>

            <p className="flex items-center gap-3">
              <Phone size={20} className="text-blue-600" />
              <a href="tel:+251937100547">
                +251937100547
              </a>
            </p>

            <p className="flex items-center gap-3">
              <MapPin size={20} className="text-blue-600" />
              Kombolcha, Ethiopia
            </p>

            <div className="flex gap-5 pt-3">
              <a href="https://t.me/YOUR_TELEGRAM_USERNAME"
                 target="_blank" rel="noopener noreferrer"
                 aria-label="Telegram">
                <Send className="text-blue-600" />
              </a>

              <a href="https://imo.im/"
                 target="_blank" rel="noopener noreferrer"
                 aria-label="imo">
                <MessageCircle className="text-blue-600" />
              </a>

              <a href="https://www.facebook.com/YOUR_FACEBOOK_USERNAME"
                 target="_blank" rel="noopener noreferrer"
                 aria-label="Facebook">
                <Facebook className="text-blue-600" />
              </a>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h3 className="text-xl font-semibold mb-4">
              Get in Touch
            </h3>

            <p className="text-slate-600 mb-6">
              Contact our team by email for questions,
              technical support, or collaboration.
            </p>

            <a
              href="mailto:derbewmolla14@gmail.com?subject=HydroOS%20Inquiry"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              Send Us an Email
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
