// Matches backend/src/models/analytics-event.model.ts exactly

export type EventType =
  | 'product_view'
  | 'product_enquiry'
  | 'page_view'
  | 'search'
  | 'whatsapp_click'
  | 'technical_support_click'
  | 'video_call_request'
  | 'site_visit_request'
  | 'installation_request'
  | 'contact_form_submitted'
  | 'youtube_video_clicked';
