'use strict'
const request = require('request'),
      requestURL = 'http://somnium.me:8001',
      //requestURL = 'http://localhost:8001',
      fs = require('fs');
// function intervalFunc() {
//     console.log(`simulator runing, ${process.argv[2]}`);
// }

// setInterval(intervalFunc, 1500);
let pm25_aqi_calculator = (pm25_temp) => {
    let aqi_pm25 = 0,
        checkpoint = [
            [0.0, 12, 0, 50],
            [12.1, 35.4, 51, 100],
            [35.5, 55.4, 101, 150],
            [55.5, 150.4, 151, 200],
            [150.5, 250.4, 201, 300],
            [350.5, 500.4, 401, 500]
        ];
    if(pm25_temp > 500.4) {
        return aqi_pm25
    } else {
        checkpoint.map((tuple)=> {
            if(tuple[0] <= pm25_temp && pm25_temp <= tuple[1]){
                let Clow25 = tuple[0],
                    Chigh25 = tuple[1],
                    Ilow25 = tuple[2],
                    Ihigh25 = tuple[3];
                aqi_pm25 = Math.round((((Ihigh25 - Ilow25) / (Chigh25 - Clow25)) * (pm25_temp - Clow25)) + Ilow25);
            }
        });
        return aqi_pm25
    }
}
let pm10_aqi_calculator = (pm10_temp) => {
    let aqi_pm10 = 0,
        checkpoint = [
            [0.0, 54, 0, 50],
            [55, 154, 51, 100],
            [155, 254, 101, 150],
            [255, 354, 151, 200],
            [355, 424, 201, 300],
            [425, 504, 401, 500]
        ];
    if(pm10_temp > 504) {
        return aqi_pm10
    } else {
        checkpoint.map((tuple)=> {
            if(tuple[0] <= pm10_temp && pm10_temp <= tuple[1]){
                let Clow10 = tuple[0],
                    Chigh10 = tuple[1],
                    Ilow10 = tuple[2],
                    Ihigh10 = tuple[3];
                aqi_pm10 = Math.round((((Ihigh10 - Ilow10) / (Chigh10 - Clow10)) * (pm10_temp - Clow10)) + Ilow10);
            }
        });
        return aqi_pm10
    }
}
class Simulator {
    constructor() {
        this.wmac = '';
        this.cid = '';
        this.pm25_aqi_table = [];
        this.pm10_aqi_table = [];
    }
    conn = (ls, packedMsg, cb) => {
        let options = {
            method: 'POST',
            url: requestURL + ls,
            headers: {
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json'
            },
            body: packedMsg,
            json: true
        };
        request(options, function (error, response, body) {
            if (error) {
                console.error(`Server connection loss by ${JSON.stringify(packedMsg)}`);
            } else {
                cb(body);
            }
        });
    }
    get_generated_data = () => {
        return Math.round(Math.random()*100);
    }
    data_transfer = () => {
        this.get_generated_tuples((tuples)=>{
            this.run_realtime_airquality_data_transfer(tuples);
        });
    }
    get_gps = (wmac, cb) => {
        let params = {
            "queryType": "GET",
            "wmac": wmac
        };
        this.conn('/simulator', params, (result) => {
            cb(result.gps);
        })
    }
   
    get_generated_tuples = (cb, parents) => {
        let timestamp = Math.round(new Date().getTime()/1000);
        
        let lat = Number(128.679356),
            lng = Number(35.835524),
            pm25 = 0, 
            pm10 = 0;

            fs.readFile('data.txt', 'utf8', function(error, data) {
                let air_data = JSON.parse(data);
                pm25 = air_data.pm25;
                pm10 = air_data.pm10;
                let tuples = [
                    [timestamp-2, 0, 0, 0, 0, 0, pm25, pm10, 0, 0, 0, 0, pm25_aqi_calculator(pm25), pm10_aqi_calculator(pm10), 1, lng, lat],
                    [timestamp-1, 0, 0, 0, 0, 0, pm25, pm10, 0, 0, 0, 0, pm25_aqi_calculator(pm25), pm10_aqi_calculator(pm10), 0],
                    [timestamp-0, 0, 0, 0, 0, 0, pm25, pm10, 0, 0, 0, 0, pm25_aqi_calculator(pm25), pm10_aqi_calculator(pm10), 0],
                ];
                cb(tuples);
            });
    }
    run_sensor_identifier_request = (wmac, cb) => {
        let params = {
            "header": {
                "msgType": 1,
                "msgLen": 0,
                "endpointId":2
            },
            "payload": {
                "wmac": wmac
            }
        };
        this.conn('/s_api_v1_0', params, (result) => {
            cb(result);
        })
    };
    run_dynamic_connection_addition = (ssn, cb) => {
        
        let lat = Number(128.679356),
            lng = Number(35.835524),
            params = {
                "header": {
                    "msgType": 3,
                    "msgLen": 0,
                    "endpointId":ssn
                },
                "payload": {
                    "lat": lat,
                    "lng": lng
                }
            }     
            this.conn('/s_api_v1_0', params, (result) => {
                cb(result);
            });      
    };
    run_dynamic_connection_deletion = (cid, cb) => {
        let params = {
            "header": {
                "msgType": 5,
                "msgLen": 0,
                "endpointId":cid
            },
            "payload": {
            }
        }
        this.conn('/s_api_v1_0', params, (result) => {
            cb(result);
            
        });
    };
    run_dataGenerator = () => {

    }
    run_realtime_airquality_data_transfer = (data_tuples) => {
        let params = {
            "header": {
                "msgType": 7,
                "msgLen": 0,
                "endpointId": this.cid
            },
            "payload": {
                "listEncodingType": 1,
                "listEncodingValue": {
                    "dataTupleType": 1,
                    "dataTupleValue":data_tuples
                } 
            }
        }
        this.conn('/s_api_v1_0', params, (result) => {
            let data = result;
            console.log('Transfer successed');
        });
    }
}
module.exports = Simulator;
