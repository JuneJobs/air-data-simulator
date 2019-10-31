'use strict';

//Import request manager module
const LlRequest = require("../lib/ISRequest");

const Redis = require("ioredis");
//let redis = new Redis(63791, "dev.somnium.me");
let redisCli = new Redis(6379, "13.125.132.98");
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
