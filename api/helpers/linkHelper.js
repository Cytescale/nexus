const randomstring =                   require("randomstring");
const nexusResponse =                  require("../../utils/resonseComposite");
const URLParser =                       require('url-parse')
const queryString = require('query-string');
const axios =                                require('axios').default;


/*
https://twitter.com/gamespot/status/1418571682378309639?s=21
https://twitter.com/delltechindia?s=21
https://twitter.com/rajeshjaney/status/1417466975257653252?s=21
https://twitter.com/search?q="22OUT%20NOW"

twitter://user?screen_name=nodejs
twitter://status?id=1418571682378309639&s=21
twitter://search?query=%22OUT%20NOW%22&q=%22OUT%20NOW%22

*/

/*        
               PLATFORM INDEX
               
               YOUTUBE 1
               INSTAGRAM 2
               TWITTER 3
     
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


const VALID_INSTA_PATHNAMES=[
     'p',
     's',
     'stories',
     'tv',
     'tag',
     'reel'
]


const VALID_TWIT_PATHNAMES=[
     'status',
     'hashtag',
     'search',

     
]
const VALID_INSTA_DOMAINS=[
     'www.instagram.com',
     'instagram.com',
     'cdninstagram.com',
     'instagram.c10r.facebook.com',
     'z-p42-instagram.c10r.facebook.com'
]

const VALID_TWIT_DOMAINS=[
     'www.twitter.com',
     'twitter.com'
]

const VALID_DOMAINS = [
     VALID_YOUTUBE_DOMAINS,
     VALID_INSTA_DOMAINS,
     VALID_TWIT_DOMAINS
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
     async visitInstgramLinkParser(visit_parse_url){
          const path  = visit_parse_url.pathname.split("/")[1]
          let identified_domain_id = null;
          let actionType = null;
          let actionId = null;
          for(let j = 0 ; j < VALID_INSTA_DOMAINS.length; j++){
               if(VALID_INSTA_DOMAINS[j]==visit_parse_url.hostname){
                    identified_domain_id = j;
                    break;
               }
          }
          switch(identified_domain_id){
               case 0:
               case 1:{
                    const query = queryString.parse(visit_parse_url.query)
                    let fi = null;
                    for(let i = 0 ;i < VALID_INSTA_PATHNAMES.length;i++){
                         if(path==VALID_INSTA_PATHNAMES[i]){fi=i;}
                    }   
                    switch(fi){
                         case 0:
                         case 1:
                         case 2:{
                              actionType=visit_parse_url.pathname.split("/")[1];
                              actionId=visit_parse_url.pathname.split("/")[2];
                              break;
                         }
                         default:{
                              actionType='p2';
                              actionId=visit_parse_url.pathname.split("/")[1];
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
     async visitTwitLinkParser(visit_parse_url){
          const path  = visit_parse_url.pathname.split("/")[1]
          let identified_domain_id = null;
          let actionType = null;
          let actionId = null;
          for(let j = 0 ; j < VALID_TWIT_DOMAINS.length; j++){
               if(VALID_TWIT_DOMAINS[j]==visit_parse_url.hostname){
                    identified_domain_id = j;
                    break;
               }
          }
          switch(identified_domain_id){
               case 0:
               case 1:{
                    const query = queryString.parse(visit_parse_url.query)
                    let fi = null;
                    for(let i = 0 ;i < VALID_TWIT_PATHNAMES.length;i++){
                         if(path==VALID_TWIT_PATHNAMES[i]){fi=i;}
                    }   
                    
                    switch(fi){
                         case 0:{
                              console.log('status');
                         }
                         case 1:{

                         }
                         case 2:{
                              
                              break;
                         }
                         default:{
                              actionType=visit_parse_url.pathname.split("/")[2];
                              actionId=visit_parse_url.pathname.split("/")[3];
                              if(!actionType){
                                   actionType='p2';
                                   actionId=path;
                              }
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
               case 2:{
                    /*instgram response */
                    let visit_parse_url = new URLParser(linkData.link_dest);
                    const val = await this.visitInstgramLinkParser(visit_parse_url);
                    let media_id = null;
                    switch(val.actionType){
                         case 'p2':{
                              iosLink = `instagram://user?username=${val.actionId}`;
                              androidLink = `intent://www.instagram.com/${val.actionId}${visit_parse_url.query}#Intent;package=com.instagram.android;scheme=https;end`;
                              break;
                         }
                         case 's':{
                              iosLink = `instagram://user?username=s${val.actionId}${visit_parse_url.query}`;
                              androidLink = `intent://www.instagram.com/${val.actionType}/${val.actionId}${visit_parse_url.query}#Intent;package=com.instagram.android;scheme=https;end`;
                              break;
                         }
                         default:{
                              androidLink = `intent://www.instagram.com/${val.actionType}/${val.actionId}${visit_parse_url.query}#Intent;package=com.instagram.android;scheme=https;end`;
                              await axios.get(`http://api.instagram.com/oembed?callback=&url=${linkData.link_dest}`)
                              .then(function (response) {
                                media_id = response.data.media_id; 
                              })
                              .catch(function (error) {
                                   media_id=null;
                              })
                              if(media_id){
                                   iosLink = `instagram://media?id=${media_id}&utm_medium=copy_link`;
                              }else{
                                   iosLink=  'instagram://media?id=%3C!DOCTYPE%20html%3E%3Chtml%20lang=';
                              }
                              break;
                         }
                    }
                    helperReponse = new nexusResponse(0,false,null,
                         {iosLink:iosLink,androidLink:androidLink}
                         ,{funcName:'visitLinkParser',logMess:'URL parsing Failure'});
                    break;
               }
               case 3:{
                    let visit_parse_url = new URLParser(linkData.link_dest);
                    const val = await this.visitTwitLinkParser(visit_parse_url);
                
                    // twitter://user?screen_name=nodejs
                    // twitter://status?id=1418571682378309639&s=21
                    // twitter://search?query=%22OUT%20NOW%22&q=%22OUT%20NOW%22

                    console.log(val);
                    switch(val.actionType){
                         case 'p2':{
                              iosLink = `twitter://user?screen_name=${val.actionId}`;
                              androidLink = `intent://twitter.com/${val.actionId}${visit_parse_url.query}#Intent;package=com.twitter.android;scheme=https;end`;
                              break;
                         }case'status':{
                              iosLink = `twitter://status?id=${val.actionId}`;
                              androidLink = `intent://twitter.com/${val.actionType}/${val.actionId}${visit_parse_url.query}#Intent;package=com.twitter.android;scheme=https;end`;
                         }
                         default:{
                              break;
                         }
                    }

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
               {valid_url:valid_url,identified_platform_id:platform_id,parse_validity:true},
               {funcName:'getSpaceDatabySid',logMess:'URL Validity Checking success'});
          }    
          catch(e){
               helperReponse = new nexusResponse(1,true,e.message,null,{funcName:'URLValidity',logMess:'URL Validity Checking Failure'});
          }
        return helperReponse; 
     }



}