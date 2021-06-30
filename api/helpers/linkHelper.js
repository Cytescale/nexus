const randomstring =                   require("randomstring");
const nexusResponse =                  require("../../utils/resonseComposite");
const URLParser =                       require('url-parse')
const queryString = require('query-string');


//https://youtu.be/N9PMmDPO-8U
//https://m.youtube.com/watch?v=Cbnjj4ADdNw

/*        
               PLATFORM INDEX
               
               YOUTUBE 1



*/

const VALID_YOUTUBE_PATHNAMES=[
     'c',
     'watch',
     'user',
     'channel'
]

const VALID_YOUTUBE_DOMAINS=[
     'youtu.be',
     'youtube.com',
     'www.youtube.com',
     'm.youtube.com',
     'youtube.googleapis.com',
     'youtubei.googleapis.com',
]

const VALID_DOMAINS = [
     VALID_YOUTUBE_DOMAINS,
]

module.exports = class LinkHelper{
     logger = null;
     constructor(logger){
       this.logger = logger;
     }


     async visitYoutubeLinkParser(visit_parse_url){
          const path  = visit_parse_url.pathname.split("/")[1]
          let identified_domain_id = null;
          let actionType = null;
          let actionId = null;
          for(let j = 0 ; j < VALID_YOUTUBE_DOMAINS.length; j++){
               if(VALID_YOUTUBE_DOMAINS[j]==visit_parse_url.hostname){
                    identified_domain_id = j;
                    break;
               }
          }
    
          switch(identified_domain_id){
               case 0:{
                    actionType='watch';
                    actionId=path;
                    break;
               }     
               case 1:
               case 2:
               case 3:{
                    const query = queryString.parse(visit_parse_url.query)
                    let fi = null;
                    for(let i = 0 ;i < VALID_YOUTUBE_PATHNAMES.length;i++){
                         if(path==VALID_YOUTUBE_PATHNAMES[i]){fi=i;}
                    }   
                    switch(fi){
                         case 0:
                         case 2:
                         case 3:{
                              actionType=visit_parse_url.pathname.split("/")[1];
                              actionId=visit_parse_url.pathname.split("/")[2];
                              break;
                         }
                         case 1:{
                              actionType='watch';
                              actionId=query.v;
                              break;
                         }
                         default:{

                              break;
                         }      
                    }
                  break;
               }
               default:{
               
                    break;
               }
          }
          return{
               actionType:actionType,
               actionId:actionId
          }
          
     }

/*

intent://www.youtube.com/channel/UC20LoHy2mX0LQODrkUalxVQ#Intent;package=com.google.android.youtube;scheme=https;end
vnd.youtube://www.youtube.com/channel/UC20LoHy2mX0LQODrkUalxVQ

 */



     async visitLinkParser(linkData,client_os){
          let helperReponse = null;
          let iosLink = null;
          let androidLink = null
          try{
          switch(linkData.platform_id){
               case 1:{
                    /*youtube response */
                    let visit_parse_url = new URLParser(linkData.link_dest);
                    const val = await this.visitYoutubeLinkParser(visit_parse_url);
                    androidLink = `intent://www.youtube.com/${val.actionType}/${val.actionId}#Intent;package=com.google.android.youtube;scheme=https;end`;
                    iosLink = `vnd.youtube://www.youtube.com/${val.actionType}/${val.actionId}`;
                    helperReponse = new nexusResponse(0,false,null,
                         {iosLink:iosLink,androidLink:androidLink}
                         ,{funcName:'visitLinkParser',logMess:'URL parsing Failure'});
                    break;
               }
               default:{
                    throw new Error('Invalid platform');
                    break;
               }
          }}
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'visitLinkParser',logMess:'URL parsing Failure'});
          }
          return helperReponse;
     }

     async parseYoutubeUrlBool(parsed_url,domain_id){
          
          switch(domain_id){
               case 0:{
                    if(parsed_url.pathname.split("/")[1]){return true;}
                    else{return false;}
                    break;
               }     
               case 1:
               case 2:
               case 3:{
                    let f=false;
                    for(let i = 0 ;i < VALID_YOUTUBE_PATHNAMES.length;i++){
                         if(parsed_url.pathname.split("/")[1]==VALID_YOUTUBE_PATHNAMES[i]){
                              f=true;
                         }
                    }    
                    return f;
               }
               default:{
                    return false;
                    break;
               }
          }
          return false;
     }


     async URLValidity(got_uid,url){
          let helperReponse = null;
          let platform_id = 0;
          let identified_domain_id= null;
          let valid_url = false;
          let parse_validity  = false;
          try{ 
               let parsed_url = new URLParser(url);     
               

               for (let i = 0 ; i < VALID_DOMAINS.length ; i++){
                    for(let j = 0 ; j < VALID_DOMAINS[i].length; j++){
                         if(VALID_DOMAINS[i][j]==parsed_url.hostname){
                              platform_id = (i+1);     
                              identified_domain_id = j;
                              valid_url = true;
                              break;
                         }
                    }
               }
               
               if(valid_url){ parse_validity = await this.parseYoutubeUrlBool(parsed_url,identified_domain_id);}

               helperReponse = new nexusResponse(0,false,null,
               {valid_url:valid_url,identified_platform_id:platform_id,parse_validity:parse_validity},
               {funcName:'getSpaceDatabySid',logMess:'URL Validity Checking success'});
          }    
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'URLValidity',logMess:'URL Validity Checking Failure'});
          }
        return helperReponse; 
     }



}