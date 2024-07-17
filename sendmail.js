const nodemailer=require('nodemailer');
async function sendVerifyEmail(to_email){
const transport=nodemailer.createTransport({
    service:"gmail",
    host:"smtp.gmail.com",
    port:465,
    secure:false,
    auth:{
        user:"bhavikabhateja5@gmail.com",
        pass:"nkwbrymwefyqcsww"
    }
});
var info = await transport.sendMail({
    to: to_email,
    from: "bhavikabhateja5@gmail.com",
    subject: "please verify email",
    html: "<h1 style=\"color:red;background-color:yellow;\">click on link to verify email</h1><a href=\"http://localhost:8080/verifyemail?email=" + to_email + "\">click to verify</a>"
});
}
// console.log(info);
module.exports=sendVerifyEmail;