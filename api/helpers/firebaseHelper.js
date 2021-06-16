const admin =                       require("firebase-admin");
const serviceAccount =              require("../../certs/firebase_admin_cert.json");


module.exports = class FirebaseHelper{

     logger = null;

     constructor(logger){
          this.logger=  logger;
     }
     
     firebaseInit(){
          if(admin.apps.length<1)
          {
                this.logger.debug(`Firebase initiated`);  
                console.log("Firebase initiated");
                admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: "https://titan-6969-default-rtdb.asia-southeast1.firebasedatabase.app"
                });
          }  
     }

}