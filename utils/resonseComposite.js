const log4js =                      require("log4js");
log4js.configure({
     appenders: { everything: { type: 'file',filename: "./logs/overall_server_1.log" } },
     categories: { default: { appenders: [ 'everything' ], level: 'debug' } }
   });   
var logger =log4js.getLogger();
   

module.exports = class nexusResponse{
     errCode=0;
     errMess=null;
     errBool=false;
     responseTimestamp = Date.now();
     responseData=null;
     constructor(errCode,errBool,errMess,responseData,logData){
          this.errCode = errCode     
          this.errBool = errBool
          this.errMess = errMess
          this.responseData = responseData;
          if(logData){this.logit(logData);}
     }
     logit(logData){
          if(!this.errBool){
               logger.debug(`DONE: ${logData.funcName} ${logData.logMess}`);
          }else{
               logger.debug(`ERROR: ${logData.funcName} ${logData.logMess} ${this.errMess}`);
          }
     }
}