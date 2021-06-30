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

     async parseYoutubeUrlBool(parsed_url,domain_id){
          switch(domain_id){
               case 0:{
                    if(parsed_url.pathname){return true;}
                    else{return false;}
                    break;
               }     
               case 1:
               case 2:
               case 3:{
                    const url_param = queryString.parse(parsed_url.query);
                    if(url_param.v){return true;}
                    else{return false;}
                    break;
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
               const parsed_url = new URLParser(url);     
               
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