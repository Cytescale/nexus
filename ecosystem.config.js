module.exports = {
  apps : [{
    name:'nexus',
    script: 'nodemon',
    watch: false,
    instances : "max",
    exec_mode : "cluster"
  }]
};
