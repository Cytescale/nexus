'use strict';
const cors =                        require('cors');
const os =                          require('os');
const express =                     require('express');
const fs =                          require('fs');
const app =                         express();
const { request } =                 require('http');
const CronJob =                     require('cron').CronJob;
const { exit } =                    require('process');
const axios =                       require('axios').default;
const ImageKit =                    require('imagekit');
const dotenv =                      require("dotenv");
const MongoClient =                 require('mongodb').MongoClient;
const bodyParser =                  require('body-parser')
const multer =                      require('multer') 
const log4js =                      require("log4js");
const { exec } =                    require("child_process");
const rateLimit =                   require("express-rate-limit");
const nexusResponse =               require("./utils/resonseComposite");
const DbClusterHelper =             require("./api/helpers/dbClusterHelper");
const RtcCron =                     require('./api/helpers/rtcCron');
const FirebaseHelper =              require("./api/helpers/firebaseHelper");
const {mongo_uri} =                 require("./certs/mongo_connect_cert");
const imageKitCert =                require("./certs/imagekey_cert.json");
const compression =                 require('compression')
const LinkHelper =                  require('./api/helpers/linkHelper');
const parser =                      require('ua-parser-js');

const imagekit = new ImageKit({
  urlEndpoint: "https://ik.imagekit.io/cyte",
  publicKey: 'public_/DkOKC6N0KqktP0jSpjDTtKpiTA=',
  privateKey: 'private_LgxIx1g7AY/LeX7jtJBlh1Pmis8='
});  

log4js.configure({
  appenders: { everything: { type: 'file',filename: "./logs/overall_server_2.log" } },
  categories: { default: { appenders: [ 'everything' ], level: 'debug' } }
});

var logger =log4js.getLogger();

dotenv.config();
const router = express.Router({
  caseSensitive:false,
  strict:true,
})

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message:
  {
    errCode:1,
    errMess:'Too many request',
    errBool:true,
  }
});

logger.level = 'debug' ;
router.use(express.static(__dirname));


const port = process.env.SERVER_PORT;

const client = new MongoClient(mongo_uri,
   { useUnifiedTopology: true}, 
   { useNewUrlParser: true }, 
   { connectTimeoutMS: 30000 }, 
   { keepAlive: 1});
  

  /*/////////////SERVER VARSs ////////////*/
const SERVER_VERSION = "0.0.8";
var SERVER_STATUS = "RUNNING";
var TOTAL_REQUEST_COUNT = 0;
var TOTAL_SUCESS_PASS = 0;
var TOTAL_FAILUER_PASS = 0;

/*/////////////////////////////////////////*/

//intent://www.youtube.com/watch?v=N9PMmDPO-8U#Intent;package=com.google.android.youtube;scheme=https;end


let allowedRoutes = {
  
  makeRelationData:true,
  makeSpaceData:true,
  makeLinkData:true,

  updateSpaceData:true,
  updateUserData:true,
  updateLinkData:true,

  getFollowCount:true,
  getSpaceDatabySid:true,
  getSpaceFeedData:true,
  getRelationData:true,
  getUserDatabyUid:true,
  getUserDatabyJid:true,
  getLinksData:true,
  getLinkDatabyUniId:true,

  delRelationData:true,

  checkURLData:true,

}
  
var dbClusterHelper =  new DbClusterHelper(client,logger);
var firebaseHelper =  new FirebaseHelper(logger);
var linkHelper =      new LinkHelper(logger);
var rtcCron =         new RtcCron(logger,dbClusterHelper);

var corsOptions = {
  optionsSuccessStatus: 200 ,
  preflightContinue: false,
}

class server_entry{
  constructor(){
     
     
  }  

  async initMongoConnec(){
    try{
        await client.connect();
        await client.db("central_db").command({ ping: 1 });
        console.log("Connected successfully to mongo server");   
        return true;
    }
    catch(e){
      console.error("Fatal Error: mongo connect failure"+e);
      SERVER_STATUS = "INTERUPTED";
      return false;
    }
  }

  initRoutes(){
    router.use('/api/',limiter);
    router.get('/',(req,res,next)=>{
      res.send(`<h3><bold>Hey There👋<br/>Version: ${SERVER_VERSION}  <div>SERVER STATUS: ${SERVER_STATUS}</div></bold></h3>`).status(200).end();
      next();
    })

    router.get('/logs',async(req,res,next)=>{
      res.send(sendAdminPanel()).status(200).end();
      next();
    });

    router.post('/api/gitUpdate',async(req,res,next)=>{
      console.log("Git update pushed");
      SERVER_STATUS = "REBUILDING";
      let server_respon = null;
      exec(`
      eval "$(ssh-agent -s)" && 
      ssh-add ~/.ssh/gitkey && 
      cd /home/ubuntu/nexus/ && 
      git stash && git pull &&
      npm install &&
      pm2 restart nexus`, (error, stdout, stderr) => {
        if (error) {
          server_respon = error.message; 
          console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
          server_respon = sterr;
          console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        server_respon = stdout;
      });
      console.log(`Project rebuild result`+server_respon);;
      res.send('Project rebuild response'+server_respon).status(200).end();
      next();
    });
    router.get('/api/delRelationData',async(req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let from_uid=req.body.from_uid;
      let to_uid=req.body.to_uid;
      let serverReponse = null; 
      if(allowedRoutes.delRelationData){
      if(from_uid && to_uid){
       
        let resData = await dbClusterHelper.delRelation(from_uid,to_uid);
          
          if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData); 
          }else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}
      }else{serverReponse = new nexusResponse(2,true,'Missing data',null);} }
      else{serverReponse = new nexusResponse(2,true,'Route is closed',null);}
      serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send(serverReponse).status(200).end();
      next();
    })
    router.get('/api/imageKitAuth',async(req,res,next)=>{
      var result = imagekit.getAuthenticationParameters();
      res.send(result).status(200).end();
      next();
    });
    router.post('/api/getSpaceDatabySid',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let uid=req.body.uid;
      let sid=req.body.sid
      let serverReponse = null;
      if(allowedRoutes.getUserDatabyUid){
            if(uid && sid){
              let resData = await dbClusterHelper.getSpaceDatabySid(uid,sid);
              if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
              else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}}
              else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}}
              else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
            serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
            res.send(serverReponse).status(200).end();
            next();
    })
    router.post('/api/getSpaceFeedData',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let uid=req.body.uid;
      let serverReponse = null;
      if(allowedRoutes.getSpaceFeedData){
      if(uid){
        let resData = await dbClusterHelper.getSpaceFeedData(uid);
        if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
        else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}}
        else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}}
        else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
        serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
        res.send(serverReponse).status(200).end();
         next();
    })
    router.post('/api/getLinksData',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let uid=req.body.uid;
      let serverReponse = null;
      if(allowedRoutes.getLinksData){
      if(uid){
        let resData = await dbClusterHelper.getLinksData(uid);
        if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
        else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}}
        else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}}
        else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
        serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
        res.send(serverReponse).status(200).end();
        next();
    })
    router.post('/api/getLinksDatabyUniId',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let uid=req.body.uid;
      let uniid=req.body.uniid;
      let serverReponse = null;
      if(allowedRoutes.getLinkDatabyUniId){
      if(uid && uniid){
        let resData = await dbClusterHelper.getLinkDataByUnique(uniid);
        if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
        else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}}
        else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}}
        else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
        serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
        res.send(serverReponse).status(200).end();
        next();
    })    
    router.get('/api/makeSpaceData',async(req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let serverReponse = null;
      let got_uid=req.body.uid;
      let space_data=req.body.space_data;
      if(allowedRoutes.makeSpaceData){
      if(got_uid && space_data){
        let resData = await dbClusterHelper.makeSpaceData(got_uid,space_data);
        console.log(resData.responseData);
        if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
        else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}}
        else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}}
        else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
      serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send(serverReponse).status(200).end();
      next();
    })
    router.post('/api/makeLinkData',async(req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let serverReponse = null;
      let got_uid=req.body.uid;
      let link_data=req.body.link_data;
      if(allowedRoutes.makeLinkData){
      if(got_uid && link_data){
        let resData = await dbClusterHelper.makeLinkData(got_uid,link_data);
        if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
        else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}}
        else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}}
        else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
      serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send(serverReponse).status(200).end();
      next();
    })
    router.post('/api/updateLinkData',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let uid=req.body.uid;
      let linkId=req.body.linkid;
      let update_data =req.body.update_data;
      let serverReponse = null;
      if(allowedRoutes.updateLinkData){
        if(uid && update_data){
        let resData = await dbClusterHelper.updateLinkInfo(uid,linkId,update_data);
        if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
        else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}}
        else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}}
       else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
      serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send(serverReponse).status(200).end();
      next();
    })
    router.get('/api/updateSpaceData',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let uid=req.body.uid;
      let sid=req.body.sid;
      let update_data =req.body.update_data;
      let serverReponse = null;
      if(allowedRoutes.updateUserData){
        if(uid && update_data){
          let resData = await dbClusterHelper.updateSpaceData(uid,sid,update_data);
          if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
          else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}
          }
          else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}    
         }
         else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
        serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
        res.send(serverReponse).status(200).end();
        next();
    })
    router.get('/api/makeRelationData',async(req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let from_uid=req.body.from_uid;
      let to_uid=req.body.to_uid;
      let serverReponse = null; 
      if(allowedRoutes.delRelationData){
        if(from_uid && to_uid){

              let resData = await dbClusterHelper.makeRelationBool(from_uid,to_uid);            

            if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData); 
            }else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}
        }else{serverReponse = new nexusResponse(2,true,'Missing data',null);} }
        else{serverReponse = new nexusResponse(2,true,'Route is closed',null);}
        serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
        res.send(serverReponse).status(200).end();
        next();
    })

    router.post('/api/checkURLData',async(req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let serverReponse = null;
      let got_uid=req.body.uid;
      let link_url=req.body.link_url;
      if(allowedRoutes.checkURLData){
      if(got_uid && link_url){
        let resData = await linkHelper.URLValidity(got_uid,link_url);
        if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
        else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}}
        else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}}
        else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
      serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send(serverReponse).status(200).end();
      next();
    })
  
    router.get('/api/visit/:unique_identifier?',async(req,res,next)=>{
      const uniq_id = req.params.unique_identifier
      if(!uniq_id){res.send('No Link Identifier').end();return;}
      let resData = await dbClusterHelper.getLinkDataByUnique(uniq_id);
      if(resData.errBool){res.send(resData).end();return;}
      if(resData.responseData.gotData.ban_bool){res.send('Link baned').end();return;}
      if(resData.responseData.gotData.deleted_bool){res.send('Link Deleted').end();return;}
      if(!resData.responseData.gotData.active_bool){res.send('Link Disabled').end();return;}
      let ua = parser(req.headers['user-agent']); 
      let redirectData  = await linkHelper.visitLinkParser(resData.responseData.gotData,ua.os.name)
      if(!redirectData.errBool){
        switch(ua.os.name)
        {
            case 'Android':{
              res.redirect(redirectData.responseData.androidLink);
              break;
            }
            case 'iOS':{
              res.redirect(redirectData.responseData.iosLink);
              break;
            }
            case 'Windows':{
              res.redirect(resData.responseData.gotData.link_dest);
              break;
            }
            default:{
              res.redirect(resData.responseData.gotData.link_dest);
            }
        }
      }
      else{res.send('Link Parsing error , We apppologise for inconvience ').end();return;}
      next();
    })

    router.get('/api/getFollowCount',async(req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let uid=req.body.uid;
      let serverReponse = null;
      if(allowedRoutes.getFollowCount){
        if(uid){
          let resData = await dbClusterHelper.getFollowCount(uid);
          if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
          else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}
          }
          else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}    
         }
         else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
        serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
        res.send(serverReponse).status(200).end();
        next();
    })
    router.get('/api/getRelationData',async(req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let from_uid=req.body.from_uid;
      let to_uid=req.body.to_uid;
      let serverReponse = null; 
      if(allowedRoutes.getRelationData){
        if(from_uid && to_uid){
            let resData = await dbClusterHelper.getRelationBool(from_uid,to_uid);           
            if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData); 
        }else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}
    }else{serverReponse = new nexusResponse(2,true,'Missing data',null);} }
    else{serverReponse = new nexusResponse(2,true,'Route is closed',null);}
    serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
    res.send(serverReponse).status(200).end();
    next();
    })
    router.get('/api/updateUserData',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let uid=req.body.uid;
      let update_data =req.body.update_data;
      let serverReponse = null;
      if(allowedRoutes.updateUserData){
        if(uid && update_data){
        let resData = await dbClusterHelper.updateUserInfo(uid,update_data);
        if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
        else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}}
        else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}}
       else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
      serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send(serverReponse).status(200).end();
      next();
    })
    router.post('/api/getUserDatabyUid',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let serverReponse = null;
      let uid=req.body.uid;
      if(allowedRoutes.getUserDatabyUid){
      if(uid){
          let resData = await dbClusterHelper.getUserDatabyUid(uid);
          if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
          else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}
        }
          else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}
       }
        else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
      serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send(serverReponse).status(200).end();
      next();
    })
    router.post('/api/getUserDatabyJid',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let jid=req.body.jid;
      let serverReponse = null;
      if(allowedRoutes.getUserDatabyJid){
      if(jid){
        let resData = await dbClusterHelper.getUserDatabyJid(jid);
        if(!resData.errBool){serverReponse = new nexusResponse(0,false,null,resData.responseData);}
        else{serverReponse = new nexusResponse(10,true,resData.errMess,null);}}
        else{serverReponse = new nexusResponse(2,true,'Missing Data',null);}}
        else{serverReponse = new nexusResponse(1,true,'Route is closed',null);}
        serverReponse.errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
        res.send(serverReponse).status(200).end();
         next();
    })
    
  
  }

  init(){
    app.use(express.static(__dirname));
    app.use(cors(corsOptions));
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true })) 
    app.use(router);
    app.use(compression())

    firebaseHelper.firebaseInit();
    app.listen(port,() => {
      logger.debug('Server Running on port'+port);
      console.log('Server Running on port'+port);
      SERVER_STATUS = "RUNNING";
    });
    this.initMongoConnec().then(res=>{
      if(res){
        logger.debug(`connected successfully to mongodb`);
        this.initRoutes();
        //rtcCron.intiCronJob();
      }
    });  
  }

}


process.on("SIGINT",()=>{
  console.warn("PROCESS AT END");
  process.kill(process.pid, '0');
});
process.once('SIGUSR2', function () {
  gracefulShutdown(function () {
    process.kill(process.pid, 'SIGUSR2');
  });
  console.warn("GRACE SHUTDOWN");
});
process.on('exit', function(code) {
  logger.debug(`Server shutdown `);
  console.log("Server shutdown ");
  if(client.isConnected){client.close().then(()=>{
    logger.debug(`Mongo db disconect`);
    console.log("mongo db disconnected");
  })}
  console.warn('About to exit with code:', code);
});



new server_entry().init();


function sendAdminPanel(){
  return(`
  <!doctype html>
    <html lang="en">
      <head>
      <title>Nexus Logs</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=" crossorigin="anonymous"></script>
      <link rel="preconnect" href="https://fonts.gstatic.com">
      <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        #l-bdy{
          font-family:Quicksand;
          font-size:22px;
          padding-top:62px;
          background:#f5f5f5;
        }
        #l-head{
          width:100%;
          height:52px;
          display:flex;
          justify-content:center;
          align-items:center;
          background:#000;
          color:#fff;
          position:fixed;
          top:0;
          left:0;
          right:0;
        }
        #l-log-bdy{
          background:#f1f1f1;
          width:50%;
          height:500px;
          color:#000;
          border:1px solid #e0e0e0;
          border-radius:4px;
          border-style:solid;
          overflow:scroll;
          font-size:14px;
          display:flex;
          flex-direction: column-reverse;
        }
      </style>
      <script>
     
      </script>
      </head>  
      <body id='l-bdy'>
      <div id='l-head'>Nexus Logs Panel</div>
         <embed  src='./server2.log' id='l-log-bdy'/>
        
      </body>
     
    </html>
  `)
}

