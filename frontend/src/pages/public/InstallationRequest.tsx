import { Zap } from 'lucide-react';
import EnquiryForm from '../../components/forms/EnquiryForm';

export default function InstallationRequest() {
  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
          <Zap className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Request Installation Quote</h1>
          <p className="text-sm text-gray-500">Tell us about your property and we'll send you a custom quote.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <EnquiryForm type="installation" />
      </div>
    </div>
  );
}
