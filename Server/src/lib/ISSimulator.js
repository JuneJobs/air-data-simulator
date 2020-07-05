'use strict'

const request = require('request');
const config = require('../config/default.json');

class ISSimulator {
    constructor() {
        this.wmac = '';
        this.cid = '';
        this.air_api_url = config.api_airoundu;
        this.simulator_url = config.api_simulator;
    }
    /**
     * @title function conn
     * @description Make the connection with air server.
     * @parameter req_url: request url, 
     *            req_resource: request resource, 
     *            packedMsg: packed message
     * @returns Callback body of communication result.
    */
    conn = (req_url, req_resource, packedMsg, cb) => {
        let connOpts = {
            method: 'POST',
            url: req_url + req_resource,
            headers: {
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json'
            },
            body: packedMsg,
            json: true
        };
        request(connOpts, function (error, response, body) {
            if (error) {
                console.error(`Server connection loss by ${JSON.stringify(packedMsg)}`);
            } else {
                cb(body);
            }
        });
    }
    /**
     * @title function get_generated_data
     * @description Make the connection with air server.
     * @parameter null
     * @returns Generated data in 0 to 100.
    */
    get_generated_data = () => {
        return Math.round(Math.random()*100);
    }
    /**
     * @title function realtime_air_data_transfer
     * @description Generate tuples and run the realtime air quality data transfer
     * @parameter null
     * @returns null 
    */
    realtime_air_data_transfer = (cid) => {
        this.get_generated_tuples((tuples)=>{
            this.run_realtime_airquality_data_transfer(cid, tuples);
        });
    }
    /**
     * @title function get_gps
     * @description Get GPS using wmac witch was made when ASR procedure.
     * @parameter wmac: WiFi MAC Address.
     * @returns Callback with GPS information. 
    */
    get_gps = (wmac, cb) => {
        let packedMsg = {
            "queryType": "GET",
            "wmac": wmac
        };
        this.conn(this.simulator_url, '', packedMsg, (response) => {
            cb(response.gps);
        })
    }

    /**
     * @title function get_generated_tuples
     * @description Get generated air data tuples with GPS.
     * @parameter null
     * @returns Array of air data tuples
    */
    get_generated_tuples = (cb) => {
        let timestamp = Math.round(new Date().getTime()/1000);
        this.get_gps(this.wmac, (gps) => {
            let arrGps = gps.split(','),
                lat = Number(arrGps[0]),
                lng = Number(arrGps[1]),
                tuples = [[
                    timestamp-10, 
                    this.get_generated_data(), // Temperature
                    this.get_generated_data(), // CO
                    this.get_generated_data(), // 03
                    this.get_generated_data(), // NO2
                    this.get_generated_data(), // SO2
                    this.get_generated_data(), // PM2.5
                    this.get_generated_data(), // PM10
                    this.get_generated_data(), // CO AQI
                    this.get_generated_data(), // 03 AQI
                    this.get_generated_data(), // NO2 AQI
                    this.get_generated_data(), // SO2 AQI
                    this.get_generated_data(), // PM2.5 AQI
                    this.get_generated_data(), // PM10 AQI
                    1, 
                    lat, 
                    lng
                ], [
                    timestamp, 
                    this.get_generated_data(), // Temperature
                    this.get_generated_data(), // CO
                    this.get_generated_data(), // 03
                    this.get_generated_data(), // NO2
                    this.get_generated_data(), // SO2
                    this.get_generated_data(), // PM2.5
                    this.get_generated_data(), // PM10
                    this.get_generated_data(), // CO AQI
                    this.get_generated_data(), // 03 AQI
                    this.get_generated_data(), // NO2 AQI
                    this.get_generated_data(), // SO2 AQI
                    this.get_generated_data(), // PM2.5 AQI
                    this.get_generated_data(), // PM10 AQI
                    0
                ]];

            cb(tuples);
        });
    }

    /**
     * @title function run_sensor_identifier_request
     * @description Call the SSP: SIR-REQ
     * @parameter wmac: WiFi MAC Address
     * @returns response (SSP: SIR-RSP)
    */
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
        this.conn(this.air_api_url, '', params, (result) => {
            cb(result);
        })
    };

    /**
     * @title function run_dynamic_connection_addition
     * @description Call the SSP: DCA-REQ
     * @parameter ssn: Sensor Serial Number
     * @returns response (SSP: DCA-RSP)
    */
    run_dynamic_connection_addition = (ssn, cb) => {
        this.get_gps(this.wmac, (gps) => {
            if(gps !== undefined) {
                let arrGps = gps.split(','),
                lat = Number(arrGps[0]),
                lng = Number(arrGps[1]),
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
                this.conn(this.air_api_url, '', params, (result) => {
                    cb(result);
                }); 
            } else {
                cb(false);
            }
                 
        }); 
    };
    /**
     * @title function run_dynamic_connection_deletion
     * @description Call the SSP: DCD-NOT
     * @parameter cid: Connection ID
     * @returns response (SSP: DCD-ACK)
    */
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
        this.conn(this.air_api_url, '', params, (result) => {
            cb(result);
        });
    };
    /**
     * @title function run_realtime_airquality_data_transfer
     * @description Call the SSP: RAD-TRN
     * @parameter data_tuples: Generated air data tuples
     * @returns response (SSP: RAD-ACK)
    */
    run_realtime_airquality_data_transfer = (cid, data_tuples) => {
        let params = {
            "header": {
                "msgType": 7,
                "msgLen": 0,
                "endpointId": cid
            },
            "payload": {
                "listEncodingType": 1,
                "listEncodingValue": {
                    "dataTupleType": 1,
                    "dataTupleValue":data_tuples
                } 
            }
        }
        this.conn(this.air_api_url, '', params, (result) => {
            let data = result;
            console.log('Transfer successed');
        });
    }
}
module.exports = ISSimulator;