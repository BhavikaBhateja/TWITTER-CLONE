var mysql = require('mysql');
var db = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"Root123@#",
    database:"twitter"
});
db.connect(function(err){
    if(err)
        throw err;
    });
    module.exports=db;