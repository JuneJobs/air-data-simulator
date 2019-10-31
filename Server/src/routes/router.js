'use strict';

//Import request manager module
const LlRequest = require("../lib/ISRequest"),
      config = require('../../config/default.json'), 
      Redis = require("ioredis"),
      redisCli = new Redis(config.redisPort, config.redisUrl); //Air Redis Node 연결

let resCode = {
    SUCCESS: 0,
    ERROR: 1,
    DUPLICATION: 2,
    USING: 3,
    NOT_EXIST: 4
}
let response = {
    resCode : '',
    payload : []
}

router.post("/searchKeyList", (req, res) => {
    let params = req.body;

    if (params.queryType !== 'GET') return;
    let resJson = [];
    redisCli.scan(0, 'MATCH', params.psKey, 'COUNT', 10000, (err, result) => {
        if (err) {
            return console.log(err);
        } else {
            result[1].map((item) => {
                resJson.push({
                    'value': item
                });
            });
            response.resCode = resCode.SUCCESS;
            response.payload = resJson;
            res.send(response);
        }
    });
});


router.post("/simulator", (req,res) => {
        params = req.body;
    //wmac gps 매핑 
    let wmac = params.wmac,
        key = `sim:gps:info:${wmac}`,
        gps = params.gps,
        response = {};
    switch (params.queryType) {
        case 'POST':
            redisCli.set(key, gps);
            response.resCode = 0;
            res.send(response);
            break;
        case 'GET':
            redisCli.get(key).then((result)=>{
                if(result === null) {
                    response.resCode = 1;
                } else {
                    response.resCode = 0;
                    response.gps = result;
                }
                res.send(response);
            })
            break;
        case 'DELETE':
            redisCli.del(key);
            response.resCode = 0;
            res.send(response);
            break;
    }
});