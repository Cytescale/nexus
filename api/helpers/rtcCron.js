const axios =                       require('axios').default;
const CronJob =                     require('cron').CronJob;
const admin =                       require("firebase-admin");
const FirebaseHelper =              require("./firebaseHelper");


const key = '9f2685c8381b4d699f42e921789527e9'
const secret = '3c8cae61e7204907b1b732e15b547a97'
const EncodeData = Buffer.from(`${key}:${secret}`, 'utf8').toString('base64'); 

class rtcCron{

     JOB = new CronJob('* * * * * *',()=>{
          this.getChannelStats();
     },this.onComplete);

     logger = null
     dbclusterhelper = null;
      rtcPass = 0;
      rtcSuccPass = 0;
      rtcFailurePass = 0;
      MAX_COUNT  = 86400;
      SPACES_NAMES = [];
      CURR_SPACE_IND = 0;

     constructor(logger,dbclusterhelper){
               this.dbclusterhelper = dbclusterhelper;
               this.logger = logger;
               this.upadateSpaceArry = this.upadateSpaceArry.bind(this);
     }

     async setSpaceIdsArray(){
          let tmpArry = [];
          let tempData  =  await this.dbclusterhelper.getRawSpaceFeedData()
          tempData.forEach(e => {
               tmpArry.push(e.agora_channel_name);
          });
          this.SPACES_NAMES = tmpArry;
     }

     async getChannelStats(){
          if(this.SPACES_NAMES.length){
               const tmpServePass  = this.rtcPass;
               const tmpUpdateId = this.CURR_SPACE_IND;
               const database = admin.database();
               new Promise((resolve, reject) => {
                    setTimeout(() => {
                         axios.get(`https://api.agora.io/dev/v1/channel/user/d95380ef73954640840d0b042d9e128d/${this.SPACES_NAMES[tmpUpdateId]}`,{
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Basic ${EncodeData}` 
                              },
                             }).then((res)=>{resolve(res);}).catch((e)=>{reject(e);});
                    }, 300);
                  }).then((res)=>{
                         if(res.data.data.channel_exist){
                         let count = res.data.data.broadcasters.length + res.data.data.audience.length;
                         var spaceRef = database.ref('user_space_det').child(this.SPACES_NAMES[tmpUpdateId]).update({
                          listner:count,
                          broadcaster:res.data.data.broadcasters
                         });
                         this.dbclusterhelper.updateSpaceDatabyCron(this.SPACES_NAMES[tmpUpdateId],count,res.data.data.broadcasters)
                       }
                       else{
                         var spaceRef = database.ref('user_space_det').child(this.SPACES_NAMES[tmpUpdateId]).update({
                              listner:0,
                              broadcaster:[null]
                             });
                             this.dbclusterhelper.updateSpaceDatabyCron(this.SPACES_NAMES[tmpUpdateId],0,[])
                          //console.log(0);
                       }
                       this.rtcSuccPass++;
                  }).catch((e)=>{
                       console.log(e);
                       this.rtcFailurePass++;
                  });
               if(this.SPACES_NAMES.length){this.CURR_SPACE_IND = ((this.CURR_SPACE_IND + 1 )%this.SPACES_NAMES.length);}
               if(this.CURR_SPACE_IND>=this.SPACES_NAMES.length){this.CURR_SPACE_IND=0;}
               this.rtcPass++;
          }
     }

     async upadateSpaceArry(){
               console.log('Update cron space data array ');
             this.setSpaceIdsArray();
     }

     async intiCronJob(){
          this.dbclusterhelper.watchSpaceData(this.upadateSpaceArry);
          await this.setSpaceIdsArray();
          try{
               this.JOB.start();
               console.log('CRON job started successfully');
               this.JOB.addCallback(()=>{
                    if(this.rtcPass>=this.MAX_COUNT){
                         this.JOB.stop();
                         console.log("Server loop ended");
                    }
               })
          }
          catch(e){
               throw(new Error("Error Ouccred at scheduling "+e));
          }
     }

     async onComplete(){
          console.log('cron job completed');
     }

}

module.exports = rtcCron;