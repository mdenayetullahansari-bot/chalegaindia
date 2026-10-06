import React,{useCallback,useEffect,useState}from'react';
import{ActivityIndicator,Alert,RefreshControl,SafeAreaView,ScrollView,StyleSheet,Text,TouchableOpacity,View}from'react-native';
import{useRouter}from'expo-router';
import Ionicons from'@expo/vector-icons/Ionicons';
import{BRAND}from'@/lib/brand';
import{supabase}from'@/lib/supabase';
import{isChalegaAdmin}from'@/services/adminService';

type Competition={id:string;name:string;status:string;starts_at:string;ends_at:string;first_place_points:number;second_place_points:number;third_place_points:number;rules_version:string|null};
type WardRow={rank:number;ward_id:number;active_participants:number;verified_steps:number;average_verified_steps:number;activity_score:number};
type Distribution={points_amount:number;status:string;issued_at:string|null};

export default function AdminCompetitions(){
 const router=useRouter();const[admin,setAdmin]=useState(false);const[loading,setLoading]=useState(true);const[working,setWorking]=useState('');const[c,setC]=useState<Competition|null>(null);const[wards,setWards]=useState<WardRow[]>([]);const[dists,setDists]=useState<Distribution[]>([]);
 const load=useCallback(async()=>{try{const ok=await isChalegaAdmin();setAdmin(ok);if(!ok)return;
  const{data,error}=await supabase.from('competitions').select('id,name,status,starts_at,ends_at,first_place_points,second_place_points,third_place_points,rules_version').eq('rules_version','ward-championship-v1').order('starts_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;
  setC(data as Competition|null);if(!data){setWards([]);setDists([]);return;}
  const[w,e1]=await supabase.rpc('get_ward_competition_leaderboard',{p_competition_id:data.id});if(e1)throw e1;setWards(Array.isArray(w)?w as WardRow[]:[]);
  const{data:ds,error:e2}=await supabase.from('ward_competition_prize_distributions').select('points_amount,status,issued_at').eq('competition_id',data.id);if(!e2)setDists(Array.isArray(ds)?ds as Distribution[]:[]);
 }catch(e){console.log('[ADMIN COMPETITIONS]',e);Alert.alert('Could not load competition','Please try again.')}finally{setLoading(false)}},[]);
 useEffect(()=>{load()},[load]);
 const action=async(a:string)=>{if(!c)return;try{setWorking(a);const{data,error}=await supabase.rpc('admin_manage_competition',{p_competition_id:c.id,p_action:a,p_rank:null});if(error)throw error;Alert.alert('Competition updated','The protected admin action completed.');await load()}catch(e){console.log('[ADMIN COMPETITIONS ACTION]',e);Alert.alert('Action failed','The protected admin action could not be completed.')}finally{setWorking('')}};
 if(loading)return <SafeAreaView style={s.loading}><ActivityIndicator size="large" color={BRAND.teal}/><Text style={s.muted}>Loading competition control...</Text></SafeAreaView>;
 if(!admin)return <SafeAreaView style={s.c}><View style={s.denied}><Ionicons name="lock-closed" size={30} color={BRAND.teal}/><Text style={s.title}>Admin access required</Text></View></SafeAreaView>;
 return <SafeAreaView style={s.c}><ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load}/>} contentContainerStyle={s.content}>
  <View style={s.top}><TouchableOpacity style={s.icon} onPress={()=>router.back()}><Ionicons name="chevron-back" size={23} color={BRAND.midnight}/></TouchableOpacity><Text style={s.topTitle}>COMPETITION CONTROL</Text><View style={s.icon}><Ionicons name="trophy" size={17} color={BRAND.teal}/></View></View>
  <Text style={s.eye}>ADMINISTRATION</Text><Text style={s.title}>Ward Championship</Text><Text style={s.sub}>Finalize results and distribute prizes through the protected competition workflow.</Text>
  {!c?<View style={s.card}><Text style={s.cardTitle}>No Ward Championship found</Text></View>:<>
   <View style={s.hero}><Text style={s.heroEye}>CURRENT COMPETITION</Text><Text style={s.heroTitle}>{c.name}</Text><View style={s.row}><Text style={s.label}>STATUS</Text><Text style={s.value}>{c.status.toUpperCase()}</Text></View><View style={s.row}><Text style={s.label}>PRIZES</Text><Text style={s.value}>{c.first_place_points} / {c.second_place_points} / {c.third_place_points}</Text></View></View>
   <Text style={s.section}>FINALIZATION</Text>
   <Button title="Prepare for review" icon="analytics-outline" disabled={!!working||c.status!=='active'} onPress={()=>action('prepare')} busy={working==='prepare'}/>
   <Button title="Confirm Ward winners" icon="trophy-outline" disabled={!!working||c.status!=='under_review'} onPress={()=>action('confirm')} busy={working==='confirm'}/>
   <Button title="Distribute Ward prizes" icon="gift-outline" disabled={!!working||c.status!=='confirmed'} onPress={()=>action('distribute')} busy={working==='distribute'}/>
   <Text style={s.note}>These controls call protected admin-only database functions. Residents cannot execute them.</Text>
   <Text style={s.section}>WARD PODIUM</Text>
   {wards.slice(0,3).map(r=><View key={r.ward_id} style={s.list}><View style={s.badge}><Text style={s.badgeText}>{r.rank}</Text></View><View style={s.listText}><Text style={s.listTitle}>Ward {r.ward_id}</Text><Text style={s.listSub}>{r.active_participants} participants • {Number(r.verified_steps).toLocaleString('en-IN')} verified steps</Text></View></View>)}
   {wards.length===0?<Text style={s.empty}>No calculated ward results yet.</Text>:null}
   <Text style={s.section}>PRIZE DISTRIBUTION</Text>
   <Text style={s.empty}>{dists.length?dists.filter(x=>x.status==='issued').length+' issued • '+dists.filter(x=>x.status!=='issued').length+' pending':'No resident distributions created yet.'}</Text>
  </>}
 </ScrollView></SafeAreaView>;
}
function Button({title,icon,disabled,onPress,busy}:{title:string;icon:any;disabled:boolean;onPress:()=>void;busy:boolean}){return <TouchableOpacity disabled={disabled} onPress={onPress} style={[s.button,disabled&&s.buttonDisabled]}><Ionicons name={busy?'hourglass-outline':icon} size={20} color={disabled?'#9AA6B2':BRAND.white}/><Text style={[s.buttonText,disabled&&s.buttonTextDisabled]}>{busy?'Working...':title}</Text></TouchableOpacity>}
const s=StyleSheet.create({c:{flex:1,backgroundColor:BRAND.cream},loading:{flex:1,backgroundColor:BRAND.cream,alignItems:'center',justifyContent:'center'},muted:{marginTop:12,color:BRAND.muted,fontSize:12},content:{padding:20,paddingBottom:60},top:{height:50,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:25},icon:{width:42,height:42,borderRadius:14,backgroundColor:BRAND.white,alignItems:'center',justifyContent:'center'},topTitle:{fontSize:11,fontWeight:'900',letterSpacing:1.6,color:BRAND.midnight},eye:{fontSize:10,fontWeight:'900',letterSpacing:1.8,color:BRAND.teal},title:{fontSize:29,fontWeight:'900',color:BRAND.midnight,marginTop:6},sub:{fontSize:12,lineHeight:18,color:BRAND.muted,marginTop:6,marginBottom:20},hero:{backgroundColor:BRAND.midnight,borderRadius:20,padding:18,marginBottom:22},heroEye:{fontSize:9,fontWeight:'900',letterSpacing:1.3,color:'#F7C56B'},heroTitle:{fontSize:20,fontWeight:'900',color:BRAND.white,marginTop:5},row:{flexDirection:'row',justifyContent:'space-between',marginTop:14,paddingTop:10,borderTopWidth:1,borderTopColor:'#29435A'},label:{fontSize:9,fontWeight:'900',letterSpacing:.8,color:'#AFC4D6'},value:{fontSize:11,fontWeight:'900',color:BRAND.white},section:{fontSize:12,fontWeight:'900',letterSpacing:1,color:BRAND.midnight,marginBottom:10,marginTop:8},button:{backgroundColor:BRAND.teal,borderRadius:16,minHeight:52,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'center',marginBottom:10},buttonDisabled:{backgroundColor:'#E4E9ED'},buttonText:{color:BRAND.white,fontSize:11,fontWeight:'900',letterSpacing:.6,marginLeft:8},buttonTextDisabled:{color:'#9AA6B2'},note:{fontSize:10,lineHeight:15,color:BRAND.muted,marginTop:3,marginBottom:20},list:{backgroundColor:BRAND.white,borderRadius:16,padding:13,flexDirection:'row',alignItems:'center',marginBottom:8},badge:{width:34,height:34,borderRadius:11,backgroundColor:'#E8FBF7',alignItems:'center',justifyContent:'center'},badgeText:{fontSize:14,fontWeight:'900',color:BRAND.teal},listText:{flex:1,marginLeft:10},listTitle:{fontSize:13,fontWeight:'900',color:BRAND.midnight},listSub:{fontSize:10,color:BRAND.muted,marginTop:3},empty:{fontSize:11,color:BRAND.muted,marginBottom:18},card:{backgroundColor:BRAND.white,borderRadius:18,padding:18},cardTitle:{fontSize:14,fontWeight:'900',color:BRAND.midnight},denied:{flex:1,alignItems:'center',justifyContent:'center'}});
