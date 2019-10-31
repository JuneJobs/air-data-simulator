'use strict'
const SSimulator =require('./src/lib/ISSimulator'),
      simulator = new ISSimulator();


let cid = -1;
let timer = {};
let wmac = '';

let runner = () => {
    //get ssn
    wmac = process.argv[2];
    //set wmac
    simulator.wmac = wmac;
    simulator.run_sensor_identifier_request(wmac, (result)=> {
        if(result.payload.resultCode === 0) {        
            console.log(`ssn,${process.argv[2]},${result.payload.ssn}`);
            //connectionID 발급
            let ssn = result.payload.ssn;
            simulator.run_dynamic_connection_addition(ssn, (result)=> {
                console.log(`cid,${process.argv[2]},${result.payload.cid}`);
                if(result.payload.resultCode === 0) {
                    cid = result.payload.cid;
                    simulator.cid = cid;
                    timer = setInterval(simulator.realtime_air_data_transfer, 3000);
                }
            });
        } else {
            console.log(`err,${process.argv[2]}`);
        }
    });
}

runner();
process.on('SIGUSR2', function(){
    clearInterval(timer);
});