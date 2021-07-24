const randomstring =                   require("randomstring");
const nexusResponse =                  require("../../utils/resonseComposite");
const URLParser =                       require('url-parse')
const queryString = require('query-string');
const axios =                                require('axios').default;


/*
    url: 'http://api.instagram.com/oembed?callback=&url=http://instagram.com/p/Y7GF-5vftL‌​/',     


https://www.instagram.com/p/CQ1AzV3j635/?utm_medium=copy_link
https://instagram.com/username?utm_medium=copy_link
https://instagram.com/stories/u/2609124446563142090?utm_source=ig_story_item_share&utm_medium=copy_link
https://www.instagram.com/reel/CQjNjbRpOhC/?utm_medium=copy_link

*/

/*        
               PLATFORM INDEX
               
               YOUTUBE 1
               INSTAGRAM 2


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
     'reel'
]

const VALID_INSTA_DOMAINS=[
     'www.instagram.com',
     'instagram.com',
     'cdninstagram.com',
     'instagram.c10r.facebook.com',
     'z-p42-instagram.c10r.facebook.com'
]

const VALID_DOMAINS = [
     VALID_YOUTUBE_DOMAINS,
     VALID_INSTA_DOMAINS
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
                    console.log(visit_parse_url);
                    console.log(val);
                    let media_id = null;
                    let iosLink = null;
                    switch(val.actionType){
                         case 'p2':{
                              iosLink = `instagram://user?username=${val.actionId}`;
                              break;
                         }
                         case 's':{
                              iosLink = `instagram://media?id=${val.actionId}${visit_parse_url.query}`;
                              break;
                         }
                         default:{
                              await axios.get(`http://api.instagram.com/oembed?callback=&url=${linkData.link_dest}`)
                              .then(function (response) {
                                media_id = response.data.media_id;
                                console.log(media_id);
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
                    console.log(iosLink);
                    androidLink = `intent://www.instagram.com/${val.actionType}/${val.actionId}${visit_parse_url.query}#Intent;package=com.instagram.android;scheme=https;end`;
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