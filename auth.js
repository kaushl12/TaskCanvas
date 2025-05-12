
require('dotenv').config();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;


function auth(req, res, next) {
  try{
    const token = req.headers.token;
      if(!token){
        return res.status(401).json({message :"Token missing"})
      }
      const verifiedData=jwt.verify(token,JWT_SECRET);
      req.userId=verifiedData.userId;
      next()
  }catch(err){
    res.status(403).json({
      message :"Invalid or expried token"
    })
  }
  
}
module.exports=auth;