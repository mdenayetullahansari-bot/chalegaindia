import { supabase } from '@/lib/supabase';

export type AdminCommunityGrower={id:string;user_id:string;display_name:string;bio:string|null;space_type:string;locality:string|null;city:string;status:string;plants_grown:number;plants_sold:number;created_at:string;listing_count:number;pending_listing_count:number;approved_listing_count:number};
export type AdminCommunityListing={id:string;grower_id:string;title:string;emoji:string;category:string;unit:string;price:number;quantity_available:number;grower_display_name:string;locality:string|null;notes:string|null;fulfillment:string;status:string;created_at:string};
export type AdminCommunityEarning={id:string;order_id:string;grower_id:string;listing_id:string;quantity:number;gross_sale:number;status:string;paid_at:string|null;created_at:string;grower_display_name:string|null;listing_title:string|null};

export async function getAdminCommunityGrowers(){const {data,error}=await supabase.rpc('get_admin_community_growers');if(error)throw error;return (data||[]) as AdminCommunityGrower[];}
export async function setAdminCommunityGrowerStatus(id:string,status:'pending'|'active'|'paused'|'rejected'){const {data,error}=await supabase.rpc('set_admin_community_grower_status',{p_grower_id:id,p_status:status});if(error)throw error;return data;}
export async function getAdminCommunityListings(){const {data,error}=await supabase.rpc('get_admin_community_listings');if(error)throw error;return (data||[]) as AdminCommunityListing[];}
export async function setAdminCommunityListingStatus(id:string,status:'pending'|'approved'|'paused'|'rejected'){const {data,error}=await supabase.rpc('set_admin_community_listing_status',{p_listing_id:id,p_status:status});if(error)throw error;return data;}
export async function getAdminCommunityEarnings(){const {data,error}=await supabase.rpc('get_admin_community_earnings');if(error)throw error;return (data||[]) as AdminCommunityEarning[];}
export async function markAdminCommunityEarningPaid(id:string){const {data,error}=await supabase.rpc('set_admin_community_grower_earning_paid',{p_earning_id:id});if(error)throw error;return data;}
