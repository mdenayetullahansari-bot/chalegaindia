import { supabase } from '@/lib/supabase';

export type HomeKitchen = {
  id:string; user_id:string; kitchen_name:string; display_name:string; bio:string|null;
  locality:string|null; city:string; service_radius_km:number; cuisine_types:string[];
  women_led:boolean; fssai_status:string; fssai_number:string|null; hygiene_status:string;
  status:string; accepting_orders:boolean; min_order_amount:number;
};

export type HomeKitchenItem = {
  id:string; kitchen_id:string; user_id:string; title:string; description:string|null;
  emoji:string; category:string; price:number; unit:string; quantity_available:number;
  prep_time_minutes:number; order_mode:string; availability_note:string|null; status:string;
};

export async function getMyHomeKitchen():Promise<HomeKitchen|null>{
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return null;
  const {data,error}=await supabase.from('chalega_home_kitchens').select('*').eq('user_id',user.id).maybeSingle();
  if(error) throw error;
  return data as HomeKitchen|null;
}
export async function saveHomeKitchen(input:Partial<HomeKitchen>){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) throw new Error('Please sign in first.');
  const {data,error}=await supabase.from('chalega_home_kitchens').upsert({
    user_id:user.id,kitchen_name:input.kitchen_name,display_name:input.display_name,
    bio:input.bio||null,locality:input.locality||null,city:'Kolkata',
    service_radius_km:input.service_radius_km||3,cuisine_types:input.cuisine_types||[],
    women_led:!!input.women_led,fssai_status:input.fssai_status||'unverified',
    fssai_number:input.fssai_number||null,hygiene_status:'pending',
    status:'pending',accepting_orders:false,min_order_amount:input.min_order_amount||0,
  },{onConflict:'user_id'}).select('*').single();
  if(error) throw error;
  return data as HomeKitchen;
}
export async function getMyHomeKitchenItems(kitchenId:string){
  const {data,error}=await supabase.from('chalega_home_kitchen_items').select('*').eq('kitchen_id',kitchenId).order('created_at',{ascending:false});
  if(error) throw error; return (data||[]) as HomeKitchenItem[];
}
export async function addHomeKitchenItem(kitchenId:string,input:{title:string;description?:string;emoji?:string;category?:string;price:number;unit?:string;quantity_available:number;prep_time_minutes?:number;order_mode?:string;availability_note?:string}){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) throw new Error('Please sign in first.');
  const {data,error}=await supabase.from('chalega_home_kitchen_items').insert({
    kitchen_id:kitchenId,user_id:user.id,title:input.title.trim(),description:input.description?.trim()||null,
    emoji:input.emoji||'🍛',category:input.category||'Home Food',price:input.price,unit:input.unit||'plate',
    quantity_available:input.quantity_available,prep_time_minutes:input.prep_time_minutes||45,
    order_mode:input.order_mode||'same_day',availability_note:input.availability_note?.trim()||null,status:'pending',
  }).select('*').single();
  if(error) throw error; return data as HomeKitchenItem;
}
export async function getApprovedKitchens(){
  const {data,error}=await supabase.from('chalega_home_kitchens').select('*').eq('status','approved').eq('accepting_orders',true).order('created_at',{ascending:false});
  if(error) throw error; return (data||[]) as HomeKitchen[];
}
export async function getApprovedKitchenItems(kitchenId:string){
  const {data,error}=await supabase.from('chalega_home_kitchen_items').select('*').eq('kitchen_id',kitchenId).eq('status','approved').gt('quantity_available',0).order('created_at',{ascending:false});
  if(error) throw error; return (data||[]) as HomeKitchenItem[];
}
export function kitchenOrderId(){return 'CI-HK-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-9)+String(Math.floor(Math.random()*90+10));}


export async function getMyHomeKitchenOrders(kitchenId:string){
  const {data,error}=await supabase.from('chalega_home_kitchen_orders').select('order_id,item_id,quantity,unit_price,total,customer_name,customer_phone,delivery_address,delivery_area,status,payment_method,payment_status,created_at').eq('kitchen_id',kitchenId).order('created_at',{ascending:false});
  if(error) throw error; return data||[];
}
export async function updateMyHomeKitchenOrderStatus(orderId:string,status:'accepted'|'preparing'|'ready'|'cancelled'){
  const {data,error}=await supabase.rpc('update_my_home_kitchen_order_status',{p_order_id:orderId,p_status:status});
  if(error) throw error; return data;
}


export async function getMyCustomerHomeKitchenOrders(){
  const {data,error}=await supabase.from('chalega_home_kitchen_orders').select('order_id,kitchen_id,item_id,quantity,unit_price,food_total,platform_fee,delivery_fee,total,status,payment_method,payment_status,delivery_area,created_at').order('created_at',{ascending:false});
  if(error) throw error; return data||[];
}

export async function getHomeKitchenPricing(kitchenId:string){
  const {data,error}=await supabase.rpc('get_chalega_home_kitchen_pricing',{p_kitchen_id:kitchenId});
  if(error) throw error;
  const row=data?.[0]||{fee_rate:0,completed_orders:0};
  return {feeRate:Number(row.fee_rate)||0,completedOrders:Number(row.completed_orders)||0};
}
