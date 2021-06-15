'use strict';
//NEXUS
const cors =                        require('cors');
const os =                          require('os');
const express =                     require('express');
const fs =                          require('fs');
const app =                         express();
const { request } =                 require('http');
const e =                           require('cors');
const CronJob =                     require('cron').CronJob;
const { exit } =                    require('process');
const axios =                       require('axios').default;
const dotenv =                      require("dotenv");
const admin =                       require("firebase-admin");
const serviceAccount =              require("./firebase_admin_cert.json");
const MongoClient =                 require('mongodb').MongoClient;
const bodyParser =                  require('body-parser')
const multer =                      require('multer') 
var log4js =                        require("log4js");


log4js.configure({
  appenders: { everything: { type: 'file',filename: "server2.log" } },
  categories: { default: { appenders: [ 'everything' ], level: 'debug' } }
});


var logger =                        log4js.getLogger();
const rateLimit =                   require("express-rate-limit");

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

const upload = multer() ;

const port = process.env.SERVER_PORT;

const uri = "mongodb+srv://admin:2K8iiXzQxCc2hJYU@titan-cluster.b5ss8.mongodb.net/central_db?retryWrites=true&w=majority";
const client = new MongoClient(uri,
   { useUnifiedTopology: true}, 
   { useNewUrlParser: true }, 
   { connectTimeoutMS: 30000 }, 
   { keepAlive: 1});
  

var TOTAL_REQUEST_COUNT = 0;
var TOTAL_SUCESS_PASS = 0;
var TOTAL_FAILUER_PASS = 0;


let allowedRoutes = {
  delRelationData:true,
  makeRelationData:true,
  getRelationData:true,
  updateUserData:false,
  getUserDatabyUid:true,
  getUserDatabyJid:true,
}


   
class DbClusterHelper{
  static client = null;
  constructor(client){
    DbClusterHelper.client = client;
  }
  getClient(){return DbClusterHelper.client;}

  async updateUserInfo(got_uid,got_data){
    let unameChangeBool = false;
    let allowedUnameChangeBool = true;
    let editSuccessBool = false;
    let errCode = 0;
    let errBool = false;
    let errMess = null;

    if(this.getClient()){
      if(got_uid && got_data){
        got_data.update_timestamp = Date.now();
        if(got_data.uname){
          const oldData  = await this.getUserDatabyUname(got_data.uname);
          if(oldData){
             if(oldData[0].uid==got_uid){
              allowedUnameChangeBool=true;
             }
             else{
              editSuccessBool = false;
              allowedUnameChangeBool =false
             }
          }
          else{
            unameChangeBool = true;
            allowedUnameChangeBool=true;
          }
        }
        if(allowedUnameChangeBool){
          try{  
            const filter = { uid:got_uid };
              const updateDocument = {
                $set: got_data,
              };
            const result = await this.getClient().db('central_db').collection("user_info_collec").updateOne(filter,updateDocument); 
              if(result){
                editSuccessBool=true;
                logger.debug(`updateUserData: data update success`);
              }
            }
            catch(e){
              logger.debug(`updateUserData: data update failure `+e);
              console.error('updateUserData failure '+e);
              errBool = true;
              errMess = 'profile update failure';
              }
          
            }
            else{
               errBool = true;
               errMess = 'uername already exist';
            }
          }
        else{
          logger.debug(`updateUserData: data update failure | no uid or data`);
          console.error('updateUserData failure No UID');
          errBool = true;
          errMess = 'No Uid';
          }
        }
      else{
        logger.debug(`updateUserData: data update failure | no client`);
        console.error('updateUserData failure No Client');
        errBool = true;
          errMess = 'No Uid';
        }
        return{
          errCode:errCode,
          errBool:errBool,
          errMess:errMess,
          editSuccessBool:editSuccessBool,
          allowedUnameChangeBool:allowedUnameChangeBool,
          unameChangeBool:unameChangeBool,
        }
  }
  async getRelationBool(from_uid,to_uid){
    if(this.getClient()){
      if(from_uid && to_uid){
        try{  
          const collection = this.getClient().db('central_db').collection("user_relation_collec").find({from_uid:from_uid,to_uid:to_uid}); 
          let data = await collection.toArray();
            if(data.length==1){
              logger.debug(`getUserRelation: true`);  
              return true;}
            else{
              logger.debug(`getUserRelation: no data`);
              return false;;}}
          catch(e){
            logger.debug(`getUserRelation:`+e);
            console.error('getUserRelation failure '+e);
            return false;}}
        else{
          logger.debug(`getUserRelation: no from_uid or to_uid`);
          console.error('getUserRelation failure No UID');
          return false;}}
      else{
        logger.debug(`getUserRelation: no client`);
        console.error('getUserRelation failure No Client');
        return false;}
  }
  async makeRelationBool(from_uid,to_uid){
    let alrdyExist = await this.getRelationBool(from_uid,to_uid);
    let alreadyRelation = false;
    let newRelation = false;
    let errBool = false;
    let errMess = null;
    if(!alrdyExist){
      try{
      const newQuery = {creation_timestamp:Date.now(),from_uid: from_uid,to_uid: to_uid};
      const collection = this.getClient().db('central_db').collection("user_relation_collec"); 
      let result = await collection.insertOne(newQuery);
        if(result.insertedCount==1){
          newRelation=true;
          logger.debug(`makeUserRelation: sucess`);
        }else{
          errBool=true;
        }
      }
      catch(e){
        logger.debug(`makeUserRelation: failure`+e);
          console.error('makeUserRelation: failure'+e);
        errBool=true;
        errMess =e;
        console.log(e);
      }
    }else{
      alreadyRelation=true;
    }
    return{
      errBool:errBool,
      errMess:errMess,
      alreadyRelation:alreadyRelation,
      newRelation:newRelation
    }
  }
  async delRelation(from_uid,to_uid){
    let alrdyExist = await this.getRelationBool(from_uid,to_uid);
    let alreadyRelation = false;
    let deleteBool = false;
    let errBool = false;
    let errMess = null;
    if(alrdyExist){
      alreadyRelation=true;
      try{
      const result = await this.getClient().db('central_db').collection("user_relation_collec").deleteOne({from_uid:from_uid,to_uid:to_uid}); 
        if(result.deletedCount==1){
          deleteBool=true;
          logger.debug(`delUserRelation: sucess`);
        }else{
          errBool=true;
        }
      }
      catch(e){
        errBool=true;
        errMess =e;
        logger.debug(`delUserRelation: failure `+e);
        console.error('delUserRelation: failure '+e);
      }
    }else{
      alreadyRelation=false;
      logger.debug(`delUserRelation: failure | no such realtion`);
      console.error('delUserRelation: failure | no such realtion');
    }
    return{
      errBool:errBool,
      errMess:errMess,
      alreadyRelation:alreadyRelation,
      deleteBool:deleteBool
    }
  }
  async getUserDatabyJid(got_jid){
    if(this.getClient()){
      if(got_jid){
        try{  
          const collection = this.getClient().db('central_db').collection("user_info_collec").find({'joining_id':got_jid}); 
          let data = await collection.toArray();
            if(data.length==1){
              logger.debug(`getUserData: data extraction success`);  
              return data;}
            else{
              logger.debug(`getUserData: data extraction failure | no data`);
              return null;}}
          catch(e){
            logger.debug(`getUserData: data extraction failure `+e);
            console.error('getuserData failure '+e);
            return null;}}
        else{
          logger.debug(`getUserData: data extraction failure | no jid`);
          console.error('getuserData failure No UID');
          return null;}}
      else{
        logger.debug(`getUserData: data extraction failure | no client`);
        console.error('getuserData failure No Client');
        return null;}
  }
  async getUserDatabyUname(got_uname){
    if(this.getClient()){
      if(got_uname){
        try{  
          const collection = this.getClient().db('central_db').collection("user_info_collec").find({'uname':got_uname}); 
          let data = await collection.toArray();
            if(data.length==1){
              logger.debug(`getUserDatabyUname: data extraction success`);  
              return data;}
            else{
              logger.debug(`getUserDatabyUname: data extraction failure | no data`);
              return null;}}
          catch(e){
            logger.debug(`getUserDatabyUname: data extraction failure `+e);
            console.error('getUserDatabyUname failure '+e);
            return null;}}
        else{
          logger.debug(`getUserDatabyUname: data extraction failure | no uid`);
          console.error('getUserDatabyUname failure No UID');
          return null;}}
      else{
        logger.debug(`getUserDatabyUname: data extraction failure | no client`);
        console.error('getUserDatabyUname failure No Client');
        return null;}
  }
  async getUserDatabyUid(got_uid){
    if(this.getClient()){
      if(got_uid){
        try{  
          const collection = this.getClient().db('central_db').collection("user_info_collec").find({'uid':got_uid}); 
          let data = await collection.toArray();
            if(data.length==1){
              logger.debug(`getUserData: data extraction success`);  
              return data;}
            else{
              logger.debug(`getUserData: data extraction failure | no data`);
              return null;}}
          catch(e){
            logger.debug(`getUserData: data extraction failure `+e);
            console.error('getuserData failure '+e);
            return null;}}
        else{
          logger.debug(`getUserData: data extraction failure | no uid`);
          console.error('getuserData failure No UID');
          return null;}}
      else{
        logger.debug(`getUserData: data extraction failure | no client`);
        console.error('getuserData failure No Client');
        return null;}
      
  }
  
  
}

let dbClusterHelper =  new DbClusterHelper(client);

class server_entry{
  constructor(){
     
     
  }  

  firebaseInit(){
    if(admin.apps.length<1)
    {
          console.log("FIREBASE: Firebase initiated");
          admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: "https://titan-6969-default-rtdb.asia-southeast1.firebasedatabase.app"
          });
    }  
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
      exit(0);
    }
  }

  initRoutes(){
    router.get('/',(req,res,next)=>{
      res.send('<h3><bold>Hey There👋</bold></h3>').status(200).end();
      next();
    })
    router.use(bodyParser.json())
    router.use(bodyParser.urlencoded({ extended: true })) 
    router.use('/api/',limiter);
    router.get('/logs',async(req,res,next)=>{
      res.send(sendAdminPanel()).status(200).end();
      next();
    });
    router.get('/api/delRelationData',async(req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let from_uid=req.body.from_uid;
      let to_uid=req.body.to_uid;
      let errCode = 0;
      let errMess = null;
      let errBool  = false;
      let data = null;
      if(allowedRoutes.delRelationData){
      if(from_uid && to_uid){
          let resData = await dbClusterHelper.delRelation(from_uid,to_uid);
          if(!resData.errBool){
            data={
              alreadyRelation:resData.alreadyRelation,
              deleteBool:resData.deleteBool
            }
          }else{
            errBool=true;
            errMess=resData.errMess;
          }
      }else{
        errBool=true;
        errMess='Missing data';
      } 
      }
      else{
        errCode =  1;
        errBool  = true;
        errMess = 'Route is closed'
      }
      errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send({errCode:errCode,errBool:errBool,errMess:errMess,data:data}).status(200).end();
      next();
    })
    router.get('/api/makeRelationData',async(req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let from_uid=req.body.from_uid;
      let to_uid=req.body.to_uid;
      let errCode = 0;
      let errMess = null;
      let errBool  = false;
      let data = null;
      if(allowedRoutes.makeRelationData){
      if(from_uid && to_uid){
          let resData = await dbClusterHelper.makeRelationBool(from_uid,to_uid);
          if(!resData.errBool){
            data={
              alreadyRelation:resData.alreadyRelation,
              newRelation:resData.newRelation
            }
          }else{
            errBool=true;
            errMess=resData.errMess;
          }
      }else{
        errBool=true;
        errMess='Missing data';
      } 
    }
      else{
        errCode =  1;
        errBool  = true;
        errMess = 'Route is closed'
      }
      errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send({errCode:errCode,errBool:errBool,errMess:errMess,data:data}).status(200).end();
      next();
    })
    router.get('/api/getRelationData',async(req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let from_uid=req.body.from_uid;
      let to_uid=req.body.to_uid;
      let errCode = 0;
      let errMess = null;
      let errBool  = false;
      let data = null;
      if(allowedRoutes.getRelationData){
        if(from_uid && to_uid){
            let resData = await dbClusterHelper.getRelationBool(from_uid,to_uid);
            if(resData){data={followed_bool:true}}
            else{data={followed_bool:false}}
        }
      }
      else{
        errCode =  1;
        errBool  = true;
        errMess = 'Route is closed'
      }
      errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send({errCode:errCode,errBool:errBool,errMess:errMess,data:data}).status(200).end();
      next();
    })
    router.get('/api/updateUserData',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let uid=req.body.uid;
      let update_data =req.body.update_data;
      let errCode = 0;
      let errBool  = false;
      let errMess = null;
      let data = null;
      if(allowedRoutes.updateUserData){
        if(uid && update_data){
          let userData = await dbClusterHelper.updateUserInfo(uid,update_data);
          if(!userData.errBool){
            errCode = 10;
            data = {
              editSuccessBool:userData.editSuccessBool,
              allowedUnameChangeBool:userData.allowedUnameChangeBool,
              unameChangeBool:userData.unameChangeBool,
            };
          }else{
            errCode = 3;
            errBool  = true;
            errMess = userData.errMess
          }
        }
        else{
          errCode = 2;
          errBool  = true;
          errMess = 'Missing data'
        }
      }
      else{
        errCode =  1;
        errBool  = true;
        errMess = 'Route is closed'
      }
      errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send({errCode:errCode,errBool:errBool,errMess:errMess,data:data}).status(200).end();
      next();
    })
    router.get('/api/getUserDatabyUid',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let uid=req.body.uid;
      let errCode = 0;
      let errBool  = false;
      let errMess = null;
      let data = null;
      if(allowedRoutes.getUserDatabyUid){
      if(uid){
        let userData = await dbClusterHelper.getUserDatabyUid(uid);
        if(userData){
          errCode=0;
          data=userData;}
        else{
          errCode=2;
          errBool = true; 
          errMess='Data extraction failure'}}
      else{
          errCode=2;
          errBool = true;
          errMess='Missing data'}
       }
        else{
          errCode =  1;
          errBool  = true;
          errMess = 'Route is closed'
        }
      errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send({errCode:errCode,errMess:errMess,errBool:errBool,data:data}).status(200).end();
      next();
    })
    router.get('/api/getUserDatabyJid',async (req,res,next)=>{
      TOTAL_REQUEST_COUNT++;
      let jid=req.body.jid;
      let errCode = 0;
      let errMess = null;
      let errBool  = false;
      let data = null;
      if(allowedRoutes.getUserDatabyJid){
      if(jid){
        let userData = await dbClusterHelper.getUserDatabyJid(jid);
        if(userData){
          errCode=0;
          data=userData;}
        else{
          errCode=2;
          errBool = true;
          errMess='Data extraction failure'}}
      else{
          errCode=2;
          errBool = true;
          errMess='Missing data'}     
       }
        else{
          errCode =  1;
          errBool  = true;
          errMess = 'Route is closed'
        }
      errBool?TOTAL_FAILUER_PASS++:TOTAL_SUCESS_PASS++;
      res.send({errCode:errCode,errBool:errBool,errMess:errMess,data:data}).status(200).end();
      next();
    })

  }

  init(){
    app.use(express.static(__dirname));
    app.use(cors());
    app.use(router);
   
    this.firebaseInit();
    app.listen(port,() => {
      logger.debug('Server Running on port'+port);
      console.log('Server Running on port'+port);}
      );
    this.initMongoConnec().then(res=>{
      if(res){
        this.initRoutes();
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
  console.warn('About to exit with code:', code);
});



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


new server_entry().init();