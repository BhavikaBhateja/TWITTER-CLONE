var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var db = require('./db_conn.js');
var multer = require('multer');
var sendVerifyEmail = require('./sendmail.js');

var app = express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(session({secret:"test123$#%"}));
app.set('view engine','ejs');
app.use(express.static(__dirname+"/public"));


var storage = multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,"public/uploads/");
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now()+"-"+req.session.userid+"-"+file.originalname);
    }
});
var upload_config = multer({storage:storage});


// LOGIN

app.get('/',function(req,res){
    var msg = "";
    if(req.session.msg!=""){
         msg=req.session.msg;
         req.session.msg="";
    }
    
    res.render('login',{msg:msg});

});


app.post('/login_submit',function(req,res){
    const {email,pass} = req.body;
    var sql='';
    if(isNaN(email))
        sql="select * from User where email = '"+email+"' and password = '"+pass+"'and status = 1 and softdelete = 0";
    else   
        sql="select * from User where mobile = '"+email+"' and password = '"+pass+"'and status = 1 and softdelete = 0";
    
    db.query(sql,function(err,result,fields){
        if(err)
            throw err;
        if(result.length==0)
            res.render('login',{msg:"bad credentials"});
        else{
            req.session.userid=result[0].uid;
            req.session.un = result[0].fname + "" + result[0].lname;  // you can change this to result[0].email if you want to tag with email instead of name
            res.redirect('/home');
        }
    });
});


// SIGN UP

app.get('/signup',(req,res)=>{
    
    res.render('signup',{msg:""});
});

app.post('/signup_submit',
upload_config.single("profilepic"),
(req,res)=>{
    const {fname,mname,lname,email,pass,cpass,dob,gender}=req.body;
    console.log(req.body);
    
    let sql_check = "";
    if(isNaN(email))
        sql_check = "select email from user where email='"+email+"'";
    else
        sql_check = "select mobile from user where mobile="+email;
    db.query(sql_check,function(err,result,fields){
        if(err)
            throw err;
        if(result.length==1)
        {
            let errmsg="";
            if(isNaN(email))
                errmsg="email id already exists";
            else
                errmsg = "mobile number already exists";
            res.render('signup',{errmsg:errmsg});
        }
        else
        {
            let curdate = new Date();
            let month = curdate.getMonth()+1
            let dor = curdate.getFullYear()+"-"+month+"-"+curdate.getDate();
            let sql = "";
            var filename = "";
            var mimetype = "";
            try {
                filename = req.file.filename;
                mimetype = req.file.mimetype;
            } catch (err) {
                // console.log(err);
            }

            if(isNaN(email))
                sql = "insert into user (fname,mname,lname,email,password,dob,dor,gender,profilepic) values(?,?,?,?,?,?,?,?,?)";
            else
                sql = "insert into user (fname,mname,lname,mobile,password,dob,dor,gender,profilepic) values(?,?,?,?,?,?,?,?,?)";

                db.query(sql,[fname,mname,lname,email,pass,dob,dor,gender,filename], function(err,result,fields){
                    if(err)
                        throw err;
                    if(result.insertId>0){
                        if(isNaN(email)){
                            sendVerifyEmail(email);
                        }
                        req.session.msg = "Your account is created, check email or mobile for verification code";
                        res.redirect('/');
                    }
                    else{
                        res.render('signup',{msg:"unable to register try again"});
                    }
                });
        }
    });
});


// VERFIY EMAIL

app.get('/verifyemail',function(req,res){
    let email = req.query['email'];
    let sql_update = "update user set status=1 where email=?";

    db.query(sql_update,[email],function(err,result){
        if(err)
            console.log(err);

        if(result.affectedRows==1){
            req.session.msg="email verfied kindly login";
            res.redirect('/');

        }
        else{
            req.session.msg = "can not verify your email id kindly contact admin of website";
            res.redirect('/');
        }
    });
});



// for HOME

app.get('/home',(req,res)=>{
    if(req.session.userid!=""){
        let msg = "";
        if(req.session.msg!="")
            msg=req.session.msg;

        let sql = "select * from tweet inner join user on user.uid=tweet.uid where tweet.uid=? or tweet.uid in (select follow_uid from user_following where uid=?) or tweet.content like '%"+req.session.un+"%'order by datetime desc";
        db.query(sql,[req.session.userid,req.session.userid],function(err,result){
            if(err)
                throw err;
            res.render("home",{data:"user tweet will be displayed",msg:msg,result:result});
        });
    }
    else{
        req.session.msg="first login to view the home page";
        res.redirect('/');
    }
});

//for logout

app.get('/logout',function(req,res){
    req.session.userid="";
    res.redirect('/');
})


// EDIT PROFILE

app.get('/edit_profile',function(req,res){
    db.query("select * from user where uid=?",[req.session.userid],function(err,result,fields){
        if(result.length==1)
        {
            res.render('edit_profile',{msg:"",result:result});
            
        }    else{
            req.session.msg="no data found";
            res.redirect('/');
        }
    });

});

app.post('/edit_profile_submit',
upload_config.single("profilepic"),
function(req,res){
    const {fname,mname,lname,about} = req.body;
    console.log(req.body);
    var filename = "";
    var mimetype = "";
    try {
        filename = req.file.filename;
        mimetype = req.file.mimetype;
    } catch (err) {
        // console.log(err);
    }
    let sqlupdate = "update user set fname=?,mname=?,lname=?,about=?,profilepic=? where uid=?";
    db.query(sqlupdate,[fname,mname,lname,about,filename,req.session.userid],function(err,result){
        if(err)
            throw err;
        if(result.affectedRows==1){
            req.session.msg="profile details updated";
            res.redirect("/home");
        }
        else{
            req.session.msg="can not update profile details";
        }
    });
});


// FOR FOLLOWERS

app.get('/followers',function(req,res){
    let sql = "select * from user where uid in (select uid from user_following where follow_uid=?)";
    db.query(sql,[req.session.userid],function(err,result){
        res.render('followers',{result:result});
    });
});


// FOR FOLLOWING

app.get('/following',function(req,res){
    let sql = "select * from user where uid in (select follow_uid from user_following where uid=?)";
    db.query(sql,[req.session.userid],function(err,result){
        if(err)
            throw err;
        res.render('following',{result:result});
    });
});
//fot edit
app.get('/editpasswd',(req,res)=>{
    let pass= req.session.passinfo;
    res.render('changepwsd.ejs',{msg:pass})
})

app.post('/editpwsd_submit',(req,res)=>{
    const {old_pass,new_pass}= req.body;

    let sql = "select * from user where password=?";

    db.query(sql,[old_pass],(err,result)=>{
        if(err) throw err;
        if(result.length > 0){
            let update_sql = "update user set password = ? where uid =?"
            db.query(update_sql,[new_pass,req.session.userid],(err,result)=>{
                if(err) throw err;
               
                req.session.msg = "password change";
                res.redirect('/home');
            })
        }else{
            req.session.passinfo = "your pass is wrong";
            
            res.redirect('/editpasswd')
        }
    })

})


// TWEET SUBMIT


app.post("/tweet_submit",upload_config.single("tweet_img"),function(req,res){
    const {content} = req.body;
    // console.log(content);
    // console.log(req.file);
    // console.log(req.file.mimetype);
    // console.log(req.file.filename);
    var filename = "";
    var mimetype = "";
    try{
        filename = req.file.filename;
        mimetype = req.file.mimetype;
    }
    catch(err){
        console.log(err);
    }

    
    let curdate = new Date();
    let month = curdate.getMonth()+1;
    let cdt = curdate.getFullYear()+"-"+month+"-"+curdate.getDate()+" "+curdate.getHours()+":"+curdate.getMinutes()+":"+curdate.getSeconds();

    let sql = "insert into tweet (uid,content,datetime,image_vdo_name,type) values (?,?,?,?,?);"
    db.query(sql,[req.session.userid,content,cdt,filename,mimetype],function(err,result){
        if(err)throw err;
        if(result.insertId>0)
            req.session.msg="tweet done";
        else{
            req.session.msg="can not tweet";
        }
        res.redirect('/home');
    });
});




app.listen(8080,()=>{console.log("server running at localhost port no 8080")});