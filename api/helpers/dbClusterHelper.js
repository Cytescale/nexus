'use strict'
const {RtcTokenBuilder, 
     RtcRole} =                        require('agora-access-token');
const ObjectId =                       require('mongodb').ObjectId; 
const randomstring =                   require("randomstring");
const nexusResponse =                  require("../../utils/resonseComposite");
const { uniqueNamesGenerator, adjectives, colors, animals,starWars } = require('unique-names-generator');


const appID = 'd95380ef73954640840d0b042d9e128d';
const appCertificate = '9be93592e761407daa9e7bb45c2d39d6';
const role = RtcRole.PUBLISHER;
const expirationTimeInSeconds = 2592000;
const currentTimestamp = Math.floor(Date.now() / 1000)
const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds


module.exports = class DbClusterHelper{
     static client = null;
     changeStream  =null;
     logger = null;
     
     constructor(client,logger){
       DbClusterHelper.client = client;
       this.logger = logger;
     }
     getClient(){return DbClusterHelper.client;}
   
     async ifClusterConfigPresent(got_uid){
          let errCode = 0;
          let helperReponse = null;
          try{
                    if(got_uid){
                         const collection = this.getClient().db('central_db').collection("cluster_config_collec").find({'creator_id':got_uid}); 
                         let data = await collection.toArray();
                         if(data.length==1){helperReponse = new nexusResponse(errCode,false,null,{present:true,cluster_id:data[0]._id},{funcName:'ifClusterConfigPresent',logMess:'data extraction sucess'});}
                         else if(data.length>0){
                              errCode = 12;
                              throw new Error('Multiple Cluster Config found');}
                         else{errCode = 11;
                              throw new Error('No data');}
                    }else{throw new Error('No uid');}
          }
          catch(e){helperReponse = new nexusResponse(errCode,true,e.message,null,{funcName:'ifClusterConfigPresent',logMess:'data extraction failure'});}
          return helperReponse;
     }  
     async makeClusterConfig(got_uid){
          let got_data={
               creator_id:got_uid,
               design_temp_id:0,
               ban_bool:false,
               deleted_bool:false,
               active_bool:true,
               dest_as_uname_bool:true,
               profile_card_bool:true,
               footer_card_bool:true,
               link_ids:[]
          }
          let helperReponse = null;
          try{  
               if(this.getClient()){
                    if(got_uid && got_data){
                    got_data.creation_timestamp  = Date.now();
                    got_data.update_timestamp  = Date.now();
                     const collection = this.getClient().db('central_db').collection("cluster_config_collec"); 
                     let result = await collection.insertOne(got_data);
                     if(result.insertedCount==1){
                         helperReponse = new nexusResponse(0,false,null,{cluster_created:true,cluster_insert_id:result.insertedId},{funcName:'makeClusterConfig',logMess:'data make success'});
                         let userDataResp = await this.updateUserInfo(got_uid,{"cluster_config_id":result.insertedId});
                         if(userDataResp.errBool){throw new Error(userDataResp.errMess);}
                     }
                    else{throw new Error('data insert failure');}
                    }else{throw new Error('Missing uid|data')}
                    }else{throw new Error('No client')}
          }
          catch(e){
                    helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'makeClusterConfig',logMess:'data make failure'});
          }
          return helperReponse;
     }


     async buildClusterLinkHandler(got_uid,cluster_id){
          let helperReponse = null;
          try{
               await this.buildClusterLinkArray(got_uid,cluster_id).then(()=>{
               helperReponse =  new nexusResponse(0,false,null,{build_link_array_bool:true},{funcName:'buildClusterLinkHandler',logMess:'data updation success'});
               })
          }
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'buildClusterLinkHandler',logMess:'data updation failure'});
          }
          return helperReponse;
     }

     async buildClusterLinkArray(got_uid,cluster_id){
          
          let clus_id = null;
          if(!cluster_id){
               let urs = await this.getUserDatabyUid(got_uid);
               clus_id = urs.responseData.cluster_config_id;
          }else{
               clus_id = cluster_id
          }

          let lstDataRes = await this.getClusterConfigbyId(clus_id)
          let oldLnkList = lstDataRes.responseData.link_ids;  
          let lnkNotPreArray = [];
          let deleteLinkArry = []; 
          let linkData = await this.getLinksData(got_uid);
          const collection = this.getClient().db('central_db').collection("link_collec").find({'creator_id':got_uid,"deleted_bool":true}); 
          let deleted_link_data = await collection.toArray();
          if(!linkData.errBool){
               for(let z in deleted_link_data){
                    for(let i in oldLnkList){ 
                         if(oldLnkList[i] == ObjectId(deleted_link_data[z]._id).toString()){
                              console.log('in');
                              deleteLinkArry.push(oldLnkList[i]);
                              break;
                         }    
                    }
               }
               for(let j in linkData.responseData) {   
                    let f=false;
                    for( let i in oldLnkList ){
                              if(oldLnkList[i] == ObjectId(linkData.responseData[j]._id).toString()){
                                   f=true;
                                   break;
                              }
                    }
                    if(!f){lnkNotPreArray.push(ObjectId(linkData.responseData[j]._id).toString())}
               }
               oldLnkList = oldLnkList.filter(x => !deleteLinkArry.includes(x) );
               let ur = await this.updateClusterConfig(got_uid,clus_id,{link_ids:oldLnkList.concat(lnkNotPreArray)})
               if(ur.errBool){throw new Error(ur.errMess)}
          }else{throw new Error(linkData.errMess);}
     }

     async getClusterConfigbyId(id){
          let helperReponse = null;
          try{
                    if(id){
                         const lnkCollec = this.getClient().db('central_db').collection("cluster_config_collec").find({'_id':ObjectId(id)}); 
                         let data = await lnkCollec.toArray();
                         if(data.length==1)
                         {
                              helperReponse = new nexusResponse(0,false,null,data[0],{funcName:'getClusterConfigbyId',logMess:'data extraction sucess'});
                         }
                         else if(data.length > 1){throw new Error('Multiple Config file found')}
                         else{throw new Error('No data');}
                    }
                    else{throw new Error('No uid');}
          }
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'getClusterConfigbyId',logMess:'data extraction failure'});
          }
          return helperReponse;
     }

     async getClusterConfigbyUid(got_uid){
          let helperReponse = null;
          try{
                    if(got_uid){
                         const collection = this.getClient().db('central_db').collection("cluster_config_collec").find({'creator_id':got_uid}); 
                         let data = await collection.toArray();
                         if(data.length==1)
                         {
                              //await this.buildClusterLinkArray(got_uid);
                              helperReponse = new nexusResponse(0,false,null,data[0],{funcName:'getClusterConfigbyUid',logMess:'data extraction sucess'});
                         }
                         else if(data.length > 1){throw new Error('Multiple Config file found')}
                         else{throw new Error('No data');}
                    }
                    else{throw new Error('No uid');}
          }
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'getClusterConfigbyUid',logMess:'data extraction failure'});
          }
          return helperReponse;
     }
     async updateClusterConfig(got_uid,got_cluster_id,got_data){
          let helperReponse = null;
          try{  
            if(got_uid && got_data){
                  got_data.update_timestamp = Date.now();
                  const filter = {_id:ObjectId(got_cluster_id)};
                  const updateDocument = {$set: got_data,};
                  const result = await this.getClient().db('central_db').collection("cluster_config_collec").updateOne(filter,updateDocument); 
                    if(result){
                      helperReponse = new nexusResponse(0,false,null,{editSuccessBool:true},{funcName:'updateClusterConfig',logMess:'data update success'});
                    }else{throw new Error('Data update failure');  }
                }else{throw new Error('No uid | data');}
             }
             catch(e){
                  helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'updateClusterConfig',logMess:'data update failure'});
               }
             return helperReponse;
     } 
     async watchSpaceData(updateSpaceCronData){
          console.log('Watching space data changes');
          const collection = this.getClient().db('central_db').collection("user_space_collec");
          this.changeStream = collection.watch();
          this.changeStream.on("change", next => {
               if(next.operationType == 'update'){
                    if(next.updateDescription.updatedFields.deleted_bool!=undefined || next.updateDescription.updatedFields.ban_bool!=undefined){
                         updateSpaceCronData();
                    }
               }
               if(next.operationType == 'insert'|| next.operationType == 'delete'){
                    updateSpaceCronData();
               }
          });
     }
     async getLinkDataById(id){
          let helperReponse = null;
          try{  
            let foundData  = null;
            if(this.getClient()){
                  const collection = this.getClient().db('central_db').collection("link_collec").find({'_id':ObjectId(id)}); 
                  let data = await collection.toArray();
                    if(data.length==1){
                      foundData = {gotData:data[0]}
                      helperReponse = new nexusResponse(0,false,null,foundData,{funcName:'getLinkDataById',logMess:'data extraction success'});
                    }
                    else if(data.length>0){
                         for(let i = 0 ; i < data.length ; i++){
                              if(data[i].deleted_bool==false){
                                   foundData = {gotData:data[i]}   
                                   break;
                              }
                         }
                         helperReponse = new nexusResponse(0,false,null,foundData,{funcName:'getLinkDataById',logMess:'data extraction success'});
                    }
                    else{throw new Error('No link data found')}
            }else{throw new Error('No client')}
          } 
               catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'getLinkDataById',logMess:'data extraction failure'});
               }
             return helperReponse;
     }
     async getLinkDataByUnique(unique_identifier){
          let helperReponse = null;
          try{  
            let foundData  = null;
            if(this.getClient()){
                  const collection = this.getClient().db('central_db').collection("link_collec").find({'unique_identifier':unique_identifier}); 
                  let data = await collection.toArray();
                    if(data.length==1){
                      foundData = {gotData:data[0]}
                      helperReponse = new nexusResponse(0,false,null,foundData,{funcName:'getLinkDataByUnique',logMess:'data extraction success'});
                    }
                    else if(data.length>0){
                         for(let i = 0 ; i < data.length ; i++){
                              if(data[i].deleted_bool==false){
                                   foundData = {gotData:data[i]}   
                                   break;
                              }
                         }
                         helperReponse = new nexusResponse(0,false,null,foundData,{funcName:'getLinkDataByUnique',logMess:'data extraction success'});
                    }
                    else{throw new Error('No Space data found')}
            }else{throw new Error('No client')}
          } 
               catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'getLinkDataByUnique',logMess:'data extraction failure'});
               }
             return helperReponse;
     }
     async getSpaceDatabySid(got_uid,got_sid){
     let helperReponse = null;
     try{  
       let foundData  = null;
       if(this.getClient()){
         if(got_uid && got_sid){
             const collection = this.getClient().db('central_db').collection("user_space_collec").find({'_id':ObjectId(got_sid)}); 
             let data = await collection.toArray();
               if(data.length==1){
                 foundData = {gotData:data[0]}
                 helperReponse = new nexusResponse(0,false,null,foundData,{funcName:'getSpaceDatabySid',logMess:'data extraction success'});
               }
               else{throw new Error('No Space data found')}
          }
         else{throw new Error('Missing uid|sid')}
       }else{throw new Error('No client')}
     } 
          catch(e){
          helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'getSpaceDatabySid',logMess:'data extraction failure'});
          }
        return helperReponse;
     }
     async getRawSpaceFeedData(){
          const collection = this.getClient().db('central_db').collection("user_space_collec").find(); 
          let data = await collection.toArray();
          let tempFeedData = [];
          if(data.length>0)
          {
               await collection.forEach(e => {
                    if(!e.ban_bool  && !e.deleted_bool){
                         tempFeedData.push(e);
                    }
               });
          }
          return tempFeedData;
     }
     async getSpaceFeedData(got_uid){
          let helperReponse = null;
          try{
                    if(got_uid){
                         const collection = this.getClient().db('central_db').collection("user_space_collec").find(); 
                         let data = await collection.toArray();
                         if(data.length>0)
                         {
                              let tempFeedData = [];
                              await collection.forEach(e => {
                                   if(!e.ban_bool  && !e.deleted_bool){
                                        tempFeedData.push(e);
                                   }
                              });
                              helperReponse = new nexusResponse(0,false,null,tempFeedData,{funcName:'getSpaceFeedData',logMess:'data extraction sucess'});
                         }
                         else{throw new Error('No data');}
                    }
                    else{throw new Error('No uid');}
          }
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'getSpaceFeedData',logMess:'data extraction failure'});
          }
          return helperReponse;
     }
     async makeSpaceData(got_uid,got_data){
          let helperReponse = null;
          try{  
               const channelName = "channel"+randomstring.generate({
               length: 10,
               charset: 'alphabetic'
          });;
         if(this.getClient()){
             if(got_uid && got_data){
                got_data.creation_timestamp  = Date.now();
                     const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName,0,role,privilegeExpiredTs);
                     this.logger.debug(`createSpace: space created with token `+tokenA);
                     got_data.agora_channel_name  = channelName
                     got_data.agora_channel_token = tokenA
                     got_data.agora_channel_exp_time = privilegeExpiredTs
                     const collection = this.getClient().db('central_db').collection("user_space_collec"); 
                     let result = await collection.insertOne(got_data);
                       if(result.insertedCount==1){
                         helperReponse = new nexusResponse(0,false,null,{spaceCreated:true},{funcName:'makeSpaceData',logMess:'data make success with token'+tokenA});
                     }
                    else{throw new Error('data insert failure');}
                    }else{throw new Error('Missing uid|data')}
                    }else{throw new Error('No client')}
          }
          catch(e){
                    helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'makeSpaceData',logMess:'data make failure'});
          }
          return helperReponse;
     }
     
     async makeLinkData(got_uid,got_data){
          let helperReponse = null;
          try{  
               const unique_identifier = randomstring.generate({length: 5,charset: 'alphabetic'});
         if(this.getClient()){
             if(got_uid && got_data){
                    let userInfo = await this.getUserDatabyUid(got_uid);
                    got_data.creation_timestamp  = Date.now();
                    got_data.update_timestamp  = Date.now();
                    got_data.unique_identifier  = unique_identifier;
                    got_data.cluster_config_id = userInfo.responseData.cluster_config_id;

                     const collection = this.getClient().db('central_db').collection("link_collec"); 
                     let result = await collection.insertOne(got_data);
                       if(result.insertedCount==1){
                         helperReponse = new nexusResponse(0,false,null,{linkCreated:true,unique_identifier:unique_identifier},{funcName:'makeLinkData',logMess:'data make success with unique id'+unique_identifier});
                         await this.buildClusterLinkArray(got_uid,userInfo.responseData.cluster_config_id);
                     }
                    else{throw new Error('data insert failure');}
                    }else{throw new Error('Missing uid|data')}
                    }else{throw new Error('No client')}
          }
          catch(e){
                    helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'makeLinkData',logMess:'data make failure'});
          }
          return helperReponse;
     }
     async getLinksData(got_uid){
          let helperReponse = null;
          try{
                    if(got_uid){
                         const collection = this.getClient().db('central_db').collection("link_collec").find({'creator_id':got_uid}); 
                         let data = await collection.toArray();
                         if(data.length>0)
                         {
                              let tempFeedData = [];
                              await collection.forEach(e => {
                                   if(!e.ban_bool  && !e.deleted_bool){
                                        tempFeedData.push(e);
                                   }
                              });
                              helperReponse = new nexusResponse(0,false,null,tempFeedData,{funcName:'getLinksData',logMess:'data extraction sucess'});
                         }
                         else{throw new Error('No data');}
                    }
                    else{throw new Error('No uid');}
          }
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'getLinksData',logMess:'data extraction failure'});
          }
          return helperReponse;
     }
     async updateLinkInfo(got_uid,linkId,got_data){
          let uniKeyChangeBool = false;
          let alloweduniKeyChangeBool = true;
          let helperReponse = null;
          try{  
            if(got_uid && got_data && linkId){
              got_data.update_timestamp = Date.now();
              if(got_data.unique_identifier){
                const od  = await this.getLinkDataByUnique(got_data.unique_identifier);
                const oldData = od.responseData;
                if(oldData){
                   if(oldData.gotData.creator_id==got_uid && oldData.gotData._id == linkId ){
                    alloweduniKeyChangeBool=true;
                   }
                   else if(oldData.gotData.deleted_bool){
                         alloweduniKeyChangeBool=true;
                   }
                   else{alloweduniKeyChangeBool =false
                       throw new Error('Unique id already exist');}
                }
                else{uniKeyChangeBool = true;alloweduniKeyChangeBool=true;}
              }
              if(alloweduniKeyChangeBool){
                  const filter = {_id:ObjectId(linkId)};
                  const updateDocument = {$set: got_data,};
                  const result = await this.getClient().db('central_db').collection("link_collec").updateOne(filter,updateDocument); 
                    if(result){
                      helperReponse = new nexusResponse(0,false,null,{editSuccessBool:true,uniKeyChangeBool:uniKeyChangeBool,deleted_bool:got_data.deleted_bool?got_data.deleted_bool:false},{funcName:'updateLinkInfo',logMess:'data update success'});
                      if(got_data.deleted_bool){await this.buildClusterLinkArray(got_uid)}
                    }else{throw new Error('Data update failure');  }
                  }else{throw new Error('Unique id already exist');}
                }else{throw new Error('No uid | data');}
             }
             catch(e){
                  helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'updateUserInfo',logMess:'data update failure'});
               }
             return helperReponse;
     }
     async updateSpaceDatabyCron(channel_name,listners,broadcasters){
          const filter = { "agora_channel_name":channel_name};
          const updateDocument = {$set: {'listners':listners,'broadcaster':broadcasters}};
          this.getClient().db('central_db').collection("user_space_collec").updateOne(filter,updateDocument);                
     }
     async updateSpaceData(got_uid,got_sid,got_data){
          let helperReponse = null;
          try{  
               if(got_uid && got_data && got_sid){
                    got_data.update_timestamp = Date.now(); 
                    const filter = { "_id":ObjectId(got_sid)};
                    const updateDocument = {$set: got_data,};
                         const result = await this.getClient().db('central_db').collection("user_space_collec").updateOne(filter,updateDocument); 
                         if(result.modifiedCount==1){ helperReponse = new nexusResponse(0,false,null,{editSuccessBool:true},{funcName:'updateSpaceData',logMess:'data update success'});}
                         else{throw new Error('Space update failure');}
               }
               else{throw new Error('No uid|data|sid');}
          }
          catch(e){
            helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'updateSpaceData',logMess:'data update failure'});
          }
          return helperReponse;
     }
     async updateUserInfo(got_uid,got_data){
       let unameChangeBool = false;
       let allowedUnameChangeBool = true;
       let helperReponse = null;
       try{  
         if(got_uid && got_data){
           got_data.update_timestamp = Date.now();
           if(got_data.uname){
             const od  = await this.getUserDatabyUname(got_data.uname);
             const oldData = od.responseData;
             if(oldData){
                if(oldData.uid==got_uid){
                 allowedUnameChangeBool=true;
                }
                else{allowedUnameChangeBool =false
                    throw new Error('Username already exist');}
             }
             else{unameChangeBool = true;allowedUnameChangeBool=true;}
           }
           if(allowedUnameChangeBool){
               const filter = { uid:got_uid };
               const updateDocument = {$set: got_data,};
               const result = await this.getClient().db('central_db').collection("user_info_collec").updateOne(filter,updateDocument); 
                 if(result){
                   helperReponse = new nexusResponse(0,false,null,{editSuccessBool:true,unameChangeBool:unameChangeBool},{funcName:'getUserDatabyUid',logMess:'data update success'});
                 }else{throw new Error('Data update failure');  }
               }else{throw new Error('Username already exist');}
             }else{throw new Error('No uid | data');}
          }
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'updateUserInfo',logMess:'data update failure'});
            }
          return helperReponse;
     }
     async getFollowCount(got_uid){
          let helperReponse = null;
     try{  
       let foundData = null;
       if(this.getClient()){
         if(got_uid){
           const collection = this.getClient().db('central_db').collection("user_relation_collec").find();          
             let temp_foll = 0 ;
             let temp_following= 0;
               await collection.forEach(e => {
                 if(e.from_uid == got_uid){temp_following++;}
                 if(e.to_uid == got_uid){temp_foll++;}
               });
               foundData={
                 followers:temp_foll,
                 following:temp_following
               };
               helperReponse = new nexusResponse(0,false,null,foundData,{funcName:'getFollowCount',logMess:'data extraction success'});
         }
         else{throw new Error('No uid')}
       }
       else{throw new Error('No client')}
     }
     catch(e){
          helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'getFollowCount',logMess:'data extraction failure'});
     }
       return helperReponse;
     }
     async getRelationBool(from_uid,to_uid){
     let helperReponse = null;
       try{  
               if(from_uid && to_uid){
               const collection = this.getClient().db('central_db').collection("user_relation_collec").find({from_uid:from_uid,to_uid:to_uid}); 
               let data = await collection.toArray();
                    if(data.length==1){
                         helperReponse = new nexusResponse(0,false,null,true,{funcName:"getRelationBool",logMess:'data extraction success'});
                    }
                    else{throw new Error('No data');}
               }
               else{throw new Error('Missing data');}
          }
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:"getRelationBool",logMess:'data extraction failure'});
          }
          return helperReponse;
     }
     async makeRelationBool(from_uid,to_uid){
     let helperReponse = null;
     try{  
               let rd = await this.getRelationBool(from_uid,to_uid);
               let alrdyExist = rd.responseData;
               if(!alrdyExist){ 
               const newQuery = {creation_timestamp:Date.now(),from_uid: from_uid,to_uid: to_uid};
               const collection = this.getClient().db('central_db').collection("user_relation_collec"); 
               let result = await collection.insertOne(newQuery);
                    if(result.insertedCount==1){
                    helperReponse = new nexusResponse(0,false,null,{newRelation:true},{funcName:"makeRelationBool",logMess:'data creation success'});
                    }else{throw new Error('Relation creation failure');}
               
               }else{throw new Error('Relation already exist');}
          }
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:"makeRelationBool",logMess:'data make failure'});
          }
          return helperReponse;
     }
     async delRelation(from_uid,to_uid){
          let helperReponse = null;
          try{
               let rd = await this.getRelationBool(from_uid,to_uid);
               let alrdyExist = rd.responseData;
               if(alrdyExist){
                    const result = await this.getClient().db('central_db').collection("user_relation_collec").deleteOne({from_uid:from_uid,to_uid:to_uid}); 
                    if(result.deletedCount==1){
                    helperReponse = new nexusResponse(0,false,null,{alreadyRelation:true,deleteBool:true},{funcName:"delRelation",logMess:'data delete success'});
                    }else{throw new Error('data deletion failure')}
               
               }else{throw new Error('no such relation')} 
          }
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:"delRelation",logMess:'data delete failure'});
          }
          return helperReponse;
     }
     async getUserDatabyJid(got_jid){
          let helperReponse = null;
          try{  
          if(this.getClient()){
               if(got_jid){     
                    const collection = this.getClient().db('central_db').collection("user_info_collec").find({'joining_id':got_jid}); 
                         let data = await collection.toArray();
                         if(data.length==1){helperReponse = new nexusResponse(0,false,null, data[0],{funcName:'getUserDatabyUid',logMess:'data extraction success'});}
                         else{throw new Error('No data')}
               }   
                    else{throw new Error('No Uid')}
          }
         else{throw new Error('No Client');}
         }
           catch(e){
               this.logger.debug(`getUserData: data extraction failure`+e);  
               helperReponse = new nexusResponse(1,true,e.message,null);
          }
          return helperReponse;
     }
     async getUserDatabyUname(got_uname){
          let helperReponse = null;
          try{  
          if(this.getClient()){
               if(got_uname){     
                    const collection = this.getClient().db('central_db').collection("user_info_collec").find({'uname':got_uname}); 
                         let data = await collection.toArray();
                         if(data.length==1){helperReponse = new nexusResponse(0,false,null, data[0],{funcName:'getUserDatabyUname',logMess:'data extraction success'});}
                         else{throw new Error('No data')}
               }   
                    else{throw new Error('No uname')}
          }
         else{throw new Error('No Client');}
         }
          catch(e){  
               helperReponse = new nexusResponse(1,true,e.message,null);
          }
          return helperReponse;
     }
     async getUserDatabyUid(got_uid){
          let helperReponse = null;
          try{  
          if(this.getClient()){
               if(got_uid){     
                         const collection = this.getClient().db('central_db').collection("user_info_collec").find({'uid':got_uid}); 
                         let data = await collection.toArray();
                         if(data.length==1){helperReponse = new nexusResponse(0,false,null, data[0],{funcName:'getUserDatabyUid',logMess:'data extraction success'});}
                         else if(data.length > 1){throw new Error('Mulitple user config')}
                         else{throw new Error('No data')}
               }   
                    else{throw new Error('No Uid')}
          }
         else{throw new Error('No Client');}
         }
           catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'getUserDatabyUid',logMess:'data extraction failure'});
          }
          return helperReponse;
     }
     async makeUserData(got_uid,got_eml,login_method,userToken){
          const api_key = randomstring.generate({length:32,charset: 'alphabetic'});
          const randomName = uniqueNamesGenerator({ dictionaries: [adjectives,starWars] ,style: 'lowerCase'}); 
          let got_data={
               uid:got_uid,
               email:got_eml,
               login_method:login_method,
               dname:'null',
               admin_bool:false,
               cname:'null',
               init_bool:false,
               uname:randomName,
               pro_bool:false,
               deleted_bool:false,
               bio:'null',
               api_key:api_key,
               pvt_bool:false,
               pro_photo_url:"https://ik.imagekit.io/cyte/sakura/Men-Profile-Image_8c3Wj4y8S.png?updatedAt=1626883535964",
               acc_verified:false,    
          }
          let helperReponse = null;
          try{  
               if(this.getClient()){
                    if(got_uid && got_data){
                    got_data.creation_timestamp  = Date.now();
                    got_data.update_timestamp  = Date.now();
                     const collection = this.getClient().db('central_db').collection("user_info_collec"); 
                     let result = await collection.insertOne(got_data);
                     if(result.insertedCount==1){
                         await this.makeClusterConfig(got_uid);
                         helperReponse = new nexusResponse(0,false,null,
                         {uid:got_uid,userToken:userToken,account_created_bool:true},
                         {funcName:'makeUserData',logMess:'data make success'});
                     }
                    else{throw new Error('data insert failure');}
                    }else{throw new Error('Missing uid|data')}
                    }else{throw new Error('No client')}
          }
          catch(e){
                    helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'makeUserData',logMess:'data make failure'});
          }
          return helperReponse;
     }

     async makeAnalyticData(lnk_id,link_type_id,base_url,analytic_type_id,visitor_ip_addr,creator_id,ua_data){
// link_type_id  [ 1 deeplinked 2 non deeplinked 3 cluster link 4 custom page]
// base_url   console.dir(req.baseUrl) // '/ad
// analytic_type_id  [ 1 visit ]
          let got_data={
               link_type_id:link_type_id,
               link_id:lnk_id,
               base_url:base_url,
               analytic_type_id:analytic_type_id,
               ua_data:ua_data,
               creator_id :creator_id,
               visitor_ip_addr :visitor_ip_addr,
          }
          let helperReponse = null;
          try{  
               if(this.getClient()){
                    if( got_data){
                    got_data.creation_timestamp  = Date.now();
                     const collection = this.getClient().db('central_db').collection("analyitcs_pool"); 
                     let result = await collection.insertOne(got_data);
                     if(result.insertedCount==1){
                         helperReponse = new nexusResponse(0,false,null,
                         {data_insert:true},
                         {funcName:'makeAnalyticData',logMess:'data make success'});
                     }
                    else{throw new Error('data insert failure');}
                    }else{throw new Error('Missing uid|data')}
                    }else{throw new Error('No client')}
          }
          catch(e){
                    helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'makeAnalyticData',logMess:'data make failure'});
          }
          return helperReponse;
     }
     
   }

