module.exports = {
  apps : [{
    name:'nexus',
    script: 'nodemon',
    watch: true,
    instances : "max",
    exec_mode : "cluster"
  }]
};
