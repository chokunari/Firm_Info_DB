const express = require('express');
const router = express.Router();
const pg = require('pg');
const { check, validationResult } = require('express-validator');
const http = require('https');
require('date-utils');

//ログ出力モジュール
const log4js = require('log4js');
log4js.configure({
  appenders: {
    accessLog: { type: 'file', filename: 'access.log' },
    editLog: { type: 'file', filename: 'edit.log' }
  },
  categories: {
    default: { appenders: [ 'accessLog' ], level: 'info' },
    editLog: { appenders: [ 'editLog' ], level: 'info' }
  }
});
//アクセスログ取得用設定。
let accessLogger = log4js.getLogger();
accessLogger.level = 'debug';
//企業情報編集ログ取得用設定。
let editLogger = log4js.getLogger('editLog');
editLogger.level = 'debug';

//PostgreSQL用設定。
const pg_config = {
    user: 'postgres',
    host: '172.20.0.2',
    database: 'firmlist_db',
    password: 'postgres',
    port: 5432,
  };

//SQL用変数
let query;

/* GET login page. */
router.get('/login', (req, res, next)=>{
  let title='Firm_Info_DB Login Page';
  let msg = '';
  let data = {
    title:title,
    msg:msg
  }
  res.render('Firm_Info_DB/login', data);
});

/* POST login page. */
router.post('/login',(req,res,next)=>{
  let UserID = req.body.UserID;
  let password = req.body.password;

  //userlist_dbに接続するための準備。
  let pg_client = new pg.Client(pg_config);
  pg_client.connect();
  query = "select * from userlist where userid=$1 AND password=$2;";

  pg_client.query(query,[UserID,password])
  .then(results =>{
      let userlistResult = [];
      for(var i=0; i<results.rows.length; i++){
          console.log(results.rows[i]);
          userlistResult.push(results.rows[i]);
      }
      if(userlistResult[0]){
        req.session.UserID = req.body['UserID'];
        let now = new Date();
        now.setTime(now.getTime() + 1000*60*60*9);
        req.session.LoginTime = now.toFormat('YYYY/MM/DD HH24:MI:SS');
        accessLogger.info(UserID + 'がログインしました。');
        res.redirect('/Firm_Info_DB/top');
        pg_client.end();
      }else{
        let title = 'Firm_Info_DB Login Page';
        let msg = 'Oh...You are not in DB!'
        let data = {
          title:title,
          msg:msg
        }
        accessLogger.info(UserID + 'がログインに失敗しました。');
        res.render('Firm_Info_DB/login', data)
      }
  })
  .catch(e => {
      console.error(e.stack)
      pg_client.end();
  });
});

router.get('/top', (req, res, next)=>{
  let pg_client = new pg.Client(pg_config);
  pg_client.connect();
  query = "select * from firmlist where done=0;";

  pg_client.query(query)
  .then(results =>{
      let firmlistResult = [];
      for(var i=0; i<results.rows.length; i++){
          console.log(results.rows[i]);
          firmlistResult.push(results.rows[i]);
      }
      let msg = 'Welcome to Firm_Info_DB!';
      let title = 'Firm_Info_DB Top Page';
      let data = {
        title:title,
        msg:msg,
        UserID:req.session.UserID,
        LoginTime:req.session.LoginTime,
        content:firmlistResult
      }        
      res.render('Firm_Info_DB/top', data);    
      pg_client.end();
  })
  .catch(e => {
      console.error(e.stack)
      pg_client.end();
  });
});

router.post('/top',(req,res,next)=>{
  req.session.firm_id = req.body.firm_id;
  let now = new Date();
  now.setTime(now.getTime() + 1000*60*60*9);
  req.session.EditStart = now.toFormat('YYYY/MM/DD HH24:MI:SS'); 
  res.redirect('/Firm_Info_DB/research');
});

router.get('/research',(req,res,next)=>{
  let firm_id = req.session.firm_id;

  let pg_client = new pg.Client(pg_config);
  pg_client.connect();
  query = "select * from firmlist where firm_id=$1;";

  pg_client.query(query,[firm_id])
  .then(results =>{
      let firmlistResult = [];
      for(var i=0; i<results.rows.length; i++){
          console.log(results.rows[i]);
          firmlistResult.push(results.rows[i]);
          req.session.firmlistResult = firmlistResult;
      }
      let title = 'Firm_Info_DB Research Page';
      let data = {
        title:title,
        UserID:req.session.UserID,
        LoginTime:req.session.LoginTime,
        EditStart:req.session.EditStart,
        content:firmlistResult,
        required_item_error:"",
        ceo_name:'',
        settling_day:'',
        exective_name1:'',
        ir_url:'',
        ceo_face_pic_url:''
      }        
      res.render('Firm_Info_DB/research', data);    
      pg_client.end();
  })
  .catch(e => {
      console.error(e.stack)
      pg_client.end();
  });
});

router.post('/research'/* ,[
  check('ceo_name','現在の社長の名前が未入力です。').not().isEmpty(),
  check('settling_day','決算日（月／日）が未入力です。').not().isEmpty(),
  check('exective_name1','現在の役員の名前が未入力です。').not().isEmpty(),
  check('ir_url','IRページのURLが未入力です。').not().isEmpty(),
]*/,(req,res,next)=>{
  /* const errors = validationResult(req);
  if(!errors.isEmpty()){
    var re = '<ul class="error">';
    var errors_arr = errors.array();
    for(var n in errors_arr){
        re += '<li>' + errors_arr[n].msg + '</li>'
    }
    re += '</ul>';
    let title = 'Firm_Info_DB Research Page';
    let data = {
      title:title,
      UserID:req.session.UserID,
      LoginTime:req.session.LoginTime,
      EditStart:req.session.EditStart,
      content:req.session.firmlistResult,
      required_item_error:re,
      ceo_name:req.body.ceo_name,
      settling_day:req.body.settling_day,
      exective_name1:req.body.exective_name1,
      ir_url:req.body.ir_url,
      ceo_face_pic_url:req.body.ceo_face_pic_url,
      exective_name2:req.body.exective_name2,
            /*exective_name3:'',
            exective_name4:'',
            exective_name5:'',
            exective_name6:'',
            exective_name7:'',
            exective_name8:'',
            exective_name8:'',
            exective_name9:'',
            exective_name10:'',
            exective_name11:'',
            exective_name12:'',
            exective_name13:'',
            exective_name14:'',
            exective_name15:''
    }        
    res.render('Firm_Info_DB/research', data);    
}else{
  */
  let firm_id = req.body.firm_id;
  let site_status = req.body.site_status;
  let ceo_name = req.body.ceo_name;
  let settling_day = req.body.settling_day;
  let exective_name1 = req.body.exective_name1;
  let exective_name2 = req.body.exective_name2;
  let exective_name3 = req.body.exective_name3;
  let exective_name4 = req.body.exective_name4;
  let exective_name5 = req.body.exective_name5;
  let exective_name6 = req.body.exective_name6;
  let exective_name7 = req.body.exective_name7;
  let exective_name8 = req.body.exective_name8;
  let exective_name9 = req.body.exective_name9;
  let exective_name10 = req.body.exective_name10;
  let exective_name11 = req.body.exective_name11;
  let exective_name12 = req.body.exective_name12;
  let exective_name13 = req.body.exective_name13;
  let exective_name14 = req.body.exective_name14;
  let exective_name15 = req.body.exective_name15;
  let ir_url = req.body.ir_url;
  let ceo_face_pic_url = req.body.ceo_face_pic_url;

  let pg_client = new pg.Client(pg_config);
  pg_client.connect();
  query = "update firmlist set site_status=$2,ceo_name=$3,\
          settling_day=$4,exective_name1=$5,ir_url=$6,\
          ceo_face_pic_url=$7,\
          exective_name2=$8,exective_name3=$9,exective_name4=$10,\
          exective_name5=$11,exective_name6=$12,exective_name7=$13,\
          exective_name8=$14,exective_name9=$15,exective_name10=$16,\
          exective_name11=$17,exective_name12=$18,exective_name13=$19,\
          exective_name14=$20,exective_name15=$21,\
          done=1 \
          where firm_id=$1;";

  pg_client.query(query,[
    firm_id,
    site_status,
    ceo_name,
    settling_day,
    exective_name1,
    ir_url,
    ceo_face_pic_url,
    exective_name2,
    exective_name3,
    exective_name4,
    exective_name5,
    exective_name6,
    exective_name7,
    exective_name8,
    exective_name9,
    exective_name10,
    exective_name11,
    exective_name12,
    exective_name13,
    exective_name14,
    exective_name15
  ])
  .then(results =>{
    let now = new Date();
    now.setTime(now.getTime() + 1000*60*60*9);
    req.session.EditEnd = now.toFormat('YYYY/MM/DD HH24:MI:SS'); 
    let editTime = (req.session.EditEnd - req.session.EditStart) / (1000 * 60);
    editLogger.info(req.session.UserID + 'が企業ID' + req.session.firm_id + 'を' +  editTime + 'で編集しました。');
    res.redirect('/Firm_Info_DB/top');
    pg_client.end();
  })
  .catch(e => {
      console.error(e.stack)
      pg_client.end();
  });
//}
});

module.exports = router;
