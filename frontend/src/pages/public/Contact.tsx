import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import EnquiryForm from '../../components/forms/EnquiryForm';
import { useSettings } from '../../hooks/useSettings';

export default function Contact() {
  const { data: settings } = useSettings();

  return (
    <div className="py-8 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
        <p className="mt-2 text-gray-500 max-w-xl mx-auto">
          Have a question or want to get a quote? Fill in the form and we'll be in touch.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

        {/* Contact info */}
        <aside className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">Get in Touch</h2>

          {settings?.phone && (
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
                <a href={`tel:${settings.phone}`}
                  className="text-sm font-medium text-gray-800 hover:text-amber-600">
                  {settings.phone}
                </a>
              </div>
            </div>
          )}

          {settings?.whatsappNumber && (
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">WhatsApp</p>
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=Hi! I have an enquiry.`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-gray-800 hover:text-green-600">
                  {settings.whatsappNumber}
                </a>
              </div>
            </div>
          )}

          {settings?.email && (
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
                <a href={`mailto:${settings.email}`}
                  className="text-sm font-medium text-gray-800 hover:text-amber-600">
                  {settings.email}
                </a>
              </div>
            </div>
          )}

          {(settings?.address ?? settings?.city) && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Address</p>
                <p className="text-sm text-gray-700">
                  {[settings?.address, settings?.city, settings?.country].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Business hours */}
          {settings?.businessHours && Object.values(settings.businessHours).some(Boolean) && (
            <div className="bg-amber-50 rounded-xl p-4 text-sm">
              <p className="font-semibold text-gray-800 mb-2">Business Hours</p>
              {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const).map((day) => {
                const hours = settings.businessHours[day];
                if (!hours) return null;
                return (
                  <div key={day} className="flex justify-between text-xs text-gray-600 py-0.5">
                    <span className="capitalize">{day}</span>
                    <span>{hours}</span>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* Form */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <EnquiryForm type="contact" title="Send Us a Message" />
        </div>
      </div>
    </div>
  );
}
