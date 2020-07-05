'use strict'

//Import config options for develop
const config = require('./src/config/default.json'),
      bodyParser = require("body-parser"),
      express = require("express"),
      Simulator =require('./src/lib/ISSimulator'),
      spawn = require('child_process').spawn,
      cors = require('cors'),
      simulator = new Simulator(),
      su = require('service_log'),
      logger = new su(process.pid, 'air-data-simulator');

//Import msg module
global.app = express();
app.use(cors());
global.router = express.Router();
global.path = __dirname;
app.use(bodyParser.json()); // support json encoded bodies
app.use("/", router);



// 설명 참고 https://m.blog.naver.com/PostView.nhn?blogId=termy826&logNo=20208750146&proxyReferer=https%3A%2F%2Fwww.google.com%2F


//Server runner
app.listen(config.webServicePort, function () {
    logger.start();
    console.log(`server running on ${config.webServicePort}`);
    setInterval(monitor, 360000);
});

require('./src/routes/router');

const childPool = [];

function monitor() {
    console.log(`${childPool.length}개의 시뮬레이터 동작중`);
}
let make_simulator = (simulator_wmac, cb) => {
    let ps = spawn('node', [`./Server/src/daemon/runner.js`, simulator_wmac]);
    console.log(`프로세스 실행`);
      ps.stderr.on('data', (data)=> {
        console.log(data);
      })
    ps.stdout.on('data', (data) => {
        data = '' + data;
        console.log(data);
        if(data.indexOf('ssn,') === 0) {
            let ssn = data.split(',');
            let not_xist_simulator = true;
            ssn[2] = Number(ssn[2].substring('\n'));
            childPool.find((simulator)=> {
                if(simulator.simulator_wmac === ssn[1]) {
                    simulator.simulator_ssn = ssn[2];
                    not_xist_simulator = false;
                    return;
                }
            });
            if(not_xist_simulator) {
                childPool.push({
                    simulator_wmac: simulator_wmac,
                    simulator_ssn: 0,
                    simulator_cid: 0,
                    simulator: ps
                });
            }
        } 
        if (data.indexOf('cid,') === 0) {
            let cid = data.split(',');
            cid[2] = Number(cid[2].substring('\n'));
            childPool.find((simulator)=> {
                if(simulator.simulator_wmac === cid[1]) {
                    simulator.simulator_cid = cid[2];
                    return;
                } 
            });
            cb(true);
        }
        if (data.indexOf('err,') === 0) {
            let arrMac = data.split(',');
            let wmac = arrMac[1].substring('/n',12);
            let idx = -1;
            childPool.map((simulator ,index)=> {
                    if (simulator.simulator_wmac === wmac) {
                        idx = index;
                    }
                })    
            childPool.splice(idx, 1);
            cb(false);
        }
    });
    ps.stderr.setEncoding('utf8');
    ps.stderr.on('data', function (data) {
      if (/^execvp\(\)/.test(data)) {
        console.log('Failed to start child process.');
      }
    });
}

let kill_simulator = (simulator_wmac, cb) => {
    // let idx = -1;
    // childPool.some((obj_simulator, index) => {
    //     if(obj_simulator.simulator_wmac === simulator_wmac) {
    //         simulator.run_dynamic_connection_deletion(obj_simulator.simulator_cid, (result)=> {
    //             if(result === true) {
    //                 idx =index;
    //                 obj_simulator.simulator.kill('SIGUSR2');
    //                 childPool.splice(idx, 1);
    //                 cb(obj_simulator.simulator_wmac == simulator_wmac);
    //             } else {
    //                 cb(false);
    //             }
    //         });
    //     }
    // });
    for (let i = 0, len = childPool.length; i < len; i++) {
        if(childPool[i].simulator_wmac === simulator_wmac) {
            let obj_simulator = childPool[i];
             simulator.run_dynamic_connection_deletion(obj_simulator.simulator_cid, (result)=> {
                if(result.payload.resultCode === 0) {
                    console.log("dcd success.");
                    childPool.splice(i, 1);
                    obj_simulator.simulator.kill('SIGUSR2');
                    cb(true);
                } else {
                    console.log("dcd failed.");
                    cb(false);
                }
            });
        }
    }
}

router.post('/s_simulator_control', (req, res) => {
    let simulator_wmac;
    switch(req.body.operation) {
        case 'run':
            simulator_wmac = req.body.simulator_wmac;
            console.log(`${req.body.simulator_wmac}: 시뮬레이터 셍성`);
            make_simulator(req.body.simulator_wmac, (result)=> {
                console.log(`${childPool.length}개의 시뮬레이터 동작중`);
                res.send({
                    res_code: 0
                });
            });
            break;
        case 'kill':
            kill_simulator(req.body.simulator_wmac, (result)=> {
                if(result) {
                    console.log(`시뮬레이터 중지`);
                    console.log(`${childPool.length}개의 시뮬레이터 동작중`);
                    console.log(`${req.body.simulator_wmac} was killed.`)
                    res.send({
                        res_code: 0
                    });
                } else {
                    console.log(`${childPool.length}개의 시뮬레이터 동작중`);
                    console.log(`${req.body.simulator_wmac} doesn't exist.`)
                    res.send({
                        res_code: 1
                    });
                }
            });
            break;
    }
});

process.on('SIGINT', function(){
    console.log('simulator killed.');
    
    process.exit();
});