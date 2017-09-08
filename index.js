//=========================================================
// Bot Setup
//=========================================================
var restify = require('restify');
var builder = require('botbuilder');
var mysql = require('mysql');

// Setup MySQL Connection
var con = mysql.createConnection({
  host: "118.42.88.117",
  user: "root",
  password: "qwer1234",
  database: "dormtakki_state"
});
con.connect(function(err) {
  if (err) throw err;
  console.log("Connected to mySQL!");
});

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: a0d6568aa28c4eff9d203fadc2171c65,
    appPassword: F9Wt1Hyg1DoOkFQL2grexUS
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());


//=========================================================
// Root Dialog
//=========================================================
bot.dialog('/', [
    function (session) {
        //Get user info
        session.beginDialog('/ensureProfile', session.userData.profile);
    },
    function (session, results) {
        //We've gotten the user's information and can now give a response based on that data
        session.userData.profile = results.response;
        session.send('안녕하세요 %(name)s님!', session.userData.profile);
        builder.Prompts.choice(session, '무엇을 도와드릴까요?\n(현재는 3동에서만 사용 가능합니다.)', '조회|사용량|사용자 정보 초기화', 
                                            {listStyle: builder.ListStyle.button, retryPrompt:'선택지에서 다시 골라주세요!'});
        session.endDialog();
    }
]);


//=========================================================
// Search for Dormitory WM Usage
//=========================================================
bot.dialog('/dormUsage', 
    function (session, args, next) {
        session.send('데이터를 모으는 중입니다. 죄송합니다.');
        session.endDialog();
    })
    .triggerAction({
        matches: /^사용량$/i,
        onSelectAction: (session, args, next) => {
        session.beginDialog(args.action, args);
    }
    }
);


//=========================================================
// Search for Dormitory WM State
//=========================================================
bot.dialog('/dormState', 
    function (session, args, next) {
       con.query("SELECT * FROM DORM3_1", function (err, result) {
            if (err) throw err;
            console.log(result.length);
            var WM = 0, DR = 0;
            for(var i = 0; i < result.length; i++){
                if(result[i].state == 'off' && i < 4) WM++;
                if(result[i].state == 'off' && i >= 4) DR++;
            }
            session.send('현재 %s동 1층 세탁실에는 세탁기 %s대, 건조기 %s대가 비어있습니다.', session.userData.profile.dorm, WM, DR);
        });
        con.query("SELECT * FROM DORM3_3", function (err, result) {
            if (err) throw err;
            console.log(result.length);
            var WM=0, DR=0;
            for(var i = 0; i < result.length; i++){
                if(result[i].state == 'off' && i < 4) WM++;
                if(result[i].state == 'off' && i >= 4) DR++;
            }
            session.send('3층 세탁실에는 세탁기 %s대, 건조기 %s대가 비어있습니다.', WM, DR);
        });
        session.endDialog();
    })
    .triggerAction({
        matches: /^조회$|^검색$/i,
        onSelectAction: (session, args, next) => {
        session.beginDialog(args.action, args);
        }
    }
);


//=========================================================
// Erase User Data
//=========================================================
bot.dialog('/remove_info', 
    function (session, args, next) {
        session.userData = {}; 
        session.privateConversationData = {};
        session.conversationData = {};
        session.dialogData = {};
        session.endDialog("저장되었던 정보가 삭제되었습니다.");
    })
    .triggerAction({
        matches: /^초기화$|^재설정$/i,
        onSelectAction: (session, args, next) => {
        session.beginDialog(args.action, args);
        }
    }
);


//=========================================================
// get User Data
//=========================================================
bot.dialog('/ensureProfile', [
    function (session, args, next) {
        session.userData.profile = args || {};
        //Checks whether or not we already have the user's name
        if (!session.userData.profile.name) {
            builder.Prompts.text(session, "이름이 무엇인가요?");
        } else {
            next();
        }
    },
    function (session, results, next) {
        if (results.response) {
            session.userData.profile.name = results.response;
        }
        //Checks whether or not we already have the user's dorm
        if (!session.userData.profile.id) {
            builder.Prompts.text(session, "학번을 알려주세요.");
        } else {
            next();
        }
    },
    function (session, results, next) {
        if (results.response && results.response.length == 9) {
            session.userData.profile.id = results.response;
        }else if (!session.userData.profile.id) {
            session.cancelDialog('/ensureProfile', '/');
        }
        //Checks whether or not we already have the user's dorm
        if (!session.userData.profile.dorm) {
            builder.Prompts.number(session, "몇 동에 거주 중인가요?");
        } else {
            next();
        }
    },
    function (session, results) {
        if (results.response && results.response > 0 && results.response < 14) {
            session.userData.profile.dorm = results.response;
        }else  if (!session.userData.profile.dorm){
            session.cancelDialog('/ensureProfile', '/');
        }
        //We now have the user's info (name, id, dorm), so we end this dialog
        session.endDialogWithResult({ response: session.userData.profile });
    }
]);
