import { supabase } from '@/lib/supabase';

export type PartnerApplicationInput = {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  cityArea: string;
  partnershipType:
    | 'sponsor_missions'
    | 'sponsor_challenges'
    | 'offer_rewards'
    | 'health_wellness'
    | 'community_partner';
  message: string;
};

export async function submitMyPartnerApplication(
  input: PartnerApplicationInput
): Promise<string> {
  const businessName = input.businessName.trim();
  const contactName = input.contactName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  const cityArea = input.cityArea.trim();
  const message = input.message.trim();

  if (!businessName) {
    throw new Error('Business name is required.');
  }

  if (!contactName) {
    throw new Error('Contact name is required.');
  }

  if (!phone) {
    throw new Error('Phone number is required.');
  }

  if (!email) {
    throw new Error('Email is required.');
  }

  const { data, error } = await supabase.rpc(
    'submit_my_partner_application',
    {
      p_business_name: businessName,
      p_contact_name: contactName,
      p_phone: phone,
      p_email: email,
      p_city_area: cityArea || null,
      p_partnership_type: input.partnershipType,
      p_message: message || null,
    }
  );

  if (error) {
    throw error;
  }

  if (
    typeof data !== 'string' ||
    data.trim().length === 0
  ) {
    throw new Error(
      'Partner application could not be submitted.'
    );
  }

  return data;
}
