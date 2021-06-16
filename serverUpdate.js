const { exec } =                    require("child_process");
let server_respon = null;
exec("cd /home/ubuntu/nexus/ && git stash && git pull && pm2 restart nexus", (error, stdout, stderr) => {
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