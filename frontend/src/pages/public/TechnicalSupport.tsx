import { Wrench } from 'lucide-react';
import EnquiryForm from '../../components/forms/EnquiryForm';

export default function TechnicalSupport() {
  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Wrench className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Technical Support</h1>
          <p className="text-sm text-gray-500">Our engineers will diagnose and resolve your issue.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <EnquiryForm type="technical_support" />
      </div>
    </div>
  );
}
